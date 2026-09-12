import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeMomentPlans, estimateCost, NEW_HIRE_LOOKBACK_DAYS } from "./compute-plan.js";
import type { EmployeeForPlanning, OrgForPlanning, PolicyForPlanning } from "./types.js";

const ORG: OrgForPlanning = {
  id: "org-1",
  timezone: "Asia/Karachi",
  feb29ObservedOn: "feb_28",
  celebrateOnTerminatedExit: false,
};

function policy(p: Partial<PolicyForPlanning> & Pick<PolicyForPlanning, "momentKey">): PolicyForPlanning {
  return {
    momentTypeId: `mt-${p.momentKey}`,
    policyId: `pol-${p.momentKey}`,
    enabled: true,
    budgetPaisa: 250_000,
    verifyOffsetDays: 7,
    selectOffsetDays: 4,
    approvalOffsetDays: 2,
    approvalRequired: false,
    announcementEnabled: true,
    announcementLocalTime: "09:00",
    announcePublicly: true,
    managerNudgeEnabled: true,
    ...p,
  };
}

function employee(e: Partial<EmployeeForPlanning> = {}): EmployeeForPlanning {
  return {
    id: "emp-bilal",
    orgId: "org-1",
    fullName: "Bilal Ahmed",
    status: "active",
    dateOfBirth: "1994-09-28",
    hireDate: "2023-04-01",
    exitDate: null,
    exitReason: null,
    celebrationOptOut: false,
    timezone: null,
    ...e,
  };
}

describe("the worked example: Bilal's birthday on 28 September", () => {
  const r = computeMomentPlans({
    org: ORG,
    employees: [employee()],
    policies: [policy({ momentKey: "birthday", approvalRequired: true })],
    today: "2026-09-12",
  });

  test("materialises exactly one moment", () => {
    assert.equal(r.plans.length, 1);
    assert.equal(r.plans[0]!.occursOn, "2026-09-28");
    assert.equal(r.plans[0]!.occurrenceKey, "2026-09-28");
  });

  test("schedules the pipeline on the days from the spec", () => {
    const byType = new Map(r.plans[0]!.tasks.map((t) => [t.taskType, t]));
    assert.equal(byType.get("verify_details_send")!.onDate, "2026-09-21"); // T-7
    assert.equal(byType.get("select_gift")!.onDate,         "2026-09-24"); // T-4
    assert.equal(byType.get("request_approval")!.onDate,    "2026-09-26"); // T-2
    assert.equal(byType.get("announce")!.onDate,            "2026-09-28"); // T-0
    assert.equal(byType.get("announce")!.atTime,            "09:00");
    assert.equal(byType.get("nudge_manager")!.atTime,       "09:05");
  });

  test("pre-renders the announcement the evening before", () => {
    const prep = r.plans[0]!.tasks.find((t) => t.taskType === "prepare_announcement")!;
    assert.equal(prep.onDate, "2026-09-27");
    assert.equal(prep.atTime, "18:00");
  });

  test("puts announce and nudge in their own lane, everything else out of it", () => {
    for (const t of r.plans[0]!.tasks) {
      const expected = t.taskType === "announce" || t.taskType === "nudge_manager" ? "announce"
        : t.taskType === "collect_feedback" || t.taskType === "close_moment" ? "slow" : "default";
      assert.equal(t.lane, expected, `${t.taskType} should be in lane ${expected}`);
    }
  });

  test("announce is 'preserve' on late -- it is wall-clock meaningful", () => {
    const ann = r.plans[0]!.tasks.find((t) => t.taskType === "announce")!;
    assert.equal(ann.onLate, "preserve");
    assert.equal(ann.lateThresholdSeconds, 300);
  });
});

