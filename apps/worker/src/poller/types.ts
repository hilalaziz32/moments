import type { TaskOutcome } from "@moments/contracts";
import type { Logger } from "../lib/logger.js";
import type { db } from "../lib/supabase.js";

export type TaskLane = "announce" | "default" | "slow";

export interface ClaimedTaskRow {
  id: string;
  org_id: string;
  moment_event_id: string;
  task_type: string;
  lane: TaskLane;
  status: string;
  scheduled_for: string;
  next_attempt_at: string;
  attempts: number;
  max_attempts: number;
  late_threshold_seconds: number;
  payload: Record<string, unknown>;
}

export interface TaskContext {
  task: ClaimedTaskRow;
  payload: Record<string, unknown>;
  db: typeof db;
  log: Logger;
  /** sha256-style key for the send boundary; suffix distinguishes channels. */
  idempotencyKey: (suffix?: string) => string;
  signal: AbortSignal;
}

export interface TaskHandler {
  type: string;
  lane: TaskLane;
  leaseSeconds: number;
  handle(ctx: TaskContext): Promise<TaskOutcome>;
}
