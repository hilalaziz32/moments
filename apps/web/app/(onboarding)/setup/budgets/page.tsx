import type { Metadata } from "next";
import { requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { countUpcomingMoments } from "@/lib/import/estimate";
import { BudgetGrid } from "@/components/onboarding/budget-grid";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const org = await requireOrg();
  const supabase = await createClient();

  const [{ data: policies }, estimate] = await Promise.all([
    supabase
      .from("moment_policies")
      .select("id, is_enabled, budget_paisa, approval_required, moment_types(key, label, description)")
      .eq("org_id", org.orgId),
    countUpcomingMoments(org.orgId, org.timezone, 90),
  ]);

  const rows = (policies ?? [])
    .map((p) => {
      const mt = p.moment_types as unknown as { key: string; label: string; description: string | null } | null;
      return {
        id: p.id,
        key: mt?.key ?? "",
        label: mt?.label ?? "",
        isEnabled: p.is_enabled,
        budgetPaisa: p.budget_paisa,
        approvalRequired: p.approval_required,
        upcomingCount: estimate.counts[mt?.key ?? ""] ?? 0,
      };
    })
    .filter((r) => r.key);

  const ORDER = [
    "birthday","work_anniversary","new_hire","promotion","marriage","new_baby",
    "farewell","eid_ul_fitr","eid_ul_adha","ramadan","employee_of_the_month",
  ];
  rows.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">What each moment is worth</h1>
      <p className="mt-1 max-w-lg text-sm text-ink-muted">
        Set a budget per person, per occasion. We stay inside it, including delivery.
      </p>
      <BudgetGrid
        policies={rows}
        employeeCount={estimate.employeeCount}
        missingDates={estimate.missingDates}
      />
    </div>
  );
}
