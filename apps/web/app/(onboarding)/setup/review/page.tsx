import type { Metadata } from "next";
import { requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { computeMomentPlans, type EmployeeForPlanning, type MomentKey, type PolicyForPlanning } from "@moments/core/schedule";
import { GoLiveForm } from "@/components/onboarding/go-live-form";
import { DateMark } from "@/components/moments/date-mark";
import { formatPKR } from "@moments/core/money";

export const metadata: Metadata = { title: "Go live" };

export default async function ReviewPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: employees }, { data: policies }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, preferred_name, department, status, date_of_birth, hire_date, exit_date, exit_reason, celebration_opt_out, timezone")
      .eq("org_id", org.orgId)
      .is("deleted_at", null),
    supabase
      .from("moment_policies")
      .select("id, is_enabled, budget_paisa, approval_required, announcement_local_time, announce_publicly, moment_types(key, label)")
      .eq("org_id", org.orgId)
      .eq("is_enabled", true),
  ]);

  const nameById = new Map((employees ?? []).map((e) => [e.id, e.preferred_name || e.full_name]));
  const deptById = new Map((employees ?? []).map((e) => [e.id, e.department]));
  const labelByKey = new Map(
    (policies ?? []).map((p) => {
      const mt = p.moment_types as unknown as { key: string; label: string } | null;
      return [mt?.key ?? "", mt?.label ?? ""];
    }),
  );

  const roster: EmployeeForPlanning[] = (employees ?? []).map((e) => ({
    id: e.id, orgId: org.orgId, fullName: e.full_name, status: e.status,
    dateOfBirth: e.date_of_birth, hireDate: e.hire_date, exitDate: e.exit_date,
    exitReason: e.exit_reason, celebrationOptOut: e.celebration_opt_out, timezone: e.timezone,
  }));

  const planPolicies: PolicyForPlanning[] = (policies ?? []).map((p) => {
    const mt = p.moment_types as unknown as { key: string; label: string } | null;
    return {
      momentKey: (mt?.key ?? "birthday") as MomentKey,
      momentTypeId: "", policyId: p.id, enabled: true,
      budgetPaisa: p.budget_paisa,
      verifyOffsetDays: 7, selectOffsetDays: 4, approvalOffsetDays: 2,
      approvalRequired: p.approval_required,
      announcementEnabled: true,
      announcementLocalTime: p.announcement_local_time,
      announcePublicly: p.announce_publicly,
      managerNudgeEnabled: true,
    };
  });

  const { plans } = computeMomentPlans({
    org: { id: org.orgId, timezone: org.timezone, feb29ObservedOn: "feb_28", celebrateOnTerminatedExit: false },
    employees: roster,
    policies: planPolicies,
    today,
    horizonDays: 30,
  });
  plans.sort((a, b) => a.occursOn.localeCompare(b.occursOn));

  const totalPaisa = plans.reduce((s, p) => s + p.budgetPaisa, 0);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Here&rsquo;s what happens next</h1>
      <p className="mt-1 max-w-lg text-sm text-ink-muted">
        The next 30 days, with real names and real dates. Nothing has been sent yet.
      </p>

      {plans.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-rule-strong px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">Nothing falls in the next 30 days.</p>
          <p className="mt-1 text-sm text-ink-muted">
            That&rsquo;s normal for a small team. Go live and we&rsquo;ll be ready when the first one comes.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-rule bg-card">
          {plans.slice(0, 40).map((p) => (
            <div
              key={`${p.employeeId}-${p.momentKey}-${p.occurrenceKey}`}
              className="flex items-center gap-5 border-b border-rule px-5 py-3.5 last:border-b-0"
            >
              <DateMark iso={p.occursOn} size="sm" className="w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {p.employeeId ? nameById.get(p.employeeId) ?? "Someone" : org.orgName}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {p.milestoneYears
                    ? `${p.milestoneYears} year anniversary`
                    : labelByKey.get(p.momentKey) ?? p.momentKey}
                  {p.employeeId && deptById.get(p.employeeId) ? ` · ${deptById.get(p.employeeId)}` : ""}
                </p>
              </div>
              <span data-numeric className="shrink-0 text-sm text-ink">
                {formatPKR(p.budgetPaisa)}
              </span>
            </div>
          ))}
          {plans.length > 40 && (
            <p className="border-t border-rule px-5 py-3 text-xs text-ink-faint">
              and {plans.length - 40} more
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-sm text-ink-muted">
        <span data-numeric className="font-medium text-ink">{formatPKR(totalPaisa)}</span>{" "}
        across {plans.length} {plans.length === 1 ? "moment" : "moments"} in the next 30 days.
      </p>

      <GoLiveForm />
    </div>
  );
}
