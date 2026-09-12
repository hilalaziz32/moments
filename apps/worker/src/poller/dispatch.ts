import { createHash } from "node:crypto";
import pLimit from "p-limit";
import { PermanentTaskError, RetryableTaskError, type TaskOutcome } from "@moments/contracts";
import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";
import { nextAttemptAt } from "./backoff.js";
import type { ClaimedTaskRow, TaskHandler, TaskLane } from "./types.js";
import { HANDLERS } from "../handlers/index.js";

/**
 * Runs claimed tasks.
 *
 * HANDLERS NEVER CALL complete_task/fail_task THEMSELVES. The dispatcher owns
 * every state transition, which is what makes handlers testable in isolation and
 * what guarantees a handler cannot leave a task in `running` forever.
 */

/**
 * Circuit breaker: if one task type fails repeatedly in a short window, stop
 * running it for ten minutes. Without this, a Meta or Slack outage burns every
 * task's retry budget in ninety seconds and they all dead-letter together.
 */
const FAILURE_WINDOW_MS = 120_000;
const FAILURE_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 600_000;

const recentFailures = new Map<string, number[]>();
const openUntil = new Map<string, number>();

function breakerIsOpen(taskType: string): boolean {
  const until = openUntil.get(taskType);
  if (until && Date.now() < until) return true;
  if (until) openUntil.delete(taskType);
  return false;
}

function recordFailure(taskType: string): void {
  const now = Date.now();
  const times = (recentFailures.get(taskType) ?? []).filter((t) => now - t < FAILURE_WINDOW_MS);
  times.push(now);
  recentFailures.set(taskType, times);
  if (times.length >= FAILURE_THRESHOLD) {
    openUntil.set(taskType, now + BREAKER_COOLDOWN_MS);
    recentFailures.delete(taskType);
    logger.error({ taskType, cooldownMs: BREAKER_COOLDOWN_MS }, "circuit breaker opened");
    void raiseAlert("p2", `task_type_failing:${taskType}`, `${taskType} is failing repeatedly`,
      `Paused for 10 minutes after ${FAILURE_THRESHOLD} failures in 2 minutes.`);
  }
}

export async function raiseAlert(
  severity: "p1" | "p2" | "p3",
  dedupeKey: string,
  title: string,
  body: string,
  orgId?: string,
): Promise<void> {
  // alerts has a partial unique index on dedupe_key WHERE status='open', so a
  // flapping condition creates one alert rather than four hundred.
  const { error } = await db.from("alerts").insert({
    severity, kind: dedupeKey.split(":")[0] ?? "worker", dedupe_key: dedupeKey,
    title, body, org_id: orgId ?? null,
  } as never);
  if (error && !error.message.includes("duplicate key")) {
    logger.error({ err: error.message }, "could not record alert");
  }
}

export async function dispatchBatch(tasks: ClaimedTaskRow[], concurrency: number): Promise<void> {
  const limit = pLimit(concurrency);
  await Promise.all(tasks.map((t) => limit(() => runOne(t))));
}

