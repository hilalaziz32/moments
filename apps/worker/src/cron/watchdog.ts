import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { raiseAlert } from "../poller/dispatch.js";

/**
 * The 09:10 PKT watchdog.
 *
 * This is the single most important monitor in the product. A missed birthday is
 * silent -- no exception, no 500, just nothing happening -- so something has to
 * go looking for it. Any announce task due today that is not succeeded or
 * skipped by 09:10 is a P1 page.
 */
export async function runAnnouncementWatchdog(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await db
    .from("moment_tasks")
    .select("id, org_id, moment_event_id, status, scheduled_for, attempts, last_error")
    .eq("lane", "announce")
    .gte("scheduled_for", `${today}T00:00:00Z`)
    .lte("scheduled_for", `${today}T23:59:59Z`)
    .not("status", "in", "(succeeded,skipped,cancelled)");

  if (error) {
    logger.error({ err: error.message }, "watchdog query failed");
    return;
  }

  const late = (data ?? []).filter((t) => new Date(t.scheduled_for).getTime() < Date.now());
  if (late.length === 0) {
    logger.info({ checked: (data ?? []).length }, "watchdog clear");
    return;
  }

  logger.error({ count: late.length }, "ANNOUNCEMENTS ARE LATE");
  for (const t of late) {
    await raiseAlert(
      "p1",
      `announce_late:${t.id}`,
      "An announcement is late",
      `Task ${t.id} was due ${t.scheduled_for} and is still ${t.status} after ${t.attempts} attempts. ${t.last_error ?? ""}`,
      t.org_id,
    );
  }
}

/** Generic lateness sweep for every other lane, run every few minutes. */
export async function runLatenessSweep(): Promise<void> {
  const { data, error } = await db
    .from("v_task_health")
    .select("id, org_id, task_type, scheduled_for, attempts")
    .eq("is_late", true)
    .limit(50);

  if (error) {
    logger.error({ err: error.message }, "lateness sweep failed");
    return;
  }
  if ((data ?? []).length === 0) return;

  logger.warn({ count: data!.length }, "tasks running late");
  await raiseAlert("p3", `tasks_late:${new Date().toISOString().slice(0, 13)}`,
    `${data!.length} tasks are running late`,
    data!.slice(0, 10).map((t) => `${t.task_type} due ${t.scheduled_for}`).join("\n"));
}
