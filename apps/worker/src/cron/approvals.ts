import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

export async function runApprovalSweep(): Promise<void> {
  const { data, error } = await db.rpc("sweep_expired_approvals");
  if (error) {
    logger.error({ err: error.message }, "approval sweep failed");
    return;
  }
  const row = (Array.isArray(data) ? data[0] : data) as { auto_approved: number; expired: number } | undefined;
  if (row && (row.auto_approved > 0 || row.expired > 0)) logger.info({ ...row }, "approvals swept");
}
