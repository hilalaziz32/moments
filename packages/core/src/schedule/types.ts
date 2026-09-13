export type MomentKey =
  | "birthday" | "work_anniversary" | "new_hire" | "promotion"
  | "marriage" | "new_baby" | "farewell"
  | "eid_ul_fitr" | "eid_ul_adha" | "ramadan" | "employee_of_the_month";

export type TaskType =
  | "verify_details_send" | "verify_details_remind" | "verify_details_finalize"
  | "select_gift" | "request_approval" | "approval_remind" | "approval_auto_decide"
  | "place_order" | "order_chase" | "order_fallback"
  | "prepare_announcement" | "announce" | "deliver_message" | "nudge_manager"
  | "confirm_delivery" | "collect_feedback" | "close_moment";

export type TaskLane = "announce" | "default" | "slow";

/** What to do when a task's computed time is already in the past. */
export type OnLate = "run_now" | "skip" | "preserve";

export interface TaskOffset {
  taskType: TaskType;
  lane: TaskLane;
  /** Days BEFORE the occurrence. Negative means after (e.g. close_moment at T+2). */
  offsetDays: number;
  /** Wall-clock time in the org (or employee) timezone. */
  atTime: string;
  onLate: OnLate;
  lateThresholdSeconds: number;
  maxAttempts: number;
}

export interface EmployeeForPlanning {
  id: string;
  orgId: string;
  fullName: string;
  status: "active" | "on_leave" | "notice_period" | "exited";
  dateOfBirth: string | null;
  hireDate: string | null;
  exitDate: string | null;
  exitReason: string | null;
  celebrationOptOut: boolean;
  timezone: string | null;
}

/** Moments nobody's HR spreadsheet records: someone has to tell us about them. */
export type LifeEventKey = "promotion" | "marriage" | "new_baby" | "farewell";

/** A row of moments.employee_events, as the planner sees it. */
export interface LifeEventForPlanning {
  id: string;
  employeeId: string;
  momentKey: LifeEventKey;
  eventDate: string;
  isCelebrated: boolean;
}

export interface PolicyForPlanning {
  momentKey: MomentKey;
  momentTypeId: string;
  policyId: string | null;
  enabled: boolean;
  budgetPaisa: number;
  verifyOffsetDays: number;
  selectOffsetDays: number;
  approvalOffsetDays: number;
  approvalRequired: boolean;
  announcementEnabled: boolean;
  announcementLocalTime: string;
  announcePublicly: boolean;
  managerNudgeEnabled: boolean;
  milestoneTiers?: { minYears: number; maxYears: number | null; budgetPaisa: number }[];
}

export interface OrgForPlanning {
  id: string;
  timezone: string;
  feb29ObservedOn: "feb_28" | "mar_01";
  celebrateOnTerminatedExit: boolean;
  blackoutDates?: { from: string; to: string }[];
}

export interface PlannedTask {
  taskType: TaskType;
  lane: TaskLane;
  /** Local calendar date the task fires on, in the resolved timezone. */
  onDate: string;
  atTime: string;
  timezone: string;
  onLate: OnLate;
  lateThresholdSeconds: number;
  maxAttempts: number;
}

export interface MomentPlan {
  employeeId: string | null;
  orgId: string;
  momentKey: MomentKey;
  momentTypeId: string;
  policyId: string | null;
  occurrenceKey: string;
  occursOn: string;
  timezone: string;
  announceLocalTime: string;
  announcePublicly: boolean;
  budgetPaisa: number;
  approvalRequired: boolean;
  milestoneYears: number | null;
  occurrenceNote: string | null;
  isProvisional: boolean;
  tasks: PlannedTask[];
}

export interface SuppressedMoment {
  employeeId: string;
  momentKey: MomentKey;
  reason:
    | "historical_hire" | "opted_out" | "exited" | "no_source_date"
    | "policy_disabled" | "not_yet_eligible" | "terminated_for_cause"
    | "outside_horizon";
}
