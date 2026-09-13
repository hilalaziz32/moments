import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "@moments/core/schedule";
import { formatPKR } from "@moments/core/money";
import { requireOrg, canManagePeople } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { loadForecast } from "@/lib/planning";
import { formatDate, formatDateTime } from "@/lib/format";
import { MomentRow, type MomentRowData } from "@/components/moments/moment-row";
import { DateMark } from "@/components/moments/date-mark";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const canEdit = canManagePeople(org.role);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(new Date());
  const in14 = addDays(today, 14);

  const [{ data: events }, { data: attention }, { data: orgRow }, { count: people }, { count: missingDates }, forecast] =
    await Promise.all([
      supabase
        .from("moment_events")
        .select("id, occurs_on, status, budget_paisa, milestone_years, employees(full_name, preferred_name, department), moment_types(label)")
        .eq("org_id", org.orgId)
        .gte("occurs_on", today)
        .lte("occurs_on", in14)
        .not("status", "in", "(cancelled,skipped)")
        .order("occurs_on", { ascending: true })
        .limit(50),
      supabase
        .from("moment_events")
        .select("status")
        .eq("org_id", org.orgId)
        .in("status", ["needs_info", "awaiting_approval", "failed"]),
      supabase.from("organizations").select("dry_run_until").eq("id", org.orgId).single(),
      supabase.from("employees").select("id", { count: "exact", head: true })
        .eq("org_id", org.orgId).is("deleted_at", null).neq("status", "exited"),
      supabase.from("employees").select("id", { count: "exact", head: true })
        .eq("org_id", org.orgId).is("deleted_at", null).neq("status", "exited")
        .or("date_of_birth.is.null,hire_date.is.null"),
      // What's coming after the next two weeks, straight from the roster, so the
      // page is never just an empty box.
      loadForecast(org.orgId, 120),
    ]);

  const moments: MomentRowData[] = (events ?? []).map((e) => {
    const emp = e.employees as unknown as { full_name: string; preferred_name: string | null; department: string | null } | null;
    const mt = e.moment_types as unknown as { label: string } | null;
    return {
      id: e.id,
      occursOn: e.occurs_on,
      employeeName: emp?.preferred_name || emp?.full_name || org.orgName,
      department: emp?.department ?? null,
      momentLabel: mt?.label ?? "Moment",
      milestoneYears: e.milestone_years,
      budgetPaisa: e.budget_paisa,
      status: e.status,
    };
  });

  const needsYou = (attention ?? []).length;
  const committed = moments.reduce((s, m) => s + m.budgetPaisa, 0);
  const later = (forecast?.plans ?? []).filter((p) => p.occursOn > in14).slice(0, 8);
  const next90 = (forecast?.plans ?? []).filter((p) => p.occursOn <= addDays(today, 90));
  const next90Paisa = next90.reduce((s, p) => s + p.budgetPaisa, 0);
  const dryRunUntil = orgRow?.dry_run_until && new Date(orgRow.dry_run_until) > new Date() ? orgRow.dry_run_until : null;

  const stats = [
    { label: "Next 14 days", value: String(moments.length), sub: `${formatPKR(committed)} committed` },
    { label: "Next 90 days", value: String(next90.length), sub: `${formatPKR(next90Paisa)} planned` },
    { label: "Needs you", value: String(needsYou), sub: needsYou ? "approvals or details" : "all clear", href: needsYou ? "/moments?filter=needs_you" : undefined },
    { label: "Team", value: String(people ?? 0), sub: missingDates ? `${missingDates} missing a date` : "all dates on file", href: "/employees" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">{org.orgName}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {moments.length
            ? "Everything below is already in motion. You only need to act on what's flagged."
            : "Nothing needs you right now."}
        </p>
      </div>

      {dryRunUntil && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-state-active/30 bg-state-active/5 px-5 py-3.5 text-sm">
          <span className="text-ink">
            <span className="font-medium">Dry run until {formatDateTime(dryRunUntil, org.timezone)}.</span>{" "}
            <span className="text-ink-muted">Texts go to your test phone only, marked [PREVIEW].</span>
          </span>
          {canEdit && (
            <Link href="/settings/messages" className="font-medium text-ink underline underline-offset-4">Message settings</Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <p className="text-xs text-ink-muted">{s.label}</p>
              <p data-numeric className="mt-1 text-2xl font-semibold tracking-tight text-ink">{s.value}</p>
              <p className="mt-0.5 truncate text-xs text-ink-faint">{s.sub}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="rounded-lg border border-rule bg-card px-4 py-3.5 transition-colors hover:bg-surface-sunk">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="rounded-lg border border-rule bg-card px-4 py-3.5">{body}</div>
          );
        })}
      </div>

      {needsYou > 0 && (
        <Link
          href="/moments?filter=needs_you"
          className="flex items-center justify-between gap-4 rounded-lg border border-state-waiting/40 bg-state-waiting/5 px-5 py-3.5 transition-colors hover:bg-state-waiting/10"
        >
          <span className="text-sm text-ink">
            <span className="font-medium">
              {needsYou} {needsYou === 1 ? "moment needs" : "moments need"} you
            </span>
            <span className="text-ink-muted"> — an approval, or a detail we couldn&rsquo;t confirm</span>
          </span>
          <span aria-hidden className="text-ink-muted">&rarr;</span>
        </Link>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink">Next 14 days</h2>
        {moments.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-rule-strong px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink">Nothing in the next two weeks.</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
              {(people ?? 0) === 0
                ? "Upload your team and their birthdays and work anniversaries will show up here."
                : "Moments appear here about six weeks ahead and start moving a week before the day."}
            </p>
            {(people ?? 0) === 0 && canEdit && (
              <Link href="/setup/import" className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4">
                Upload your team
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-rule bg-card">
            {moments.map((m) => <MomentRow key={m.id} moment={m} />)}
          </div>
        )}
      </section>

      {later.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink">Coming later</h2>
          <p className="mt-1 text-sm text-ink-muted">Already on the calendar. These start moving a week before the day.</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-rule bg-card">
            {later.map((p) => (
              <div key={`${p.employeeId}-${p.occurrenceKey}-${p.momentKey}`} className="flex items-center gap-5 border-b border-rule px-5 py-3 last:border-b-0">
                <DateMark iso={p.occursOn} size="sm" className="w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {p.employeeId ? forecast?.names.get(p.employeeId) ?? "Someone" : org.orgName}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {p.milestoneYears ? `${p.milestoneYears} year anniversary` : forecast?.labels.get(p.momentKey) ?? p.momentKey}
                    {" · "}{formatDate(p.occursOn)}
                  </p>
                </div>
                <span data-numeric className="shrink-0 text-sm text-ink-muted">{formatPKR(p.budgetPaisa)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
