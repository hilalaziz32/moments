import "server-only";

import { computeMomentPlans, type EmployeeForPlanning, type MomentKey, type PolicyForPlanning } from "@moments/core/schedule";
import { createClient } from "@/lib/supabase/server";

/**
 * How many moments of each kind fall in the next N days for this roster.
 *
 * Computed with every moment type enabled and a zero budget, so the browser can
 * multiply count x budget live as the HR admin edits the grid WITHOUT us sending
 * any employee dates to the client.
 *
 * Uses the same computeMomentPlans() the detector will run, so the number quoted
 * during setup is the number that actually materialises.
 */
export async function countUpcomingMoments(
  orgId: string,
  timezone: string,
  horizonDays = 90,
  today = new Date().toISOString().slice(0, 10),
): Promise<{ counts: Record<string, number>; employeeCount: number; missingDates: number }> {
  const supabase = await createClient();

  const [{ data: employees }, { data: types }, { data: org }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, status, date_of_birth, hire_date, exit_date, exit_reason, celebration_opt_out, timezone")
      .eq("org_id", orgId)
      .is("deleted_at", null),
    supabase.from("moment_types").select("id, key").is("org_id", null),
    supabase.from("organizations").select("feb29_observed_on, celebrate_on_terminated_exit").eq("id", orgId).single(),
  ]);

  const roster: EmployeeForPlanning[] = (employees ?? []).map((e) => ({
    id: e.id,
    orgId,
    fullName: "",
    status: e.status,
    dateOfBirth: e.date_of_birth,
    hireDate: e.hire_date,
    exitDate: e.exit_date,
    exitReason: e.exit_reason,
    celebrationOptOut: e.celebration_opt_out,
    timezone: e.timezone,
  }));

  const policies: PolicyForPlanning[] = (types ?? []).map((t) => ({
    momentKey: t.key as MomentKey,
    momentTypeId: t.id,
    policyId: null,
    enabled: true,
    budgetPaisa: 0,
    verifyOffsetDays: 7,
    selectOffsetDays: 4,
    approvalOffsetDays: 2,
    approvalRequired: false,
    announcementEnabled: true,
    announcementLocalTime: "09:00",
    announcePublicly: true,
    managerNudgeEnabled: true,
  }));

  const result = computeMomentPlans({
    org: {
      id: orgId,
      timezone,
      feb29ObservedOn: (org?.feb29_observed_on as "feb_28" | "mar_01") ?? "feb_28",
      celebrateOnTerminatedExit: org?.celebrate_on_terminated_exit ?? false,
    },
    employees: roster,
    policies,
    today,
    horizonDays,
  });

  const counts: Record<string, number> = {};
  for (const p of result.plans) counts[p.momentKey] = (counts[p.momentKey] ?? 0) + 1;

  const missingDates = roster.filter((e) => !e.dateOfBirth || !e.hireDate).length;
  return { counts, employeeCount: roster.length, missingDates };
}
