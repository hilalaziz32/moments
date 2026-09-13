import {
  addDays, completedYears, isBetween, nextOccurrence, occurrenceInYear, parseISO,
  type ISODate,
} from "./dates.js";
import { OFFSETS } from "./offsets.js";
import type {
  EmployeeForPlanning, LifeEventForPlanning, MomentPlan, OrgForPlanning, PlannedTask,
  PolicyForPlanning, SuppressedMoment,
} from "./types.js";

/**
 * The detector's brain. Pure: no I/O, no clock, fully deterministic.
 *
 * `today` is always injected. That is what makes the time-travel harness -- a
 * simulated year in 90 seconds -- possible, and it is why a lint rule forbids
 * `new Date()` anywhere in this package.
 */

export interface PlanInput {
  org: OrgForPlanning;
  employees: readonly EmployeeForPlanning[];
  policies: readonly PolicyForPlanning[];
  today: ISODate;
  horizonDays?: number;
  /** Confirmed or predicted lunar dates, keyed by moment key. */
  observances?: readonly {
    momentKey: "eid_ul_fitr" | "eid_ul_adha" | "ramadan";
    hijriYear: number;
    gregorianDate: ISODate;
    status: "predicted" | "confirmed" | "cancelled";
  }[];
  /** Promotions, weddings, babies and farewells someone told us about. */
  lifeEvents?: readonly LifeEventForPlanning[];
}

export interface PlanResult {
  plans: MomentPlan[];
  suppressed: SuppressedMoment[];
}

/**
 * A new_hire moment only fires for someone hired in the last few days.
 *
 * WITHOUT THIS GUARD, importing 340 employees on day one fires 340 new-hire
 * celebrations and 340 gift orders. It is the single most expensive bug this
 * product could ship, so it is enforced here AND surfaced in the import UI as
 * "0 new-hire celebrations will be created from past hire dates".
 */
export const NEW_HIRE_LOOKBACK_DAYS = 3;

/**
 * Life events are reported by people, and people report late: the promotion
 * letter went out on Monday, HR logs it on Thursday. A week late is still worth
 * celebrating; a month late is not a celebration, it is an awkward reminder.
 */
export const LIFE_EVENT_LOOKBACK_DAYS = 7;

const ANNUAL_FROM_BIRTH = "birthday";
const ANNUAL_FROM_HIRE = "work_anniversary";

