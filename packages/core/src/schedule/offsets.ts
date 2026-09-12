import type { MomentKey, TaskOffset } from "./types.js";

/**
 * The T-7 / T-4 / T-2 / T-0 pipeline, per moment type.
 *
 * Two product-shaped rules are encoded here rather than left to configuration:
 *
 *   * new_baby does not announce publicly by default. Announcing someone's baby
 *     company-wide before they are ready is recoverable only by apology; the
 *     employee opts in at the verify step.
 *   * farewell announces at 16:00, not 09:00 -- the end of the last day.
 *
 * `onLate` is what the compression rule consults when an org goes live two days
 * before a birthday, or when Eid gets confirmed late:
 *   run_now  -- logistics. Do it immediately, staggered.
 *   skip     -- reminders and feedback. The moment has passed them by.
 *   preserve -- announce/nudge. These are wall-clock-meaningful; moving them to
 *               "now" at 3pm is worse than the org's late_announcement_policy.
 */

const DEFAULT_PIPELINE = (o: {
  verify: number; select: number; approve: number;
  announceAt: string; orderAt?: number;
}): TaskOffset[] => [
  { taskType: "verify_details_send",   lane: "default",  offsetDays: o.verify,  atTime: "10:00", onLate: "run_now", lateThresholdSeconds: 3600,  maxAttempts: 5 },
  { taskType: "verify_details_remind", lane: "default",  offsetDays: Math.max(o.verify - 2, o.select + 1), atTime: "10:00", onLate: "skip", lateThresholdSeconds: 3600, maxAttempts: 3 },
  { taskType: "select_gift",           lane: "default",  offsetDays: o.select,  atTime: "10:00", onLate: "run_now", lateThresholdSeconds: 3600,  maxAttempts: 5 },
  { taskType: "request_approval",      lane: "default",  offsetDays: o.approve, atTime: "10:00", onLate: "run_now", lateThresholdSeconds: 3600,  maxAttempts: 5 },
  { taskType: "approval_auto_decide",  lane: "default",  offsetDays: 1,         atTime: "17:00", onLate: "run_now", lateThresholdSeconds: 3600,  maxAttempts: 3 },
  { taskType: "place_order",           lane: "default",  offsetDays: o.orderAt ?? o.approve, atTime: "14:00", onLate: "run_now", lateThresholdSeconds: 3600, maxAttempts: 5 },
  { taskType: "order_chase",           lane: "default",  offsetDays: 1,         atTime: "11:00", onLate: "skip",    lateThresholdSeconds: 3600,  maxAttempts: 3 },
  // The most important handler in the product: if the physical gift is not in
  // transit by T-0 morning, substitute a digital one so the employee gets
  // something on the day.
  { taskType: "order_fallback",        lane: "default",  offsetDays: 0,         atTime: "08:00", onLate: "run_now", lateThresholdSeconds: 900,   maxAttempts: 3 },
  // Pre-render the day before so any content problem surfaces at 18:00, when a
  // human can still fix it, rather than at 09:00 when nobody is watching.
  { taskType: "prepare_announcement",  lane: "default",  offsetDays: 1,         atTime: "18:00", onLate: "run_now", lateThresholdSeconds: 3600,  maxAttempts: 5 },
  { taskType: "announce",              lane: "announce", offsetDays: 0,         atTime: o.announceAt, onLate: "preserve", lateThresholdSeconds: 300, maxAttempts: 6 },
  { taskType: "nudge_manager",         lane: "announce", offsetDays: 0,         atTime: addMinutes(o.announceAt, 5), onLate: "preserve", lateThresholdSeconds: 300, maxAttempts: 6 },
  { taskType: "confirm_delivery",      lane: "default",  offsetDays: 0,         atTime: "17:00", onLate: "skip",    lateThresholdSeconds: 3600,  maxAttempts: 3 },
  { taskType: "collect_feedback",      lane: "slow",     offsetDays: -1,        atTime: "11:00", onLate: "skip",    lateThresholdSeconds: 86400, maxAttempts: 3 },
  { taskType: "close_moment",          lane: "slow",     offsetDays: -2,        atTime: "10:00", onLate: "run_now", lateThresholdSeconds: 86400, maxAttempts: 3 },
];

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const OFFSETS: Record<MomentKey, TaskOffset[]> = {
  birthday:              DEFAULT_PIPELINE({ verify: 7,  select: 4,  approve: 2, announceAt: "09:00" }),
  work_anniversary:      DEFAULT_PIPELINE({ verify: 7,  select: 4,  approve: 2, announceAt: "09:00" }),
  // Compressed: a new hire cannot be verified a week before they exist.
  // Announce at 09:30 so the new person is actually logged in.
  new_hire:              DEFAULT_PIPELINE({ verify: 3,  select: 2,  approve: 2, announceAt: "09:30" }),
  promotion:             DEFAULT_PIPELINE({ verify: 2,  select: 2,  approve: 1, announceAt: "09:00" }),
  // Higher value, longer lead: order at T-7, not T-2.
  marriage:              DEFAULT_PIPELINE({ verify: 14, select: 10, approve: 7, announceAt: "09:00", orderAt: 7 }),
  new_baby:              DEFAULT_PIPELINE({ verify: 3,  select: 2,  approve: 2, announceAt: "10:00" }),
  farewell:              DEFAULT_PIPELINE({ verify: 5,  select: 4,  approve: 3, announceAt: "16:00" }),
  eid_ul_fitr:           DEFAULT_PIPELINE({ verify: 10, select: 7,  approve: 7, announceAt: "09:00" }),
  eid_ul_adha:           DEFAULT_PIPELINE({ verify: 10, select: 7,  approve: 7, announceAt: "09:00" }),
  ramadan:               DEFAULT_PIPELINE({ verify: 10, select: 7,  approve: 7, announceAt: "09:00" }),
  employee_of_the_month: DEFAULT_PIPELINE({ verify: 3,  select: 2,  approve: 1, announceAt: "09:00" }),
};

/** Tasks whose timing is meaningful in wall-clock terms and must not be shifted. */
export const DATE_SENSITIVE_TASKS = new Set(["announce", "nudge_manager"]);
