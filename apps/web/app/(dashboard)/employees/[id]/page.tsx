import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays } from "@moments/core/schedule";
import { formatPhoneDisplay } from "@moments/core/csv";
import { canManagePeople, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/format";
import { MomentRow, type MomentRowData } from "@/components/moments/moment-row";
import { NewsForm } from "@/components/people/news-form";
import { LeavingForm } from "@/components/people/leaving-form";
import { clearLeaving, withdrawNews } from "@/app/actions/people";

export const metadata: Metadata = { title: "Person" };

const EXIT_REASON: Record<string, string> = {
  resigned: "resigned",
  retired: "retiring",
  end_of_contract: "end of contract",
  redundancy: "role made redundant",
  terminated_for_cause: "let go",
};

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg();
  const canEdit = canManagePeople(org.role);
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(new Date());

  const { data: emp } = await supabase
    .from("employees")
    .select("id, full_name, preferred_name, job_title, department, work_email, phone_e164, whatsapp_e164, date_of_birth, hire_date, exit_date, exit_reason, status, manager_id, celebration_opt_out")
    .eq("id", id)
    .eq("org_id", org.orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!emp) notFound();

  const [{ data: manager }, { data: news }, { data: moments }] = await Promise.all([
    emp.manager_id
      ? supabase.from("employees").select("id, full_name, preferred_name").eq("id", emp.manager_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("employee_events")
      .select("id, event_date, is_celebrated, details, created_at, moment_types(key, label)")
      .eq("employee_id", emp.id)
      .order("event_date", { ascending: false })
      .limit(20),
    supabase
      .from("moment_events")
      .select("id, occurs_on, status, budget_paisa, milestone_years, moment_types(label)")
      .eq("employee_id", emp.id)
      .gte("occurs_on", addDays(today, -7))
      .not("status", "in", "(cancelled,skipped)")
      .order("occurs_on")
      .limit(10),
  ]);

  const name = emp.preferred_name || emp.full_name;
  const first = name.split(" ")[0] ?? name;
  const phone = emp.phone_e164 || emp.whatsapp_e164;

  const upcoming: MomentRowData[] = (moments ?? []).map((m) => ({
    id: m.id,
    occursOn: m.occurs_on,
    employeeName: name,
    department: null,
    momentLabel: (m.moment_types as unknown as { label: string } | null)?.label ?? "Moment",
    milestoneYears: m.milestone_years,
    budgetPaisa: m.budget_paisa,
    status: m.status,
  }));

  const facts: [string, React.ReactNode][] = [
    ["Birthday", emp.date_of_birth ? formatDate(emp.date_of_birth) : <span className="text-state-waiting">missing</span>],
    ["Joined", emp.hire_date ? formatDate(emp.hire_date) : <span className="text-state-waiting">missing</span>],
    ["Manager", manager ? (
      <Link href={`/employees/${manager.id}`} className="underline underline-offset-4">
        {manager.preferred_name || manager.full_name}
      </Link>
    ) : "—"],
    ["Phone", phone ? formatPhoneDisplay(phone) : <span className="text-state-waiting">missing</span>],
    ["Email", emp.work_email ?? "—"],
  ];

  return (
    <div className="space-y-10">
      <div>
        <Link href="/employees" className="text-sm text-ink-muted hover:text-ink">← Team</Link>
        <h1 className="mt-3 text-xl font-semibold text-ink">{name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {[emp.job_title, emp.department].filter(Boolean).join(" · ") || "No title yet"}
        </p>
        {emp.celebration_opt_out && (
          <p className="mt-3 rounded-lg border border-rule bg-surface-sunk px-4 py-3 text-sm text-ink-muted">
            {first} asked not to be celebrated, so nothing is planned for them.
          </p>
        )}
        {!phone && !emp.work_email && (
          <p className="mt-3 rounded-lg border border-rule bg-surface-sunk px-4 py-3 text-sm text-ink-muted">
            We have no way to reach {first}. Add a phone number by re-importing the sheet.
          </p>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-5">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-ink-faint">{k}</dt>
              <dd className="mt-0.5 truncate text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-ink">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nothing in the next few weeks. Moments appear here about six weeks ahead.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-rule bg-card">
            {upcoming.map((m) => <MomentRow key={m.id} moment={m} />)}
          </div>
        )}
      </section>

      {canEdit && emp.status !== "exited" && (
        <section>
          <h2 className="text-sm font-semibold text-ink">Share news about {first}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Promotions, weddings and new babies aren&rsquo;t in anyone&rsquo;s spreadsheet. Tell us and we&rsquo;ll take it from here.
          </p>
          <div className="mt-4 rounded-lg border border-rule bg-card p-5">
            <NewsForm employeeId={emp.id} firstName={first} today={today} />
          </div>
        </section>
      )}

      {canEdit && (
        <section>
          <h2 className="text-sm font-semibold text-ink">Leaving</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {emp.exit_date
              ? `${first} ${emp.exit_date < today ? "left" : "is leaving"} on ${formatDate(emp.exit_date)}${emp.exit_reason ? ` (${EXIT_REASON[emp.exit_reason] ?? humanize(emp.exit_reason)})` : ""}.`
              : `Set ${first}'s last day and we'll plan a farewell for it.`}
          </p>
          <div className="mt-4 rounded-lg border border-rule bg-card p-5">
            <LeavingForm employeeId={emp.id} lastDay={emp.exit_date} reason={emp.exit_reason} />
            {emp.exit_date && (
              <form action={clearLeaving} className="mt-4 border-t border-rule pt-4">
                <input type="hidden" name="employeeId" value={emp.id} />
                <button type="submit" className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
                  {first} is staying after all
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {news && news.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink">News logged</h2>
          <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
            {news.map((n) => {
              const mt = n.moment_types as unknown as { key: string; label: string } | null;
              const details = (n.details ?? {}) as { newTitle?: string; note?: string };
              return (
                <div key={n.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-ink">{mt?.label ?? "News"}</span>
                    <span className="text-ink-muted">
                      {" "}· {formatDate(n.event_date)}
                      {details.newTitle && ` · ${details.newTitle}`}
                    </span>
                    {details.note && <p className="mt-0.5 text-xs text-ink-faint">{details.note}</p>}
                  </div>
                  {!n.is_celebrated ? (
                    <span className="text-xs text-ink-faint">Withdrawn</span>
                  ) : canEdit ? (
                    <form action={withdrawNews}>
                      <input type="hidden" name="eventId" value={n.id} />
                      <input type="hidden" name="employeeId" value={emp.id} />
                      <button type="submit" className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink">
                        Withdraw
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
