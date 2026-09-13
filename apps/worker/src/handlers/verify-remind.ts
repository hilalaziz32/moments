import type { TaskHandler } from "../poller/types.js";
import { config } from "../config.js";
import { send } from "./channel.js";
import { mintToken } from "./tokens.js";

/** T-5: one reminder if the employee has not confirmed their details yet. */
export const verifyDetailsRemind: TaskHandler = {
  type: "verify_details_remind",
  lane: "default",
  leaseSeconds: 120,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, employee_id, status, employees(full_name, preferred_name, work_email, personal_email)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event?.employee_id) return { status: "skipped", reason: "no_employee" };
    if (event.status !== "needs_info") return { status: "skipped", reason: "details_already_confirmed" };

    const emp = event.employees as unknown as {
      full_name: string; preferred_name: string | null;
      work_email: string | null; personal_email: string | null;
    } | null;
    const recipient = emp?.work_email ?? emp?.personal_email;
    if (!recipient) return { status: "skipped", reason: "employee_has_no_email" };

    // The first link's plaintext is gone, so a reminder needs its own link.
    const link = mintToken();
    const { error } = await ctx.db.from("action_tokens").insert({
      org_id: event.org_id,
      purpose: "address_verification",
      token_hash: link.hashHex,
      token_lookup: link.lookup,
      subject_type: "employee",
      subject_id: event.employee_id,
      moment_event_id: event.id,
      issued_to_email: recipient,
      expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      max_uses: 25,
    });
    if (error) throw new Error(`could not mint the reminder link: ${error.message}`);

    const first = emp?.preferred_name || emp?.full_name?.split(" ")[0] || "there";
    await send(ctx, {
      orgId: event.org_id,
      momentEventId: event.id,
      taskId: ctx.task.id,
      employeeId: event.employee_id,
      channel: "email",
      audience: "address_verification",
      recipientRef: recipient,
      subject: "Still need your delivery address",
      body:
        `Hi ${first},\n\nWe still don't know where to send something your team has planned. ` +
        `It takes thirty seconds:\n${config.appUrl}/c/${link.token}`,
      idempotencyKey: ctx.idempotencyKey("email:verify-remind"),
    });

    return { status: "done", result: { reminded: true } };
  },
};
