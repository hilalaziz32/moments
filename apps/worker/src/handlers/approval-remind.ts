import type { TaskHandler } from "../poller/types.js";
import { config } from "../config.js";
import { send } from "./channel.js";
import { approverEmails } from "./approvers.js";

/**
 * Nudges approvers who have not answered. Links to the signed-in dashboard rather
 * than minting another bearer link: fewer live tokens, and the dashboard shows
 * the full context.
 */
export const approvalRemind: TaskHandler = {
  type: "approval_remind",
  lane: "default",
  leaseSeconds: 60,

  async handle(ctx) {
    const { data: approval } = await ctx.db
      .from("approval_requests")
      .select("id, org_id, moment_event_id, summary")
      .eq("moment_event_id", ctx.task.moment_event_id)
      .eq("status", "pending")
      .maybeSingle();

    if (!approval) return { status: "skipped", reason: "already_decided" };

    const approvers = await approverEmails(ctx.db, approval.org_id);
    for (const a of approvers) {
      await send(ctx, {
        orgId: approval.org_id,
        momentEventId: approval.moment_event_id,
        taskId: ctx.task.id,
        channel: "email",
        audience: "approval_request",
        recipientRef: a.email,
        subject: "Still waiting on an approval",
        body:
          `${approval.summary ?? "A gift"} is waiting for your decision.\n\n` +
          `Open it in Moments:\n${config.appUrl}/approvals\n\n` +
          `If nobody answers, it goes ahead automatically at the deadline.`,
        idempotencyKey: ctx.idempotencyKey(`approval-remind:${a.email}`),
      });
    }
    return { status: "done", result: { reminded: approvers.length } };
  },
};
