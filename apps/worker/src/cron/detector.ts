import {
  addDays, computeMomentPlans, LIFE_EVENT_LOOKBACK_DAYS, momentEventRow, momentTaskRow,
  type EmployeeForPlanning, type LifeEventForPlanning, type MomentKey, type PolicyForPlanning,
} from "@moments/core/schedule";
import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";

/**
 * The detector: materialises upcoming moments and fans out their tasks.
 *
 * IDEMPOTENT BY UNIQUE KEY, NOT BY BOOKKEEPING. Every insert is
 * ON CONFLICT DO NOTHING against
 * moment_events(org_id, employee_id, moment_type_id, occurrence_key), so it can
 * be run hourly, twice at once, or replayed, and it cannot double-fire.
 *
 * The web app runs the same planning (apps/web/lib/planning.ts) the moment HR
 * goes live or logs news, so customers see their moments without waiting for
 * 00:15. Both use the shared row builders in @moments/core.
 */

export async function runDetector(opts: { orgId?: string; horizonDays?: number } = {}) {
  const startedAt = Date.now();
  const horizonDays = opts.horizonDays ?? config.horizonDays;
  const today = new Date().toISOString().slice(0, 10);

  const { data: run } = await db
    .from("job_runs")
    .insert({ kind: "detector", org_id: opts.orgId ?? null, worker_id: config.workerId } as never)
    .select("id")
    .single();

  const counts = { orgs: 0, events: 0, tasks: 0, suppressed: 0 };

  try {
    let orgQuery = db
      .from("organizations")
      .select("id, timezone, feb29_observed_on, celebrate_on_terminated_exit, status")
      .in("status", ["trial", "active"])
      .is("deleted_at", null);
    if (opts.orgId) orgQuery = orgQuery.eq("id", opts.orgId);

    const { data: orgs, error } = await orgQuery;
    if (error) throw new Error(error.message);

    const { data: observances } = await db
      .from("observance_dates")
      .select("observance, hijri_year, gregorian_date, status")
      .eq("country_code", "PK")
      .neq("status", "cancelled")
      .gte("gregorian_date", today);

    for (const org of orgs ?? []) {
      counts.orgs++;
      const result = await detectForOrg(org, observances ?? [], today, horizonDays);
      counts.events += result.events;
      counts.tasks += result.tasks;
      counts.suppressed += result.suppressed;
    }

    await db.from("job_runs").update({
      status: "succeeded", finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt, counts: counts as never,
    } as never).eq("id", run?.id ?? "");

    logger.info({ ...counts, durationMs: Date.now() - startedAt }, "detector finished");
    return counts;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("job_runs").update({
      status: "failed", finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt, error: message, counts: counts as never,
    } as never).eq("id", run?.id ?? "");
    logger.error({ err: message }, "detector failed");
    throw err;
  }
}

