import type { MomentPlan, PlannedTask } from "./types.js";

/**
 * Plan -> database row conversion, shared by the worker's nightly detector and
 * the web app's "plan this org now". Pure: the clock and the jitter are passed
 * in, so both callers produce identical rows for identical input.
 */

/**
 * The instant a local wall-clock time happens in a timezone.
 * Date arithmetic in the org timezone, THEN convert. Never add intervals to an instant.
 */
export function localInstant(onDate: string, atTime: string, timezone: string): Date {
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

export function momentEventRow(p: MomentPlan, momentTypeId: string, capturedAt: string): Record<string, unknown> {
  return {
    org_id: p.orgId,
    employee_id: p.employeeId,
    moment_type_id: p.momentTypeId || momentTypeId,
    policy_id: p.policyId,
    occurrence_key: p.occurrenceKey,
    occurs_on: p.occursOn,
    timezone: p.timezone,
    announce_local_time: p.announceLocalTime,
    status: "scheduled",
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
      capturedAt,
    },
  };
}

/**
 * COMPRESSION: when an org goes live two days before a birthday, some tasks are
 * already in the past. `run_now` work is staggered a few minutes out (by
 * `staggerMs`) rather than fired in one burst; `skip` work is dropped;
 * `preserve` work (announce, nudge) keeps its wall-clock meaning.
 */
export function momentTaskRow(
  orgId: string,
  eventId: string,
  t: PlannedTask,
  nowMs: number,
  staggerMs: number,
): Record<string, unknown> {
  const scheduled = localInstant(t.onDate, t.atTime, t.timezone);
  const isPast = scheduled.getTime() < nowMs;
  const nextAttempt = isPast && t.onLate === "run_now" ? new Date(nowMs + staggerMs) : scheduled;

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
