import { PermanentTaskError } from "@moments/contracts";
import type { TaskContext } from "../poller/types.js";

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
 * Slack / WhatsApp / email transports are not wired yet. Until they are, a send
 * is recorded and logged rather than delivered -- which is also exactly what
 * dry-run mode does for a live org, so the path is the same one production uses.
 */

export interface SendRequest {
  orgId: string;
  momentEventId: string | null;
  taskId: string;
  employeeId?: string | null;
  channel: "email" | "whatsapp" | "slack" | "in_app";
  audience:
    | "company_announcement" | "manager_nudge" | "employee_dm" | "hr_digest"
    | "approval_request" | "address_verification" | "ops_alert";
  recipientRef: string;
  subject?: string | null;
  body: string;
  idempotencyKey: string;
  /** The body carries a secret (e.g. a one-time code) and must never be stored. */
  sensitive?: boolean;
}

export async function send(ctx: TaskContext, req: SendRequest): Promise<"sent" | "already_sent"> {
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

  // TODO(phase-4): dispatch to Slack / WhatsApp / Resend here, then record the
  // provider message id so the reconciler can verify rather than resend.
  ctx.log.info(
    { channel: req.channel, audience: req.audience, isPreview },
    isPreview ? "preview recorded (dry run)" : "message queued (transport not yet wired)",
  );

  await ctx.db
    .from("outbound_messages")
    .update({ status: "sent", sent_at: new Date().toISOString() } as never)
    .eq("idempotency_key", req.idempotencyKey);

  return "sent";
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