describe("THE EXPENSIVE BUG: importing a roster of historical hires", () => {
  test("340 employees hired years ago produce ZERO new-hire celebrations", () => {
    const roster = Array.from({ length: 340 }, (_, i) =>
      employee({ id: `emp-${i}`, hireDate: "2019-06-15", dateOfBirth: null }));

    const r = computeMomentPlans({
      org: ORG,
      employees: roster,
      policies: [policy({ momentKey: "new_hire", budgetPaisa: 400_000 })],
      today: "2026-09-12",
    });

    assert.equal(r.plans.length, 0, "would have fired 340 gift orders on day one");
    assert.equal(r.suppressed.length, 340);
    assert.ok(r.suppressed.every((s) => s.reason === "historical_hire"));
  });

  test("but someone hired yesterday IS celebrated", () => {
    const r = computeMomentPlans({
      org: ORG,
      employees: [employee({ hireDate: "2026-09-11", dateOfBirth: null })],
      policies: [policy({ momentKey: "new_hire" })],
      today: "2026-09-12",
    });
    assert.equal(r.plans.length, 1);
  });

  test("the lookback boundary is exact", () => {
    const onBoundary = computeMomentPlans({
      org: ORG,
      employees: [employee({ hireDate: "2026-09-09", dateOfBirth: null })],
      policies: [policy({ momentKey: "new_hire" })],
      today: "2026-09-12",
    });
    assert.equal(onBoundary.plans.length, 1, `${NEW_HIRE_LOOKBACK_DAYS} days back must still fire`);

    const pastBoundary = computeMomentPlans({
      org: ORG,
      employees: [employee({ hireDate: "2026-09-08", dateOfBirth: null })],
      policies: [policy({ momentKey: "new_hire" })],
      today: "2026-09-12",
    });
    assert.equal(pastBoundary.plans.length, 0);
  });
});

describe("Feb 29 birthdays", () => {
  const leapling = employee({ dateOfBirth: "1996-02-29", hireDate: null });

  test("observed on 28 Feb in a non-leap year by default", () => {
    const r = computeMomentPlans({
      org: ORG, employees: [leapling],
      policies: [policy({ momentKey: "birthday" })],
      today: "2027-02-01",
    });
    assert.equal(r.plans[0]!.occursOn, "2027-02-28");
    assert.equal(r.plans[0]!.occurrenceNote, "leap_day_observed_feb_28");
  });

  test("observed on 1 Mar when the org says so", () => {
    const r = computeMomentPlans({
      org: { ...ORG, feb29ObservedOn: "mar_01" }, employees: [leapling],
      policies: [policy({ momentKey: "birthday" })],
      today: "2027-02-01",
    });
    assert.equal(r.plans[0]!.occursOn, "2027-03-01");
  });

  test("falls on the real date in a leap year", () => {
    const r = computeMomentPlans({
      org: ORG, employees: [leapling],
      policies: [policy({ momentKey: "birthday" })],
      today: "2028-02-01",
    });
    assert.equal(r.plans[0]!.occursOn, "2028-02-29");
    assert.equal(r.plans[0]!.occurrenceNote, null);
  });
});

describe("work anniversaries", () => {
  test("someone who joined days ago does not get a 'zero year' anniversary", () => {
    // Their hire DATE recurs within the horizon, but they have completed 0 years.
    const r = computeMomentPlans({
      org: ORG,
      employees: [employee({ hireDate: "2026-09-20", dateOfBirth: null })],
      policies: [policy({ momentKey: "work_anniversary" })],
      today: "2026-09-12",
    });
    assert.equal(r.plans.length, 0);
    assert.equal(r.suppressed[0]!.reason, "not_yet_eligible");
  });

  test("their real first anniversary IS planned once it enters the horizon", () => {
    const r = computeMomentPlans({
      org: ORG,
      employees: [employee({ hireDate: "2026-09-20", dateOfBirth: null })],
      policies: [policy({ momentKey: "work_anniversary" })],
      today: "2027-09-01",
    });
    assert.equal(r.plans.length, 1);
    assert.equal(r.plans[0]!.occursOn, "2027-09-20");
    assert.equal(r.plans[0]!.milestoneYears, 1);
  });

  test("reports completed years and applies the milestone tier budget", () => {
    const r = computeMomentPlans({
      org: ORG,
      employees: [employee({ hireDate: "2021-09-20", dateOfBirth: null })],
      policies: [policy({
        momentKey: "work_anniversary", budgetPaisa: 350_000,
        milestoneTiers: [{ minYears: 5, maxYears: 10, budgetPaisa: 1_500_000 }],
      })],
      today: "2026-09-12",
    });
    assert.equal(r.plans[0]!.milestoneYears, 5);
    assert.equal(r.plans[0]!.budgetPaisa, 1_500_000, "5-year tier must override the base budget");
  });
});

