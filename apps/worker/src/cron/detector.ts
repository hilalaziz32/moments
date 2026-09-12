import {
  computeMomentPlans, type EmployeeForPlanning, type MomentKey,
  type PolicyForPlanning, type PlannedTask,
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
  const [{ data: employees }, { data: policies }] = await Promise.all([
    db.from("employees")
      .select("id, status, date_of_birth, hire_date, exit_date, exit_reason, celebration_opt_out, timezone")
      .eq("org_id", org.id)
      .is("deleted_at", null)
      .in("status", ["active", "on_leave", "notice_period"]),
    db.from("moment_policies")
      .select("id, budget_paisa, verify_offset_days, select_offset_days, approval_offset_days, approval_required, announcement_enabled, announcement_local_time, announce_publicly, manager_nudge_enabled, moment_types(id, key)")
      .eq("org_id", org.id)
      .eq("is_enabled", true),
  ]);

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

  // Chunked: the service-role connection is not subject to the 8s
  // authenticator timeout, but a 5,000-row insert still deserves batching.
  const CHUNK = 100;
  for (let i = 0; i < plans.length; i += CHUNK) {
    const slice = plans.slice(i, i + CHUNK);

    const rows = slice.map((p) => ({
      org_id: p.orgId,
      employee_id: p.employeeId,
      moment_type_id: p.momentTypeId || typeIdByKey.get(p.momentKey) || "",
      policy_id: p.policyId,
      occurrence_key: p.occurrenceKey,
      occurs_on: p.occursOn,
      timezone: p.timezone,
      announce_local_time: p.announceLocalTime,
      status: "scheduled" as const,
      budget_paisa: p.budgetPaisa,
      approval_required: p.approvalRequired,
      announcement_enabled: true,
      announce_publicly: p.announcePublicly,
      milestone_years: p.milestoneYears,
      occurrence_note: p.occurrenceNote,
      is_provisional: p.isProvisional,
      // The policy AS OF materialisation. Raising the birthday budget on the
      // 25th must not silently change a moment already through gift selection.
      policy_snapshot: {
        budgetPaisa: p.budgetPaisa,
        approvalRequired: p.approvalRequired,
        announceLocalTime: p.announceLocalTime,
        announcePublicly: p.announcePublicly,
        capturedAt: new Date().toISOString(),
      } as never,
    }));

    const { data: inserted, error } = await db
      .from("moment_events")
      .upsert(rows, {
        onConflict: "org_id,employee_id,moment_type_id,occurrence_key",
        ignoreDuplicates: true,
      })
      .select("id, occurrence_key, employee_id, occurs_on, timezone");

    if (error) {
      logger.error({ org_id: org.id, err: error.message }, "could not upsert moment events");
      continue;
    }

    const newEvents = inserted ?? [];
    eventCount += newEvents.length;

    const byKey = new Map(newEvents.map((e) => [`${e.employee_id ?? "org"}:${e.occurrence_key}`, e.id]));
    const taskRows: Record<string, unknown>[] = [];

    for (const p of slice) {
      const eventId = byKey.get(`${p.employeeId ?? "org"}:${p.occurrenceKey}`);
      if (!eventId) continue;   // already existed; its tasks exist too
      for (const t of p.tasks) taskRows.push(taskRow(p.orgId, eventId, t));
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

/**
 * Converts a planned task into a row.
 *
 * COMPRESSION: when an org goes live two days before a birthday, some tasks are
 * already in the past. `run_now` work is staggered a couple of minutes out rather
 * than fired in one burst; `skip` work is dropped; `preserve` work (announce,
 * nudge) keeps its wall-clock meaning and is left for the late-announcement
 * policy to decide.
 */
function taskRow(orgId: string, eventId: string, t: PlannedTask): Record<string, unknown> {
  const scheduled = localInstant(t.onDate, t.atTime, t.timezone);
  const isPast = scheduled.getTime() < Date.now();

  let nextAttempt = scheduled;
  if (isPast && t.onLate === "run_now") {
    nextAttempt = new Date(Date.now() + 120_000 + Math.random() * 180_000);
  }

  return {
    org_id: orgId,
    moment_event_id: eventId,
    task_type: t.taskType,
    lane: t.lane,
    scheduled_for: scheduled.toISOString(),
    next_attempt_at: nextAttempt.toISOString(),
    late_threshold_seconds: t.lateThresholdSeconds,
    max_attempts: t.maxAttempts,
    status: isPast && t.onLate === "skip" ? "skipped" : "pending",
    priority: t.lane === "announce" ? 10 : 100,
  };
}

/** Date arithmetic in the org timezone, THEN convert. Never add intervals to an instant. */
function localInstant(onDate: string, atTime: string, timezone: string): Date {
  const [y, m, d] = onDate.split("-").map(Number) as [number, number, number];
  const [hh, mm] = atTime.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Resolve the zone offset at that wall-clock moment, then correct.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute),
  );
  return new Date(guess - (asUtc - guess));
}