async function detectForOrg(
  org: { id: string; timezone: string; feb29_observed_on: string; celebrate_on_terminated_exit: boolean },
  observances: { observance: string; hijri_year: number; gregorian_date: string; status: string }[],
  today: string,
  horizonDays: number,
): Promise<{ events: number; tasks: number; suppressed: number }> {
  const [{ data: employees }, { data: policies }, { data: lifeEvents }] = await Promise.all([
    // `exited` is included on purpose: the planner gives them nothing except
    // the farewell for a last day that is still ahead.
    db.from("employees")
      .select("id, status, date_of_birth, hire_date, exit_date, exit_reason, celebration_opt_out, timezone")
      .eq("org_id", org.id)
      .is("deleted_at", null),
    db.from("moment_policies")
      .select("id, budget_paisa, verify_offset_days, select_offset_days, approval_offset_days, approval_required, announcement_enabled, announcement_local_time, announce_publicly, manager_nudge_enabled, moment_types(id, key)")
      .eq("org_id", org.id)
      .eq("is_enabled", true),
    db.from("employee_events")
      .select("id, employee_id, event_date, is_celebrated, moment_types(key)")
      .eq("org_id", org.id)
      .eq("is_celebrated", true)
      .gte("event_date", addDays(today, -LIFE_EVENT_LOOKBACK_DAYS))
      .lte("event_date", addDays(today, horizonDays)),
  ]);

  const LIFE_KEYS = new Set(["promotion", "marriage", "new_baby", "farewell"]);
  const planLifeEvents: LifeEventForPlanning[] = (lifeEvents ?? []).flatMap((ev) => {
    const key = (ev.moment_types as unknown as { key: string } | null)?.key;
    if (!key || !LIFE_KEYS.has(key)) return [];
    return [{
      id: ev.id,
      employeeId: ev.employee_id,
      momentKey: key as LifeEventForPlanning["momentKey"],
      eventDate: ev.event_date,
      isCelebrated: ev.is_celebrated,
    }];
  });

  const typeIdByKey = new Map<string, string>();
  const planPolicies: PolicyForPlanning[] = (policies ?? []).map((p) => {
    const mt = p.moment_types as unknown as { id: string; key: string } | null;
    if (mt) typeIdByKey.set(mt.key, mt.id);
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

  const roster: EmployeeForPlanning[] = (employees ?? []).map((e) => ({
    id: e.id, orgId: org.id, fullName: "", status: e.status,
    dateOfBirth: e.date_of_birth, hireDate: e.hire_date, exitDate: e.exit_date,
    exitReason: e.exit_reason, celebrationOptOut: e.celebration_opt_out, timezone: e.timezone,
  }));

  const { plans, suppressed } = computeMomentPlans({
    org: {
      id: org.id,
      timezone: org.timezone,
      feb29ObservedOn: (org.feb29_observed_on as "feb_28" | "mar_01") ?? "feb_28",
      celebrateOnTerminatedExit: org.celebrate_on_terminated_exit,
    },
    employees: roster,
    policies: planPolicies,
    lifeEvents: planLifeEvents,
    today,
    horizonDays,
    observances: observances
      .filter((o) => ["eid_ul_fitr", "eid_ul_adha", "ramadan_start"].includes(o.observance))
      .map((o) => ({
        momentKey: (o.observance === "ramadan_start" ? "ramadan" : o.observance) as
          "eid_ul_fitr" | "eid_ul_adha" | "ramadan",
        hijriYear: o.hijri_year,
        gregorianDate: o.gregorian_date,
        status: o.status as "predicted" | "confirmed",
      })),
  });

  let eventCount = 0;
  let taskCount = 0;
  const capturedAt = new Date().toISOString();

  // Chunked: the service-role connection is not subject to the 8s
  // authenticator timeout, but a 5,000-row insert still deserves batching.
  const CHUNK = 100;
  for (let i = 0; i < plans.length; i += CHUNK) {
    const slice = plans.slice(i, i + CHUNK);
    const rows = slice.map((p) => momentEventRow(p, typeIdByKey.get(p.momentKey) ?? "", capturedAt));

    const { data: inserted, error } = await db
      .from("moment_events")
      .upsert(rows as never, {
        onConflict: "org_id,employee_id,moment_type_id,occurrence_key",
        ignoreDuplicates: true,
      })
      .select("id, occurrence_key, employee_id");

    if (error) {
      logger.error({ org_id: org.id, err: error.message }, "could not upsert moment events");
      continue;
    }

    const newEvents = (inserted ?? []) as { id: string; occurrence_key: string; employee_id: string | null }[];
    eventCount += newEvents.length;

    const byKey = new Map(newEvents.map((e) => [`${e.employee_id ?? "org"}:${e.occurrence_key}`, e.id]));
    const taskRows: Record<string, unknown>[] = [];
    const now = Date.now();

    for (const p of slice) {
      const eventId = byKey.get(`${p.employeeId ?? "org"}:${p.occurrenceKey}`);
      if (!eventId) continue;   // already existed; its tasks exist too
      for (const t of p.tasks) {
        taskRows.push(momentTaskRow(p.orgId, eventId, t, now, 120_000 + Math.random() * 180_000));
      }
    }

    for (let j = 0; j < taskRows.length; j += 200) {
      const { error: taskError } = await db
        .from("moment_tasks")
        .upsert(taskRows.slice(j, j + 200) as never, {
          onConflict: "moment_event_id,task_type",
          ignoreDuplicates: true,
        });
      if (taskError) {
        logger.error({ org_id: org.id, err: taskError.message }, "could not fan out tasks");
      } else {
        taskCount += Math.min(200, taskRows.length - j);
      }
    }
  }

  return { events: eventCount, tasks: taskCount, suppressed: suppressed.length };
}
