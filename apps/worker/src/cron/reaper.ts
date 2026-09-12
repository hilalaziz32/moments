import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

/**
 * Recovers tasks whose worker died mid-flight.
 *
 * The attempt counter was already burned at CLAIM time, so a task that crashes
 * the process cannot crash-loop forever: once it exhausts max_attempts the RPC
 * sends it straight to `dead` rather than back to `pending`.
 */
export async function runReaper(graceSeconds = 30): Promise<void> {
  const { data, error } = await db.rpc("reap_expired_leases", {
    p_grace_seconds: graceSeconds,
  } as never);

  if (error) {
    logger.error({ err: error.message }, "reaper failed");
    return;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { requeued: number; quarantined: number }
    | undefined;

  if (row && (row.requeued > 0 || row.quarantined > 0)) {
    logger.warn({ ...row }, "reaped expired leases");
  }
}
