import { z } from "zod";
import { TASK_LANES } from "./enums.js";

/**
 * TRUST BOUNDARY 4: task payloads.
 *
 * A JSONB round-trip loses all type safety at the DB boundary. Parsing the
 * payload as a discriminated union at claim time is what makes the handler
 * registry type-safe and what turns a schema drift into a loud, contained
 * failure on one task rather than a crashed poller.
 */

const base = { momentEventId: z.string().uuid().optional() };

export const taskPayloadSchema = z.discriminatedUnion("taskType", [
  z.object({ taskType: z.literal("verify_details_send"), ...base,
             employeeId: z.string().uuid(), channels: z.array(z.string()).default([]) }),
  z.object({ taskType: z.literal("verify_details_remind"), ...base, employeeId: z.string().uuid() }),
  z.object({ taskType: z.literal("verify_details_finalize"), ...base, employeeId: z.string().uuid() }),
  z.object({ taskType: z.literal("select_gift"), ...base, budgetPaisa: z.number().int() }),
  z.object({ taskType: z.literal("request_approval"), ...base, amountPaisa: z.number().int() }),
  z.object({ taskType: z.literal("approval_remind"), ...base, approvalId: z.string().uuid() }),
  z.object({ taskType: z.literal("approval_auto_decide"), ...base, approvalId: z.string().uuid() }),
  z.object({ taskType: z.literal("place_order"), ...base, orderId: z.string().uuid().optional() }),
  z.object({ taskType: z.literal("order_chase"), ...base, orderId: z.string().uuid() }),
  z.object({ taskType: z.literal("order_fallback"), ...base, orderId: z.string().uuid().optional() }),
  z.object({ taskType: z.literal("prepare_announcement"), ...base }),
  z.object({ taskType: z.literal("announce"), ...base }),
  z.object({ taskType: z.literal("deliver_message"), ...base,
             channel: z.enum(["email","whatsapp","slack","in_app"]),
             audience: z.string(), recipientRef: z.string(), idempotencyKey: z.string() }),
  z.object({ taskType: z.literal("nudge_manager"), ...base }),
  z.object({ taskType: z.literal("confirm_delivery"), ...base }),
  z.object({ taskType: z.literal("collect_feedback"), ...base }),
  z.object({ taskType: z.literal("close_moment"), ...base }),
  z.object({ taskType: z.literal("reschedule_anchor"), observanceId: z.string().uuid() }),
  z.object({ taskType: z.literal("sync_slack_users"), orgId: z.string().uuid() }),
  z.object({ taskType: z.literal("sync_whatsapp_templates"), orgId: z.string().uuid() }),
  z.object({ taskType: z.literal("data_hygiene_digest"), orgId: z.string().uuid() }),
  z.object({ taskType: z.literal("billing_usage_rollup"), orgId: z.string().uuid() }),
  z.object({ taskType: z.literal("billing_generate_invoice"), orgId: z.string().uuid(),
             periodStart: z.string() }),
  z.object({ taskType: z.literal("billing_send_invoice"), invoiceId: z.string().uuid() }),
  z.object({ taskType: z.literal("billing_payment_reminder"), invoiceId: z.string().uuid() }),
  z.object({ taskType: z.literal("wallet_low_balance_alert"), orgId: z.string().uuid() }),
  z.object({ taskType: z.literal("integration_health_check"), orgId: z.string().uuid() }),
]);
export type TaskPayload = z.infer<typeof taskPayloadSchema>;

/** The row shape claim_due_tasks returns. */
export const claimedTaskSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  moment_event_id: z.string().uuid(),
  task_type: z.string(),
  lane: z.enum(TASK_LANES),
  status: z.string(),
  scheduled_for: z.string(),
  next_attempt_at: z.string(),
  attempts: z.number().int(),
  max_attempts: z.number().int(),
  late_threshold_seconds: z.number().int(),
  locked_by: z.string().nullable(),
  lease_expires_at: z.string().nullable(),
  payload: z.unknown(),
});
export type ClaimedTask = z.infer<typeof claimedTaskSchema>;

/** What a handler returns. The dispatcher, never the handler, owns state transitions. */
export type TaskOutcome =
  | { status: "done"; result?: Record<string, unknown> }
  | { status: "retry"; afterSeconds?: number; reason: string }
  | { status: "skipped"; reason: string };

export class PermanentTaskError extends Error {
  readonly errorClass = "permanent" as const;
}
export class RetryableTaskError extends Error {
  readonly errorClass = "retryable" as const;
  constructor(message: string, readonly afterSeconds?: number) { super(message); }
}
