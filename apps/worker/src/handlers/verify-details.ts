import { randomBytes, createHash } from "node:crypto";
import { PermanentTaskError } from "@moments/contracts";
import type { TaskHandler } from "../poller/types.js";
import { send } from "./channel.js";
import { smsNumber, smsSettings } from "./sms.js";
import { config } from "../config.js";

/**
 * T-7: ask the employee to confirm where the gift should go.
 *
 * Mints an opaque token -- NOT a JWT: JWTs cannot be revoked, cannot be made
 * single-use, and need a DB lookup anyway. The plaintext is never stored; we
 * keep a sha256 plus an indexed 12-character prefix for O(1) lookup before the
 * timing-safe compare.
 *
 * The same link goes by email and, when the org has SMS on, by text: in
 * Pakistan a text is read within minutes, an email to a personal inbox often
 * never.
 */
export const verifyDetailsSend: TaskHandler = {
  type: "verify_details_send",
  lane: "default",
  leaseSeconds: 120,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, employee_id, occurs_on, organizations(name), employees(full_name, preferred_name, work_email, personal_email, phone_e164, whatsapp_e164)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event?.employee_id) {
      return { status: "skipped", reason: "org_wide_moment_has_no_employee" };
    }

    const emp = event.employees as unknown as {
      full_name: string; preferred_name: string | null;
      work_email: string | null; personal_email: string | null;
      phone_e164: string | null; whatsapp_e164: string | null;
    } | null;
    const orgName = (event.organizations as unknown as { name: string } | null)?.name ?? "Your team";

    const email = emp?.work_email ?? emp?.personal_email ?? null;
    const sms = await smsSettings(ctx.db, event.org_id);
    const phone = sms.enabled ? smsNumber(emp) : null;

    if (!email && !phone) {
      // No way to reach them at all. Retrying will not conjure an address.
      throw new PermanentTaskError("employee has no email address or phone number on file");
    }

    const token = `mt1_${randomBytes(32).toString("base64url")}`;
    const tokenHash = createHash("sha256").update(token).digest();

    const { error: tokenError } = await ctx.db.from("action_tokens").insert({
      org_id: event.org_id,
      purpose: "address_verification",
      token_hash: `\\x${tokenHash.toString("hex")}` as never,
      token_lookup: token.slice(0, 12),
      subject_type: "employee",
      subject_id: event.employee_id,
      moment_event_id: event.id,
      issued_to_email: email,
      issued_to_phone: phone,
      // Live from T-7 until the evening before, and REUSABLE: people open the
      // link on a phone, then a desktop, then again to fix a typo.
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      max_uses: 25,
    } as never);

    if (tokenError) throw new Error(`could not mint the confirmation link: ${tokenError.message}`);

    const name = emp?.preferred_name || emp?.full_name?.split(" ")[0] || "there";
    const url = `${config.appUrl}/c/${token}`;
    const sentVia: string[] = [];

    if (email) {
      await send(ctx, {
        orgId: event.org_id,
        momentEventId: event.id,
        taskId: ctx.task.id,
        employeeId: event.employee_id,
        channel: "email",
        audience: "address_verification",
        recipientRef: email,
        subject: "Quick check on your delivery address",
        body:
          `Hi ${name},\n\n` +
          `We've got something coming your way. Confirm where to send it:\n` +
          `${url}\n\n` +
          `Takes about thirty seconds. You can change it any time before the day.`,
        idempotencyKey: ctx.idempotencyKey("email:verify"),
      });
      sentVia.push("email");
    }

    if (phone) {
      const result = await send(ctx, {
        orgId: event.org_id,
        momentEventId: event.id,
        taskId: ctx.task.id,
        employeeId: event.employee_id,
        channel: "sms",
        audience: "address_verification",
        recipientRef: phone,
        body: `Hi ${name}, ${orgName} has something on the way for you. Confirm your delivery address: ${url}`,
        idempotencyKey: ctx.idempotencyKey("sms:verify"),
      });
      if (result === "sent" || result === "already_sent") sentVia.push("sms");
    }

    await ctx.db
      .from("moment_events")
      .update({ status: "needs_info" } as never)
      .eq("id", event.id)
      .eq("status", "scheduled");

    return { status: "done", result: { sentTo: "employee", channels: sentVia } };
  },
};