async function runOne(task: ClaimedTaskRow): Promise<void> {
  const log = logger.child({
    task_id: task.id, task_type: task.task_type, org_id: task.org_id,
    moment_event_id: task.moment_event_id, attempt: task.attempts,
  });

  const handler: TaskHandler | undefined = HANDLERS[task.task_type];
  if (!handler) {
    log.error("no handler registered");
    await failTask(task, "permanent", `No handler for task type ${task.task_type}`, log);
    return;
  }

  if (breakerIsOpen(task.task_type)) {
    // Put it straight back rather than burning the attempt on a known outage.
    await failTask(task, "retryable", "circuit breaker open", log,
      new Date(Date.now() + 60_000).toISOString());
    return;
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), handler.leaseSeconds * 800);

  try {
    const outcome: TaskOutcome = await handler.handle({
      task,
      payload: task.payload ?? {},
      db,
      log,
      idempotencyKey: (suffix = "") =>
        createHash("sha256")
          .update(`${task.moment_event_id}:${task.task_type}:${suffix}`)
          .digest("hex"),
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;

    if (outcome.status === "done") {
      await db.rpc("complete_task", {
        p_task_id: task.id, p_worker_id: config.workerId,
        p_result: (outcome.result ?? {}) as never,
      } as never);
      await recordAttempt(task, "succeeded", durationMs, null, null);
      log.info({ durationMs }, "task done");
    } else if (outcome.status === "skipped") {
      await db.rpc("skip_task", {
        p_task_id: task.id, p_worker_id: config.workerId, p_reason: outcome.reason,
      } as never);
      await recordAttempt(task, "skipped", durationMs, null, outcome.reason);
      log.info({ durationMs, reason: outcome.reason }, "task skipped");
    } else {
      const at = outcome.afterSeconds
        ? new Date(Date.now() + outcome.afterSeconds * 1000).toISOString()
        : nextAttemptAt(task.attempts, task.lane);
      await failTask(task, "retryable", outcome.reason, log, at);
      await recordAttempt(task, "retry", durationMs, "retryable", outcome.reason);
    }
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof PermanentTaskError) {
      await failTask(task, "permanent", message, log);
      await recordAttempt(task, "dead", durationMs, "permanent", message);
    } else if (err instanceof RetryableTaskError) {
      const at = err.afterSeconds
        ? new Date(Date.now() + err.afterSeconds * 1000).toISOString()
        : nextAttemptAt(task.attempts, task.lane);
      await failTask(task, "retryable", message, log, at);
      await recordAttempt(task, "retry", durationMs, "retryable", message);
    } else {
      // Unknown errors are retried but counted separately: three of them on one
      // task type inside an hour is how we learn that a provider changed
      // something under us.
      recordFailure(task.task_type);
      await failTask(task, "unknown", message, log, nextAttemptAt(task.attempts, task.lane));
      await recordAttempt(task, "failed", durationMs, "unknown", message);
      log.error({ err: message, durationMs }, "task threw an unexpected error");
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function failTask(
  task: ClaimedTaskRow,
  errorClass: string,
  message: string,
  log: typeof logger,
  at?: string,
): Promise<void> {
  const { error } = await db.rpc("fail_task", {
    p_task_id: task.id,
    p_worker_id: config.workerId,
    p_error_class: errorClass,
    p_error: message,
    p_next_attempt_at: at ?? null,
  } as never);
  if (error) log.error({ err: error.message }, "could not record failure");

  // A T-0-day failure is a product-killing event, not a log line.
  const isToday = task.scheduled_for.slice(0, 10) === new Date().toISOString().slice(0, 10);
  if (task.lane === "announce" && (errorClass === "permanent" || task.attempts >= task.max_attempts)) {
    await raiseAlert("p1", `announce_failed:${task.id}`,
      "An announcement failed on the day", message, task.org_id);
  } else if (isToday && task.attempts >= task.max_attempts) {
    await raiseAlert("p2", `task_dead:${task.id}`,
      `${task.task_type} failed on the day it was due`, message, task.org_id);
  }
}

async function recordAttempt(
  task: ClaimedTaskRow,
  outcome: string,
  durationMs: number,
  errorClass: string | null,
  error: string | null,
): Promise<void> {
  await db.from("task_attempts").insert({
    task_id: task.id, org_id: task.org_id, attempt: task.attempts,
    worker_id: config.workerId, finished_at: new Date().toISOString(),
    duration_ms: durationMs, outcome, error_class: errorClass, error,
  } as never);
}

export const LANE_SETTINGS: Record<TaskLane, { tickMs: number; batch: number; concurrency: number; leaseSeconds: number }> = {
  // 10s tick, dedicated concurrency: nothing bulk may delay a 09:00 announcement.
  announce: { tickMs: 10_000, batch: 25, concurrency: 6, leaseSeconds: 60 },
  default:  { tickMs: 20_000, batch: 50, concurrency: 8, leaseSeconds: 120 },
  slow:     { tickMs: 60_000, batch: 20, concurrency: 3, leaseSeconds: 300 },
};
