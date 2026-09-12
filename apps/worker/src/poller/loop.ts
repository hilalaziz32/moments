import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";
import { dispatchBatch, LANE_SETTINGS } from "./dispatch.js";
import type { ClaimedTaskRow, TaskLane } from "./types.js";

/**
 * One polling loop per lane.
 *
 * Lane separation is the load-shedding mechanism: four hundred queued address
 * verification emails cannot delay a 09:00 announcement, because they do not
 * compete for the same claim or the same concurrency budget.
 */

const timers: NodeJS.Timeout[] = [];
let stopping = false;

async function tick(lane: TaskLane): Promise<void> {
  const s = LANE_SETTINGS[lane];
  const { data, error } = await db.rpc("claim_due_tasks", {
    p_lane: lane,
    p_limit: s.batch,
    p_lease_seconds: s.leaseSeconds,
    p_worker_id: config.workerId,
  } as never);

  if (error) {
    logger.error({ lane, err: error.message }, "claim failed");
    return;
  }

  const tasks = (data ?? []) as unknown as ClaimedTaskRow[];
  if (tasks.length === 0) return;

  logger.info({ lane, count: tasks.length }, "claimed tasks");
  await dispatchBatch(tasks, s.concurrency);
}

export function startPoller(): void {
  for (const lane of ["announce", "default", "slow"] as const) {
    const s = LANE_SETTINGS[lane];
    let running = false;

    const run = async () => {
      if (running || stopping) return;   // never overlap a tick with itself
      running = true;
      try {
        await tick(lane);
      } catch (err) {
        logger.error({ lane, err: err instanceof Error ? err.message : String(err) }, "poller tick threw");
      } finally {
        running = false;
      }
    };

    timers.push(setInterval(run, s.tickMs));
    void run();
    logger.info({ lane, ...s }, "poller lane started");
  }
}

export function stopPoller(): void {
  stopping = true;
  for (const t of timers) clearInterval(t);
  timers.length = 0;
}
