import type { TaskHandler } from "../poller/types.js";
import { send } from "./channel.js";
import { smsNumber, smsSettings } from "./sms.js";

/**
 * T-1 18:00 -- pre-render everything.
 *
 * At 09:00 the announce task must be a pure network send. Resolving names,
 * channels and copy the evening before means any content problem surfaces when a
 * human is still awake to fix it, rather than as silence in the morning.
 */
export const prepareAnnouncement: TaskHandler = {
  type: "prepare_announcement",
  lane: "default",
  leaseSeconds: 120,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, occurs_on, milestone_years, announce_publicly, announcement_enabled, moment_types(key, label), employees(full_name, preferred_name, department), organizations(name)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event) return { status: "skipped", reason: "moment_no_longer_exists" };
    if (!event.announcement_enabled || !event.announce_publicly) {
      return { status: "skipped", reason: "announcement_turned_off" };
    }

    const emp = event.employees as unknown as
      { full_name: string; preferred_name: string | null; department: string | null } | null;
    const mt = event.moment_types as unknown as { key: string; label: string } | null;

    const name = emp?.preferred_name || emp?.full_name || "";
    const body = renderAnnouncement(mt?.key ?? "", name, event.milestone_years, emp?.department ?? null);

    await ctx.db
      .from("moment_events")
      .update({ announcement_payload: { body, renderedAt: new Date().toISOString() } as never } as never)
      .eq("id", event.id);

    return { status: "done", result: { rendered: true } };
  },
};

/**
 * T-0 09:00. Fan-out only: one child send per channel, so a Slack failure can
 * never block the email that would have covered for it.
 */
export const announce: TaskHandler = {
  type: "announce",
  lane: "announce",
  leaseSeconds: 60,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, employee_id, announcement_payload, announcement_enabled, announce_publicly, moment_policies(announcement_channels)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event) return { status: "skipped", reason: "moment_no_longer_exists" };
    if (!event.announcement_enabled || !event.announce_publicly) {
      return { status: "skipped", reason: "announcement_turned_off" };
    }

    const payload = event.announcement_payload as { body?: string } | null;
    const body = payload?.body;
    if (!body) {
      // prepare_announcement did not run or failed. Retry hard -- in the announce
      // lane that is 10s, 30s, 60s, 120s, not an hour.
      return { status: "retry", reason: "announcement_not_prepared", afterSeconds: 15 };
    }

    const policy = event.moment_policies as unknown as { announcement_channels: string[] } | null;
    const channels = (policy?.announcement_channels ?? ["email"]) as
      ("email" | "whatsapp" | "slack" | "in_app")[];

    let sent = 0;
    for (const channel of channels) {
      const result = await send(ctx, {
        orgId: event.org_id,
        momentEventId: event.id,
        taskId: ctx.task.id,
        employeeId: event.employee_id,
        channel,
        audience: "company_announcement",
        recipientRef: channel === "slack" ? "#general" : "everyone",
        body,
        // Per channel, so one channel succeeding never suppresses another.
        idempotencyKey: ctx.idempotencyKey(`announce:${channel}`),
      });
      if (result === "sent") sent++;
    }

    await ctx.db
      .from("moment_events")
      .update({ status: "announced" } as never)
      .eq("id", event.id);

    return { status: "done", result: { channels: channels.length, sent } };
  },
};

/**
 * T-0 09:05. Gives the manager words to send themselves.
 *
 * It NEVER sends on their behalf. A message that reads like it came from your
 * boss but did not is worse than no message at all.
 */
export const nudgeManager: TaskHandler = {
  type: "nudge_manager",
  lane: "announce",
  leaseSeconds: 60,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, employee_id, milestone_years, moment_types(key), employees(full_name, preferred_name, manager_id)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event?.employee_id) return { status: "skipped", reason: "no_employee" };

    const emp = event.employees as unknown as
      { full_name: string; preferred_name: string | null; manager_id: string | null } | null;
    if (!emp?.manager_id) return { status: "skipped", reason: "no_manager_on_record" };

    const { data: manager } = await ctx.db
      .from("employees")
      .select("work_email, preferred_name, full_name, phone_e164, whatsapp_e164")
      .eq("id", emp.manager_id)
      .single();

    const sms = await smsSettings(ctx.db, event.org_id);
    const managerPhone = sms.enabled ? smsNumber(manager) : null;
    if (!manager?.work_email && !managerPhone) return { status: "skipped", reason: "manager_has_no_email" };

    const name = emp.preferred_name || emp.full_name.split(" ")[0];
    const mt = (event.moment_types as unknown as { key: string } | null)?.key ?? "";
    const suggestion = renderManagerNote(mt, name ?? "", event.milestone_years);

    if (manager?.work_email) {
      await send(ctx, {
        orgId: event.org_id,
        momentEventId: event.id,
        taskId: ctx.task.id,
        channel: "email",
        audience: "manager_nudge",
        recipientRef: manager.work_email,
        subject: `A note for ${name} today`,
        body:
          `${name} is being celebrated today. A line from you means more than anything we send.\n\n` +
          `Here's one you can use as-is, or make your own:\n\n"${suggestion}"`,
        idempotencyKey: ctx.idempotencyKey("manager:email"),
      });
    }

    if (managerPhone) {
      // It suggests words; it never sends them as the manager.
      await send(ctx, {
        orgId: event.org_id,
        momentEventId: event.id,
        taskId: ctx.task.id,
        channel: "sms",
        audience: "manager_nudge",
        recipientRef: managerPhone,
        body: `${name} is being celebrated today. A line from you means a lot. Try: "${suggestion}"`,
        idempotencyKey: ctx.idempotencyKey("manager:sms"),
      });
    }

    return { status: "done", result: { nudged: true } };
  },
};

function renderAnnouncement(
  key: string, name: string, years: number | null, department: string | null,
): string {
  const dept = department ? ` from ${department}` : "";
  switch (key) {
    case "birthday":
      return `It's ${name}'s birthday today. Wishing you a brilliant one from all of us.`;
    case "work_anniversary":
      return years
        ? `${name}${dept} is ${years} ${years === 1 ? "year" : "years"} with us today. Thank you for all of it.`
        : `${name}${dept} marks another year with us today.`;
    case "new_hire":
      return `${name} joins us${dept} today. Say hello when you get a moment.`;
    case "promotion":
      return `${name} has been promoted. Thoroughly deserved.`;
    case "marriage":
      return `${name} is getting married. Every happiness to you both.`;
    case "new_baby":
      return `${name} has welcomed a new arrival. Congratulations to the whole family.`;
    case "farewell":
      return `Today is ${name}'s last day${dept}. Thank you for everything, and good luck.`;
    case "eid_ul_fitr":
    case "eid_ul_adha":
      return `Eid Mubarak from all of us. Wishing you and your families a joyful one.`;
    case "ramadan":
      return `Ramadan Kareem. Wishing everyone a peaceful and blessed month.`;
    default:
      return `Celebrating ${name} today.`;
  }
}

function renderManagerNote(key: string, name: string, years: number | null): string {
  switch (key) {
    case "birthday":
      return `Happy birthday, ${name}. Hope you get a proper break today.`;
    case "work_anniversary":
      return `${years} years today, ${name}. Genuinely glad you're on this team.`;
    case "new_hire":
      return `Welcome aboard, ${name}. Shout if you need anything in these first weeks.`;
    case "promotion":
      return `Congratulations, ${name}. You earned this one.`;
    case "farewell":
      return `Thank you for everything, ${name}. Keep in touch.`;
    default:
      return `Thinking of you today, ${name}.`;
  }
}
