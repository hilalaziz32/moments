import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { MomentRow, type MomentRowData } from "@/components/moments/moment-row";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Moments" };

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "needs_you", label: "Needs you" },
  { key: "past", label: "Past" },
] as const;

const EMPTY: Record<string, { title: string; body: string }> = {
  upcoming: {
    title: "Nothing coming up yet.",
    body: "Moments appear here about six weeks ahead, once someone's birthday or work anniversary is close.",
  },
  needs_you: {
    title: "Nothing needs you.",
    body: "Approvals and details we couldn't confirm show up here.",
  },
  past: { title: "No past moments yet.", body: "Finished moments stay here as a record." },
};

export default async function MomentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const org = await requireOrg();
  const { filter: raw } = await searchParams;
  const filter = FILTERS.some((f) => f.key === raw) ? (raw as string) : "upcoming";
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  let query = supabase
    .from("moment_events")
    .select("id, occurs_on, status, budget_paisa, milestone_years, employees(full_name, preferred_name, department), moment_types(label)")
    .eq("org_id", org.orgId);

  if (filter === "needs_you") query = query.in("status", ["needs_info", "awaiting_approval", "failed"]);
  else if (filter === "past") query = query.lt("occurs_on", today);
  else query = query.gte("occurs_on", today).not("status", "in", "(cancelled,skipped)");

  const { data } = await query.order("occurs_on", { ascending: filter !== "past" }).limit(200);

  const moments: MomentRowData[] = (data ?? []).map((e) => {
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

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Moments</h1>

      <nav aria-label="Filter moments" className="mt-5 flex gap-1 border-b border-rule">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "upcoming" ? "/moments" : `/moments?filter=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              filter === f.key
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {moments.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule-strong px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">{EMPTY[filter]!.title}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{EMPTY[filter]!.body}</p>
          {filter === "upcoming" && (
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4">
              See who&rsquo;s coming up in the next few months
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-rule bg-card">
          {moments.map((m) => <MomentRow key={m.id} moment={m} />)}
        </div>
      )}
    </div>
  );
}
