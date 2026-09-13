import "server-only";

import type { ActiveOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { countUpcomingMoments } from "@/lib/import/estimate";
import type { PolicyRow } from "@/components/onboarding/budget-grid";

const ORDER = [
  "birthday", "work_anniversary", "new_hire", "promotion", "marriage", "new_baby",
  "farewell", "eid_ul_fitr", "eid_ul_adha", "ramadan", "employee_of_the_month",
];

/**
 * Budget rows plus the 90-day estimate, shared by onboarding (/setup/budgets)
 * and settings (/settings/moments) so both screens quote the same numbers.
 */
export async function loadBudgets(org: ActiveOrg) {
  const supabase = await createClient();

  const [{ data: policies }, estimate] = await Promise.all([
    supabase
      .from("moment_policies")
      .select("id, is_enabled, budget_paisa, approval_required, moment_types(key, label, description)")
      .eq("org_id", org.orgId),
    countUpcomingMoments(org.orgId, org.timezone, 90),
  ]);

  const rows: PolicyRow[] = (policies ?? [])
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

  rows.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

  return { rows, employeeCount: estimate.employeeCount, missingDates: estimate.missingDates };
}