export function computeMomentPlans(input: PlanInput): PlanResult {
  const { org, employees, policies, today } = input;
  const horizonDays = input.horizonDays ?? 45;
  const horizonEnd = addDays(today, horizonDays);

  const plans: MomentPlan[] = [];
  const suppressed: SuppressedMoment[] = [];
  const enabled = new Map(policies.filter((p) => p.enabled).map((p) => [p.momentKey, p]));
  // Someone whose farewell was logged by hand must not get a second one from
  // their exit date.
  const loggedFarewell = new Set(
    (input.lifeEvents ?? [])
      .filter((ev) => ev.momentKey === "farewell" && ev.isCelebrated)
      .map((ev) => ev.employeeId),
  );

  for (const emp of employees) {
    if (emp.celebrationOptOut) {
      for (const p of enabled.values()) {
        suppressed.push({ employeeId: emp.id, momentKey: p.momentKey, reason: "opted_out" });
      }
      continue;
    }

    const tz = emp.timezone ?? org.timezone;

    // ---------------------------------------------------------------- farewell
    // Setting someone's last day is how HR tells us they are leaving, so the
    // farewell follows from the exit date. Keyed on that date: moving the last
    // day makes a new occurrence, and the web action cancels the old one.
    const farewellPolicy = enabled.get("farewell");
    if (farewellPolicy && emp.exitDate && !loggedFarewell.has(emp.id)) {
      if (emp.exitReason === "terminated_for_cause" && !org.celebrateOnTerminatedExit) {
        suppressed.push({ employeeId: emp.id, momentKey: "farewell", reason: "terminated_for_cause" });
      } else if (isBetween(emp.exitDate, today, horizonEnd)) {
        plans.push(buildPlan(emp, org, farewellPolicy, emp.exitDate, null, tz, {
          occurrenceKey: `exit:${emp.exitDate}`,
          announceSuppressed: isBlackedOut(org, emp.exitDate),
        }));
      }
    }

    // An exited employee gets nothing new apart from the farewell above.
    if (emp.status === "exited") {
      for (const p of enabled.values()) {
        if (p.momentKey !== "farewell") {
          suppressed.push({ employeeId: emp.id, momentKey: p.momentKey, reason: "exited" });
        }
      }
      continue;
    }

    // ---------------------------------------------------------------- birthday
    const birthdayPolicy = enabled.get(ANNUAL_FROM_BIRTH);
    if (birthdayPolicy) {
      if (!emp.dateOfBirth) {
        suppressed.push({ employeeId: emp.id, momentKey: "birthday", reason: "no_source_date" });
      } else {
        const occ = nextOccurrence(emp.dateOfBirth, today, horizonEnd, org.feb29ObservedOn);
        if (!occ) {
          suppressed.push({ employeeId: emp.id, momentKey: "birthday", reason: "outside_horizon" });
        } else if (isBlackedOut(org, occ.date)) {
          // Blackouts suppress the ANNOUNCEMENT, not the gift -- handled below
          // by announcementEnabled, so we still plan the moment.
          plans.push(buildPlan(emp, org, birthdayPolicy, occ.date, occ.note, tz, {
            occurrenceKey: occ.date, announceSuppressed: true,
          }));
        } else {
          plans.push(buildPlan(emp, org, birthdayPolicy, occ.date, occ.note, tz, {
            occurrenceKey: occ.date,
          }));
        }
      }
    }

    // -------------------------------------------------------- work anniversary
    const annivPolicy = enabled.get(ANNUAL_FROM_HIRE);
    if (annivPolicy) {
      if (!emp.hireDate) {
        suppressed.push({ employeeId: emp.id, momentKey: "work_anniversary", reason: "no_source_date" });
      } else {
        const occ = nextOccurrence(emp.hireDate, today, horizonEnd, org.feb29ObservedOn);
        if (!occ) {
          suppressed.push({ employeeId: emp.id, momentKey: "work_anniversary", reason: "outside_horizon" });
        } else {
          const years = completedYears(emp.hireDate, occ.date);
          // Someone hired three months ago gets nothing until month twelve.
          if (years < 1) {
            suppressed.push({ employeeId: emp.id, momentKey: "work_anniversary", reason: "not_yet_eligible" });
          } else {
            plans.push(buildPlan(emp, org, annivPolicy, occ.date, occ.note, tz, {
              occurrenceKey: occ.date,
              milestoneYears: years,
              budgetOverride: resolveMilestoneBudget(annivPolicy, years),
              announceSuppressed: isBlackedOut(org, occ.date),
            }));
          }
        }
      }
    }

    // ---------------------------------------------------------------- new hire
    const newHirePolicy = enabled.get("new_hire");
    if (newHirePolicy) {
      if (!emp.hireDate) {
        suppressed.push({ employeeId: emp.id, momentKey: "new_hire", reason: "no_source_date" });
      } else {
        const daysSinceHire = daysBetween(emp.hireDate, today);
        const isRecent = daysSinceHire <= NEW_HIRE_LOOKBACK_DAYS;
        const isUpcoming = emp.hireDate > today && emp.hireDate <= horizonEnd;
        if (!isRecent && !isUpcoming) {
          suppressed.push({ employeeId: emp.id, momentKey: "new_hire", reason: "historical_hire" });
        } else {
          plans.push(buildPlan(emp, org, newHirePolicy, emp.hireDate, null, tz, {
            occurrenceKey: `hire:${emp.hireDate}`,
            announceSuppressed: isBlackedOut(org, emp.hireDate),
          }));
        }
      }
    }
  }

  // ------------------------------------------------------------- life events
  // Promotions, weddings, babies: no HR spreadsheet has these. HR (or a manager)
  // logs them, and the occurrence key is the event row itself.
  const byId = new Map(employees.map((e) => [e.id, e]));
  const lookbackStart = addDays(today, -LIFE_EVENT_LOOKBACK_DAYS);
  for (const ev of input.lifeEvents ?? []) {
    if (!ev.isCelebrated) continue;
    const emp = byId.get(ev.employeeId);
    if (!emp || emp.celebrationOptOut) continue;   // opt-outs were reported above
    if (emp.status === "exited" && ev.momentKey !== "farewell") continue;

    const policy = enabled.get(ev.momentKey);
    if (!policy) {
      suppressed.push({ employeeId: emp.id, momentKey: ev.momentKey, reason: "policy_disabled" });
      continue;
    }
    if (ev.momentKey === "farewell" && emp.exitReason === "terminated_for_cause" && !org.celebrateOnTerminatedExit) {
      suppressed.push({ employeeId: emp.id, momentKey: "farewell", reason: "terminated_for_cause" });
      continue;
    }
    if (!isBetween(ev.eventDate, lookbackStart, horizonEnd)) {
      suppressed.push({ employeeId: emp.id, momentKey: ev.momentKey, reason: "outside_horizon" });
      continue;
    }

    plans.push(buildPlan(emp, org, policy, ev.eventDate, null, emp.timezone ?? org.timezone, {
      occurrenceKey: `evt:${ev.id}`,
      announceSuppressed: isBlackedOut(org, ev.eventDate),
    }));
  }

  // ------------------------------------------------------- lunar observances
  for (const obs of input.observances ?? []) {
    if (obs.status === "cancelled") continue;
    const policy = enabled.get(obs.momentKey);
    if (!policy) continue;
    if (!isBetween(obs.gregorianDate, today, horizonEnd)) continue;

    // An event from a `predicted` row is provisional: HR sees Eid on the calendar
    // and can budget for it, but no logistics fire more than 10 days out, and the
    // occurrence key is the HIJRI YEAR -- so when the committee shifts the date,
    // occursOn moves and the occurrence is still recognised as the same one.
    plans.push({
      employeeId: null,
      orgId: org.id,
      momentKey: obs.momentKey,
      momentTypeId: policy.momentTypeId,
      policyId: policy.policyId,
      occurrenceKey: `${obs.momentKey}:${obs.hijriYear}`,
      occursOn: obs.gregorianDate,
      timezone: org.timezone,
      announceLocalTime: policy.announcementLocalTime,
      announcePublicly: policy.announcePublicly,
      budgetPaisa: policy.budgetPaisa,
      approvalRequired: policy.approvalRequired,
      milestoneYears: null,
      occurrenceNote: obs.status === "predicted" ? "provisional_lunar_date" : null,
      isProvisional: obs.status === "predicted",
      tasks: buildTasks(obs.momentKey, obs.gregorianDate, org.timezone, policy, {
        announceSuppressed: false,
        earliestTaskDate: obs.status === "predicted" ? addDays(obs.gregorianDate, -10) : undefined,
      }),
    });
  }

  return { plans, suppressed };
}

