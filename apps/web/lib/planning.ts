import "server-only";

import {
  addDays, computeMomentPlans, LIFE_EVENT_LOOKBACK_DAYS, momentEventRow, momentTaskRow,
  type EmployeeForPlanning, type LifeEventForPlanning, type MomentKey, type MomentPlan, type PolicyForPlanning,
} from "@moments/core/schedule";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Plans an org's upcoming moments RIGHT NOW, the same way the worker's nightly
 * detector does (same planner, same row builders, same unique keys -- so running
 * both can never duplicate anything).
 *
 * Why the web app does this too: without it a customer goes live and stares at
 * an empty dashboard until 00:15, or forever if the worker is down. Planning
 * the moment they go live, import, change budgets or log news is what makes the
 * product visibly work on day one.
 *
 * Service client, because moment_events/moment_tasks are not tenant-writable.
 * Callers must already have authorised the user for this org.
 * Never throws: planning failing must not fail the HR action that triggered it.
 */

const HORIZON_DAYS = 45;
const LIFE_KEYS = new Set(["promotion", "marriage", "new_baby", "farewell"]);

export interface Forecast {
  plans: MomentPlan[];
  names: Map<string, string>;
  labels: Map<string, string>;
}

export async function loadForecast(orgId: string, horizonDays: number): Promise<Forecast | null> {
  const db = createAdminClient();
  const { data: org } = await db
    .from("organizations")
    .select("id, timezone, feb29_observed_on, celebrate_on_terminated_exit, status")
    .eq("id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!org) return null;

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(new Date());

  const [{ data: employees }, { data: policies }, { data: lifeEvents }, { data: observances }] = await Promise.all([
    db.from("employees")
      .select("id, full_name, preferred_name, status, date_of_birth, hire_date, exit_date, exit_reason, celebration_opt_out, timezone")
      .eq("org_id", orgId).is("deleted_at", null),
    db.from("moment_policies")
      .select("id, budget_paisa, verify_offset_days, select_offset_days, approval_offset_days, approval_required, announcement_enabled, announcement_local_time, announce_publicly, manager_nudge_enabled, moment_types(id, key, label)")
      .eq("org_id", orgId).eq("is_enabled", true),
    db.from("employee_events")
      .select("id, employee_id, event_date, is_celebrated, moment_types(key)")
      .eq("org_id", orgId).eq("is_celebrated", true)
      .gte("event_date", addDays(today, -LIFE_EVENT_LOOKBACK_DAYS))
      .lte("event_date", addDays(today, horizonDays)),
    db.from("observance_dates")
      .select("observance, hijri_year, gregorian_date, status")
      .eq("country_code", "PK").neq("status", "cancelled").gte("gregorian_date", today),
  ]);

  const labels = new Map<string, string>();
  const planPolicies: PolicyForPlanning[] = (policies ?? []).map((p) => {
    const mt = p.moment_types as unknown as { id: string; key: string; label: string } | null;
    if (mt) labels.set(mt.key, mt.label);
    return {
      momentKey: (mt?.key ?? "birthday") as MomentKey,
      momentTypeId: mt?.id ?? "",
      policyId: p.id,
      enabled: true,
      budgetPaisa: p.budget_paisa,
      verifyOffsetDays: p.verify_offset_days,
      selectOffsetDays: p.select_offset_days,
      approvalOffsetDays: p.approval_offset_days,
      approvalRequired: p.approval_required,
      announcementEnabled: p.announcement_enabled,
      announcementLocalTime: String(p.announcement_local_time).slice(0, 5),
      announcePublicly: p.announce_publicly,
      managerNudgeEnabled: p.manager_nudge_enabled,
    };
  });

  const names = new Map<string, string>();
  const roster: EmployeeForPlanning[] = (employees ?? []).map((e) => {
    names.set(e.id, e.preferred_name || e.full_name);
    return {
      id: e.id, orgId, fullName: e.full_name, status: e.status,
      dateOfBirth: e.date_of_birth, hireDate: e.hire_date, exitDate: e.exit_date,
      exitReason: e.exit_reason, celebrationOptOut: e.celebration_opt_out, timezone: e.timezone,
    };
  });

  const planLifeEvents: LifeEventForPlanning[] = (lifeEvents ?? []).flatMap((ev) => {
    const key = (ev.moment_types as unknown as { key: string } | null)?.key;
    return key && LIFE_KEYS.has(key)
      ? [{ id: ev.id, employeeId: ev.employee_id, momentKey: key as LifeEventForPlanning["momentKey"], eventDate: ev.event_date, isCelebrated: ev.is_celebrated }]
      : [];
  });

  const { plans } = computeMomentPlans({
    org: {
      id: orgId,
      timezone: org.timezone,
      feb29ObservedOn: (org.feb29_observed_on as "feb_28" | "mar_01") ?? "feb_28",
      celebrateOnTerminatedExit: org.celebrate_on_terminated_exit,
    },
    employees: roster,
    policies: planPolicies,
    lifeEvents: planLifeEvents,
    today,
    horizonDays,
    observances: (observances ?? [])
      .filter((o) => ["eid_ul_fitr", "eid_ul_adha", "ramadan_start"].includes(o.observance))
      .map((o) => ({
        momentKey: (o.observance === "ramadan_start" ? "ramadan" : o.observance) as "eid_ul_fitr" | "eid_ul_adha" | "ramadan",
        hijriYear: o.hijri_year,
        gregorianDate: o.gregorian_date,
        status: o.status as "predicted" | "confirmed",
      })),
  });

  plans.sort((a, b) => a.occursOn.localeCompare(b.occursOn));
  return { plans, names, labels };
}

export async function planOrgNow(orgId: string): Promise<{ events: number; tasks: number } | null> {
  try {
    const forecast = await loadForecast(orgId, HORIZON_DAYS);
    if (!forecast) return null;

    const db = createAdminClient();
    const { data: org } = await db.from("organizations").select("status").eq("id", orgId).single();
    if (!org || !["trial", "active"].includes(org.status)) return null;

    let events = 0;
    let tasks = 0;
    const capturedAt = new Date().toISOString();

    for (let i = 0; i < forecast.plans.length; i += 100) {
      const slice = forecast.plans.slice(i, i + 100);
      const { data: inserted, error } = await db
        .from("moment_events")
        .upsert(slice.map((p) => momentEventRow(p, "", capturedAt)) as never, {
          onConflict: "org_id,employee_id,moment_type_id,occurrence_key",
          ignoreDuplicates: true,
        })
        .select("id, occurrence_key, employee_id");
      if (error) {
        console.error("[planning] could not upsert moment events", error.message);
        continue;
      }

      const created = (inserted ?? []) as { id: string; occurrence_key: string; employee_id: string | null }[];
      events += created.length;
      const byKey = new Map(created.map((e) => [`${e.employee_id ?? "org"}:${e.occurrence_key}`, e.id]));

      const now = Date.now();
      const taskRows = slice.flatMap((p) => {
        const eventId = byKey.get(`${p.employeeId ?? "org"}:${p.occurrenceKey}`);
        return eventId ? p.tasks.map((t) => momentTaskRow(orgId, eventId, t, now, 120_000 + Math.random() * 180_000)) : [];
      });

      for (let j = 0; j < taskRows.length; j += 200) {
        const { error: taskError } = await db
          .from("moment_tasks")
          .upsert(taskRows.slice(j, j + 200) as never, { onConflict: "moment_event_id,task_type", ignoreDuplicates: true });
        if (taskError) console.error("[planning] could not create tasks", taskError.message);
        else tasks += Math.min(200, taskRows.length - j);
      }
    }

    return { events, tasks };
  } catch (err) {
    console.error("[planning] failed", err);
    return null;
  }
}
