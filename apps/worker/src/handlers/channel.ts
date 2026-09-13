import { PermanentTaskError, RetryableTaskError } from "@moments/contracts";
import type { TaskContext } from "../poller/types.js";
import { sendSms, TwilioError } from "../lib/twilio.js";
import { twilioCredentials } from "../lib/twilio-credentials.js";
import { smsSettings } from "./sms.js";

/**
 * The send boundary.
 *
 * THE ROW IS WRITTEN BEFORE THE NETWORK CALL. outbound_messages has a unique
 * index on idempotency_key, so:
 *   - a duplicated task cannot produce a duplicated message
 *   - a crash between the API call and the DB write leaves a `sending` row,
 *     which the reconciler resolves by QUERYING THE PROVIDER rather than
 *     blindly resending.
 *
 * SMS is delivered through Twilio. Email, Slack and WhatsApp transports are not
 * wired yet (email is on hold until there are customers), so those sends are
 * recorded and logged rather than delivered.
 */

export type Channel = "email" | "whatsapp" | "slack" | "in_app" | "sms";

export interface SendRequest {
  orgId: string;
  momentEventId: string | null;
  taskId: string;
  employeeId?: string | null;
  channel: Channel;
  audience:
    | "company_announcement" | "manager_nudge" | "employee_dm" | "hr_digest"
    | "approval_request" | "address_verification" | "ops_alert";
  /** Email address, E.164 phone number, or Slack channel. */
  recipientRef: string;
  subject?: string | null;
  body: string;
  idempotencyKey: string;
  /** The body carries a secret (e.g. a one-time code) and must never be stored. */
  sensitive?: boolean;
}

export type SendResult = "sent" | "already_sent" | "not_delivered" | "failed";

export async function send(ctx: TaskContext, req: SendRequest): Promise<SendResult> {
  const { data: org } = await ctx.db
    .from("organizations")
    .select("dry_run_until")
    .eq("id", req.orgId)
    .single();

  const isPreview = Boolean(org?.dry_run_until && new Date(org.dry_run_until) > new Date());

  const { error } = await ctx.db.from("outbound_messages").insert({
    org_id: req.orgId,
    moment_event_id: req.momentEventId,
    task_id: req.taskId,
    employee_id: req.employeeId ?? null,
    channel: req.channel,
    audience: req.audience,
    idempotency_key: req.idempotencyKey,
    recipient_ref: req.recipientRef,
    rendered_subject: req.subject ?? null,
    rendered_body: storedBody(req, isPreview),
    status: "sending",
    is_preview: isPreview,
  } as never);

  if (error) {
    // Unique violation on idempotency_key: this message already went out, or is
    // in flight. Either way, do not send it again.
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      ctx.log.info({ channel: req.channel }, "message already sent; skipping");
      return "already_sent";
    }
    throw new PermanentTaskError(`could not record the outbound message: ${error.message}`);
  }

  if (req.channel === "sms") return deliverSms(ctx, req, isPreview);

  // TODO: email / Slack / WhatsApp transports.
  ctx.log.info(
    { channel: req.channel, audience: req.audience, isPreview },
    isPreview ? "preview recorded (dry run)" : "message recorded (transport not wired)",
  );
  await mark(ctx, req, { status: "sent", sent_at: new Date().toISOString() });
  return "sent";
}

/**
 * SMS through Twilio.
 *
 * DRY RUN: a live customer's employees must not get texts during the preview
 * week, so the message goes to the org's test phone instead -- which is also how
 * HR sees exactly what their people will receive. No test phone, no send.
 */
async function deliverSms(ctx: TaskContext, req: SendRequest, isPreview: boolean): Promise<SendResult> {
  const creds = await twilioCredentials(ctx.db, req.orgId);
  if (!creds) {
    await mark(ctx, req, { status: "suppressed", error_code: "sms_not_configured",
      error_message: "No Twilio account or sending number is set for this organisation." });
    ctx.log.warn({ audience: req.audience }, "sms not delivered: no Twilio sender for this org");
    return "not_delivered";
  }

  const settings = await smsSettings(ctx.db, req.orgId);
  const to = isPreview ? settings.testPhone : req.recipientRef;
  if (!to) {
    await mark(ctx, req, { status: "suppressed", error_code: "preview_without_test_phone",
      error_message: "Dry run is on and no test phone is set, so nothing was texted." });
    return "not_delivered";
  }

  const body = isPreview ? `[PREVIEW] ${req.body}` : req.body;

  try {
    const { sid } = await sendSms(creds, to, body, { signal: ctx.signal });
    await mark(ctx, req, { status: "sent", sent_at: new Date().toISOString(), provider_message_id: sid });
    ctx.log.info({ audience: req.audience, isPreview, source: creds.source }, "sms sent");
    return "sent";
  } catch (err) {
    if (err instanceof TwilioError && err.retryable) {
      // Twilio created nothing, so release the idempotency key and let the
      // task's retry send it again.
      await ctx.db.from("outbound_messages").delete().eq("idempotency_key", req.idempotencyKey);
      throw new RetryableTaskError(`Twilio unavailable: ${err.message}`, err.httpStatus === 429 ? 60 : 120);
    }
    // A bad or unsubscribed number will not fix itself. Record it and carry on:
    // one unreachable phone must not fail the whole moment.
    const e = err instanceof TwilioError ? err : null;
    await mark(ctx, req, {
      status: "failed",
      failed_at: new Date().toISOString(),
      error_code: e?.code ? String(e.code) : "sms_failed",
      error_message: err instanceof Error ? err.message : String(err),
    });
    ctx.log.warn({ audience: req.audience, code: e?.code }, "sms rejected by Twilio");
    return "failed";
  }
}

async function mark(ctx: TaskContext, req: SendRequest, patch: Record<string, unknown>): Promise<void> {
  await ctx.db
    .from("outbound_messages")
    .update(patch as never)
    .eq("idempotency_key", req.idempotencyKey);
}

/**
 * What we keep of a message body.
 *
 * outbound_messages is readable by every member of the org -- that is how HR sees
 * what went out. So tokenised links and one-time codes must never land in it: a
 * colleague with viewer access could otherwise open someone's address form, or
 * approve a gift, straight from the message log.
 */
const TOKEN_LINK = /\/(a|c|f|i)\/mt1_[A-Za-z0-9_-]{43}/g;

function storedBody(req: SendRequest, isPreview: boolean): string {
  if (req.sensitive) return "[contains a one-time code, not stored]";
  const body = req.body.replace(TOKEN_LINK, "/$1/[private link]");
  return isPreview ? `[PREVIEW] ${body}` : body;
}
