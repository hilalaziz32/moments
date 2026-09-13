import { randomUUID } from "node:crypto";
import { PermanentTaskError } from "@moments/contracts";
import { formatPKR } from "@moments/core/money";
import type { TaskHandler } from "../poller/types.js";
import { config } from "../config.js";
import { send } from "./channel.js";
import { mintToken, hashSecret, sixDigitCode } from "./tokens.js";
import { approverEmails } from "./approvers.js";
import { smsSettings } from "./sms.js";
import { formatDay } from "./format.js";

/** Above this, a bare click on a forwardable link is not enough. PKR 10,000. */
const OTP_THRESHOLD_PAISA = 1_000_000;

/**
 * T-2: ask HR to approve the spend.
 *
 * Retry-safe. If the request row exists but its email never went out, the old
 * link's plaintext is gone for good -- so we retire that token, mint a new one,
 * and send. If the email did go out, we stop.
 */
export const requestApproval: TaskHandler = {
  type: "request_approval",
  lane: "default",
  leaseSeconds: 120,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, status, occurs_on, announce_at, budget_paisa, approval_required, policy_id, metadata, employees(full_name, preferred_name), moment_types(label)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event) return { status: "skipped", reason: "moment_no_longer_exists" };
    if (!event.approval_required) return { status: "skipped", reason: "approval_not_required" };
    if (["approved", "rejected", "cancelled", "skipped", "delivered", "completed"].includes(event.status)) {
      return { status: "skipped", reason: "already_decided" };
    }

    const approvers = await approverEmails(ctx.db, event.org_id);
    if (approvers.length === 0) {
      // Retrying will not create an HR admin.
      throw new PermanentTaskError("organisation has no owner, admin or HR manager with an email address");
    }

    const emp = event.employees as unknown as { full_name: string; preferred_name: string | null } | null;
    const name = emp?.preferred_name || emp?.full_name || "your team";
    const label = (event.moment_types as unknown as { label: string } | null)?.label ?? "celebration";
    const meta = (event.metadata ?? {}) as { selectedName?: string; selectedPricePaisa?: number };
    const amount = meta.selectedPricePaisa ?? event.budget_paisa;

    const { data: existing } = await ctx.db
      .from("approval_requests")
      .select("id, token_id")
      .eq("moment_event_id", event.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      const { data: sentBefore } = await ctx.db
        .from("outbound_messages")
        .select("id")
        .eq("moment_event_id", event.id)
        .eq("audience", "approval_request")
        .limit(1);
      if ((sentBefore ?? []).length > 0) {
        return { status: "done", result: { approvalId: existing.id, reused: true } };
      }
    }

    const { data: policy } = event.policy_id
      ? await ctx.db.from("moment_policies").select("auto_approve_after_hours").eq("id", event.policy_id).maybeSingle()
      : { data: null };
    const hours: number = policy?.auto_approve_after_hours ?? 24;

    const now = Date.now();
    // A decision is only useful before the day. If the moment is already that
    // close, give people two hours rather than a link that is born expired.
    const dayOf = new Date(event.announce_at ?? `${event.occurs_on}T04:00:00Z`).getTime();
    const expiresAt = new Date(Math.max(dayOf, now + 2 * 3_600_000));
    const autoApproveAt = new Date(Math.min(now + hours * 3_600_000, expiresAt.getTime() - 60_000));

    const link = mintToken();
    const tokenId = randomUUID();
    const approvalId: string = existing?.id ?? randomUUID();
    const requiresOtp = amount >= OTP_THRESHOLD_PAISA;
    const otp = requiresOtp ? sixDigitCode() : null;

    const { error: tokenError } = await ctx.db.from("action_tokens").insert({
      id: tokenId,
      org_id: event.org_id,
      purpose: "approval",
      token_hash: link.hashHex,
      token_lookup: link.lookup,
      subject_type: "approval_request",
      subject_id: approvalId,
      moment_event_id: event.id,
      issued_to_email: approvers[0]!.email,
      expires_at: expiresAt.toISOString(),
      max_uses: 20,
    });
    if (tokenError) throw new Error(`could not mint the approval link: ${tokenError.message}`);

    if (existing) {
      if (existing.token_id) {
        await ctx.db
          .from("action_tokens")
          .update({ revoked_at: new Date().toISOString(), revoked_reason: "reissued" })
          .eq("id", existing.token_id);
      }
      await ctx.db
        .from("approval_requests")
        .update({
          token_id: tokenId,
          otp_hash: otp ? hashSecret(otp) : null,
          otp_expires_at: otp ? expiresAt.toISOString() : null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      const { error } = await ctx.db.from("approval_requests").insert({
        id: approvalId,
        org_id: event.org_id,
        moment_event_id: event.id,
        task_id: ctx.task.id,
        requested_amount_paisa: amount,
        budget_paisa: event.budget_paisa,
        summary: meta.selectedName ? `${meta.selectedName} for ${name}` : `Gift for ${name}`,
        approver_kind: "hr",
        approver_email: approvers[0]!.email,
        channel: "email",
        token_id: tokenId,
        requires_otp: requiresOtp,
        otp_hash: otp ? hashSecret(otp) : null,
        otp_expires_at: otp ? expiresAt.toISOString() : null,
        expires_at: expiresAt.toISOString(),
        auto_approve_at: autoApproveAt.toISOString(),
        sent_at: new Date().toISOString(),
      });
      if (error) throw new Error(`could not create the approval request: ${error.message}`);
    }

    await ctx.db
      .from("moment_events")
      .update({ status: "awaiting_approval" })
      .eq("id", event.id)
      .in("status", ["detected", "scheduled", "needs_info", "fulfilling"]);

    const url = `${config.appUrl}/a/${link.token}`;
    const pick = meta.selectedName
      ? `We've picked ${meta.selectedName}, ${formatPKR(amount)} (budget ${formatPKR(event.budget_paisa)}).`
      : `The budget is ${formatPKR(event.budget_paisa)}.`;

    const sms = await smsSettings(ctx.db, event.org_id);

    for (const a of approvers) {
      if (sms.enabled && a.phone) {
        await send(ctx, {
          orgId: event.org_id,
          momentEventId: event.id,
          taskId: ctx.task.id,
          channel: "sms",
          audience: "approval_request",
          recipientRef: a.phone,
          body: `Approve a ${formatPKR(amount)} gift for ${name}'s ${label.toLowerCase()}? ${url}`,
          idempotencyKey: ctx.idempotencyKey(`approval-sms:${tokenId}:${a.phone}`),
        });
        if (otp) {
          // A separate message from the link, so a forwarded link alone can't
          // approve a large amount.
          await send(ctx, {
            orgId: event.org_id,
            momentEventId: event.id,
            taskId: ctx.task.id,
            channel: "sms",
            audience: "approval_request",
            recipientRef: a.phone,
            body: `Your Moments approval code is ${otp}. Don't share it.`,
            idempotencyKey: ctx.idempotencyKey(`approval-code-sms:${tokenId}:${a.phone}`),
            sensitive: true,
          });
        }
      }

      await send(ctx, {
        orgId: event.org_id,
        momentEventId: event.id,
        taskId: ctx.task.id,
        channel: "email",
        audience: "approval_request",
        recipientRef: a.email,
        subject: `Approve a gift for ${name}?`,
        body:
          `${name}'s ${label.toLowerCase()} is on ${formatDay(event.occurs_on)}.\n\n${pick}\n\n` +
          `Approve or decline:\n${url}\n\n` +
          `If nobody answers by ${formatDay(autoApproveAt.toISOString())}, it goes ahead automatically.`,
        idempotencyKey: ctx.idempotencyKey(`approval:${tokenId}:${a.email}`),
      });

      if (otp) {
        await send(ctx, {
          orgId: event.org_id,
          momentEventId: event.id,
          taskId: ctx.task.id,
          channel: "email",
          audience: "approval_request",
          recipientRef: a.email,
          subject: "Your approval code",
          body:
            `Your code is ${otp}.\n\nYou'll need it to approve the ${formatPKR(amount)} gift for ${name}. ` +
            `It comes separately from the link, so forwarding that email alone can't approve a large amount.`,
          idempotencyKey: ctx.idempotencyKey(`approval-code:${tokenId}:${a.email}`),
          sensitive: true,
        });
      }
    }

    return { status: "done", result: { approvalId, approvers: approvers.length, requiresOtp } };
  },
};