describe("consent and lifecycle", () => {
  test("an opted-out employee is never celebrated", () => {
    const r = computeMomentPlans({
      org: ORG, employees: [employee({ celebrationOptOut: true })],
      policies: [policy({ momentKey: "birthday" })], today: "2026-09-12",
    });
    assert.equal(r.plans.length, 0);
    assert.equal(r.suppressed[0]!.reason, "opted_out");
  });

  test("an exited employee gets no new moments", () => {
    const r = computeMomentPlans({
      org: ORG,
      employees: [employee({ status: "exited", exitDate: "2026-08-01" })],
      policies: [policy({ momentKey: "birthday" })], today: "2026-09-12",
    });
    assert.equal(r.plans.length, 0);
    assert.equal(r.suppressed[0]!.reason, "exited");
  });

  test("an employee with no date of birth is reported, not silently dropped", () => {
    const r = computeMomentPlans({
      org: ORG, employees: [employee({ dateOfBirth: null })],
      policies: [policy({ momentKey: "birthday" })], today: "2026-09-12",
    });
    assert.equal(r.suppressed[0]!.reason, "no_source_date");
  });
});

describe("new_baby defaults to private", () => {
  test("does not announce publicly unless the employee opts in", () => {
    const r = computeMomentPlans({
      org: ORG, employees: [employee()],
      policies: [policy({
        momentKey: "birthday", announcePublicly: false, announcementEnabled: false,
      })],
      today: "2026-09-12",
    });
    const types = r.plans[0]!.tasks.map((t) => t.taskType);
    assert.ok(!types.includes("announce"), "no public announcement when disabled");
    assert.ok(!types.includes("prepare_announcement"));
  });
});

describe("lunar observances", () => {
  test("a PREDICTED Eid is provisional and keyed on the Hijri year", () => {
    const r = computeMomentPlans({
      org: ORG, employees: [], today: "2027-03-01", horizonDays: 45,
      policies: [policy({ momentKey: "eid_ul_fitr", budgetPaisa: 500_000 })],
      observances: [{
        momentKey: "eid_ul_fitr", hijriYear: 1448,
        gregorianDate: "2027-03-10", status: "predicted",
      }],
    });
    assert.equal(r.plans.length, 1);
    assert.equal(r.plans[0]!.isProvisional, true);
    // The key does NOT contain the Gregorian date, so a committee reschedule
    // moves occursOn without creating a second occurrence.
    assert.equal(r.plans[0]!.occurrenceKey, "eid_ul_fitr:1448");
  });

  test("no logistics fire more than 10 days before a provisional Eid", () => {
    const r = computeMomentPlans({
      org: ORG, employees: [], today: "2027-03-01", horizonDays: 45,
      policies: [policy({ momentKey: "eid_ul_fitr" })],
      observances: [{
        momentKey: "eid_ul_fitr", hijriYear: 1448,
        gregorianDate: "2027-03-10", status: "predicted",
      }],
    });
    for (const t of r.plans[0]!.tasks) {
      assert.ok(t.onDate >= "2027-02-28", `${t.taskType} fired too early: ${t.onDate}`);
    }
  });
});

describe("blackout dates", () => {
  test("suppress the announcement but still plan the gift", () => {
    const r = computeMomentPlans({
      org: { ...ORG, blackoutDates: [{ from: "2026-09-27", to: "2026-09-30" }] },
      employees: [employee()],
      policies: [policy({ momentKey: "birthday" })],
      today: "2026-09-12",
    });
    const types = r.plans[0]!.tasks.map((t) => t.taskType);
    assert.ok(!types.includes("announce"), "announcement must be suppressed");
    assert.ok(types.includes("place_order"), "the gift still ships");
    assert.match(r.plans[0]!.occurrenceNote!, /blacked_out/);
  });
});

describe("the onboarding cost estimate", () => {
  test("agrees with what the detector will materialise", () => {
    const roster = [
      employee({ id: "a", dateOfBirth: "1994-09-28", hireDate: null }),
      employee({ id: "b", dateOfBirth: "1990-10-02", hireDate: null }),
      employee({ id: "c", dateOfBirth: "1988-09-30", hireDate: null }),
    ];
    const r = computeMomentPlans({
      org: ORG, employees: roster,
      policies: [policy({ momentKey: "birthday", budgetPaisa: 250_000 })],
      today: "2026-09-12", horizonDays: 90,
    });
    const est = estimateCost(r);
    assert.equal(est.momentCount, 3);
    assert.equal(est.totalBudgetPaisa, 750_000); // PKR 7,500
  });
});

describe("determinism", () => {
  test("running the detector twice produces identical plans", () => {
    const input = {
      org: ORG, employees: [employee()],
      policies: [policy({ momentKey: "birthday" })], today: "2026-09-12",
    };
    assert.deepEqual(computeMomentPlans(input), computeMomentPlans(input));
  });
});
