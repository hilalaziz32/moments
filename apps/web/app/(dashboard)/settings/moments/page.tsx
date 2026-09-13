import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canManagePeople, isOrgAdmin, requireOrg } from "@/lib/auth/org";
import { loadBudgets } from "@/lib/budgets";
import { BudgetGrid } from "@/components/onboarding/budget-grid";

export const metadata: Metadata = { title: "Budgets" };

export default async function MomentSettingsPage() {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) redirect("/dashboard");

  const { rows, employeeCount, missingDates } = await loadBudgets(org);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Budgets</h1>
      <p className="mt-1 max-w-lg text-sm text-ink-muted">
        What each moment is worth, per person, including delivery.
      </p>
      <BudgetGrid
        policies={rows}
        employeeCount={employeeCount}
        missingDates={missingDates}
        mode="settings"
        readOnly={!isOrgAdmin(org.role)}
      />
    </div>
  );
}
