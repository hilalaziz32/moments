import type { TaskHandler } from "../poller/types.js";

/**
 * Applies the auto-approve deadline. The sweep is global and idempotent; the
 * cron runs it every 15 minutes too, so this task is a guaranteed pass on the
 * afternoon before the moment rather than the only one.
 */
export const approvalAutoDecide: TaskHandler = {
  type: "approval_auto_decide",
  lane: "default",
  leaseSeconds: 60,

  async handle(ctx) {
    const { data, error } = await ctx.db.rpc("sweep_expired_approvals");
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as { auto_approved: number; expired: number } | undefined;
    return { status: "done", result: { autoApproved: row?.auto_approved ?? 0, expired: row?.expired ?? 0 } };
  },
};