function daysBetween(from: ISODate, to: ISODate): number {
  const a = parseISO(from);
  const b = parseISO(to);
  return Math.floor((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

function isBlackedOut(org: OrgForPlanning, date: ISODate): boolean {
  return (org.blackoutDates ?? []).some((b) => date >= b.from && date <= b.to);
}

function resolveMilestoneBudget(policy: PolicyForPlanning, years: number): number | undefined {
  const tier = (policy.milestoneTiers ?? []).find(
    (t) => years >= t.minYears && (t.maxYears === null || years < t.maxYears),
  );
  return tier?.budgetPaisa;
}

function buildPlan(
  emp: EmployeeForPlanning,
  org: OrgForPlanning,
  policy: PolicyForPlanning,
  occursOn: ISODate,
  note: string | null,
  tz: string,
  opts: {
    occurrenceKey: string;
    milestoneYears?: number;
    budgetOverride?: number;
    announceSuppressed?: boolean;
  },
): MomentPlan {
  return {
    employeeId: emp.id,
    orgId: org.id,
    momentKey: policy.momentKey,
    momentTypeId: policy.momentTypeId,
    policyId: policy.policyId,
    occurrenceKey: opts.occurrenceKey,
    occursOn,
    timezone: tz,
    announceLocalTime: policy.announcementLocalTime,
    announcePublicly: policy.announcePublicly,
    budgetPaisa: opts.budgetOverride ?? policy.budgetPaisa,
    approvalRequired: policy.approvalRequired,
    milestoneYears: opts.milestoneYears ?? null,
    occurrenceNote: opts.announceSuppressed ? joinNotes(note, "announcement_blacked_out") : note,
    isProvisional: false,
    tasks: buildTasks(policy.momentKey, occursOn, tz, policy, {
      announceSuppressed: opts.announceSuppressed ?? false,
    }),
  };
}

function joinNotes(a: string | null, b: string): string {
  return a ? `${a},${b}` : b;
}

function buildTasks(
  momentKey: MomentPlan["momentKey"],
  occursOn: ISODate,
  tz: string,
  policy: PolicyForPlanning,
  opts: { announceSuppressed: boolean; earliestTaskDate?: ISODate },
): PlannedTask[] {
  const offsets = OFFSETS[momentKey];
  const tasks: PlannedTask[] = [];

  for (const off of offsets) {
    if (opts.announceSuppressed && (off.taskType === "announce" || off.taskType === "nudge_manager")) continue;
    if (!policy.announcementEnabled && (off.taskType === "announce" || off.taskType === "prepare_announcement")) continue;
    if (!policy.managerNudgeEnabled && off.taskType === "nudge_manager") continue;
    if (!policy.approvalRequired && (off.taskType === "request_approval" || off.taskType === "approval_remind" || off.taskType === "approval_auto_decide")) continue;

    let onDate = addDays(occursOn, -off.offsetDays);
    let atTime = off.atTime;

    // Provisional lunar dates: nothing logistical fires more than 10 days out.
    if (opts.earliestTaskDate && onDate < opts.earliestTaskDate) {
      onDate = opts.earliestTaskDate;
    }

    if (off.taskType === "announce") atTime = policy.announcementLocalTime;
    if (off.taskType === "nudge_manager") atTime = addMinutesToTime(policy.announcementLocalTime, 5);

    tasks.push({
      taskType: off.taskType,
      lane: off.lane,
      onDate,
      atTime,
      timezone: tz,
      onLate: off.onLate,
      lateThresholdSeconds: off.lateThresholdSeconds,
      maxAttempts: off.maxAttempts,
    });
  }

  return tasks.sort((a, b) => (a.onDate + a.atTime < b.onDate + b.atTime ? -1 : 1));
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The onboarding wizard's "41 moments in the next 90 days, PKR 118,500" panel.
 * This is the moment the buyer understands the price, so it must agree exactly
 * with what the detector will later materialise.
 */
export function estimateCost(result: PlanResult): {
  momentCount: number;
  totalBudgetPaisa: number;
  byMoment: { momentKey: string; count: number; budgetPaisa: number }[];
} {
  const by = new Map<string, { count: number; budgetPaisa: number }>();
  for (const p of result.plans) {
    const cur = by.get(p.momentKey) ?? { count: 0, budgetPaisa: 0 };
    cur.count++;
    cur.budgetPaisa += p.budgetPaisa;
    by.set(p.momentKey, cur);
  }
  return {
    momentCount: result.plans.length,
    totalBudgetPaisa: result.plans.reduce((s, p) => s + p.budgetPaisa, 0),
    byMoment: [...by.entries()]
      .map(([momentKey, v]) => ({ momentKey, ...v }))
      .sort((a, b) => b.budgetPaisa - a.budgetPaisa),
  };
}
