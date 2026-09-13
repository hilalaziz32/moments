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
 *
 * Also the catalogue per moment, so "PKR 2,500" becomes "a cake and flowers":
 * people set better budgets when they can see what the number buys. Only
 * customer-visible columns are read -- never our cost, margin or supplier.
 */
export async function loadBudgets(org: ActiveOrg) {
  const supabase = await createClient();

  const [{ data: policies }, estimate, { data: products }] = await Promise.all([
    supabase
      .from("moment_policies")
      .select("id, is_enabled, budget_paisa, approval_required, moment_types(key, label, description)")
      .eq("org_id", org.orgId),
    countUpcomingMoments(org.orgId, org.timezone, 90),
    supabase
      .from("gift_products")
      .select("name, list_price_paisa, suitable_moment_keys, is_digital")
      .eq("is_active", true)
      .eq("is_digital", false)
      .order("list_price_paisa", { ascending: false })
      .limit(500),
  ]);

  const giftsFor = (key: string) =>
    (products ?? [])
      .filter((p) => (p.suitable_moment_keys ?? []).length === 0 || p.suitable_moment_keys.includes(key))
      .map((p) => ({ name: p.name, pricePaisa: p.list_price_paisa }));

  const rows: PolicyRow[] = (policies ?? [])
    .map((p) => {
      const mt = p.moment_types as unknown as { key: string; label: string; description: string | null } | null;
      const key = mt?.key ?? "";
      return {
        id: p.id,
        key,
        label: mt?.label ?? "",
        isEnabled: p.is_enabled,
        budgetPaisa: p.budget_paisa,
        approvalRequired: p.approval_required,
        upcomingCount: estimate.counts[key] ?? 0,
        gifts: key ? giftsFor(key) : [],
      };
    })
    .filter((r) => r.key);

  rows.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

  return { rows, employeeCount: estimate.employeeCount, missingDates: estimate.missingDates };
}
