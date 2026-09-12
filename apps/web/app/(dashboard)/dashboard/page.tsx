import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { MomentRow, type MomentRowData } from "@/components/moments/moment-row";
import { formatPKR } from "@moments/core/money";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: events }, { data: counts }] = await Promise.all([
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

  const needsYou = (counts ?? []).length;
  const committed = moments.reduce((s, m) => s + m.budgetPaisa, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Next 14 days</h1>
        {moments.length > 0 && (
          <p className="text-sm text-ink-muted">
            <span data-numeric className="font-medium text-ink">{formatPKR(committed)}</span> committed
          </p>
        )}
      </div>

      {/*
        The needs-attention strip. Everything else on this page is deliberately
        quiet, so the one loud thing is the thing a human has to do.
      */}
      {needsYou > 0 && (
        <Link
          href="/moments?filter=needs_you"
          className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-state-waiting/40 bg-state-waiting/5 px-5 py-3.5 transition-colors hover:bg-state-waiting/10"
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

      {moments.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule-strong px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">Nothing in the next two weeks.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            When someone&rsquo;s birthday or work anniversary comes round, it will show up
            here a week before, already in motion.
          </p>
          <Link
            href="/employees"
            className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4"
          >
            Check your team&rsquo;s dates
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-rule bg-card">
          {moments.map((m) => <MomentRow key={m.id} moment={m} />)}
        </div>
      )}
    </div>
  );
}
