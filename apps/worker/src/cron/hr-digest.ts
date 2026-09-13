import { addDays } from "@moments/core/schedule";
import { smsText } from "@moments/core/messages";
import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";
import { send } from "../handlers/channel.js";
import { smsSettings } from "../handlers/sms.js";
import { approverEmails } from "../handlers/approvers.js";
import type { TaskContext } from "../poller/types.js";

/**
 * The two texts HR gets from us, so they never have to open the app to know
 * what's happening:
 *
 *   Monday 09:30  what's being celebrated this week, and anything stuck
 *   1st, 10:00    "any promotions, weddings, babies or people leaving?"
 *
 * The second one is how the moments no spreadsheet has actually reach us.
 * Both go only to owners/admins/HR with a phone on their profile, only for
 * orgs with SMS on, and are idempotent per person per week/month.
 */

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cronContext(): TaskContext {
  return {
    task: {} as TaskContext["task"],
    payload: {},
    db,
    log: logger,
    idempotencyKey: (suffix = "") => suffix,
    signal: AbortSignal.timeout(30_000),
  };
}

async function recipients(orgId: string) {
  const settings = await smsSettings(db, orgId);
  if (!settings.enabled) return [];
  return (await approverEmails(db, orgId)).filter((p): p is typeof p & { phone: string } => Boolean(p.phone));
}

async function liveOrgs() {
  const { data } = await db
    .from("organizations")
    .select("id, name, timezone")
    .in("status", ["trial", "active"])
    .is("deleted_at", null);
  return (data ?? []) as { id: string; name: string; timezone: string }[];
}

export async function runWeeklySummary(): Promise<void> {
  let sent = 0;
  for (const org of await liveOrgs()) {
    try {
      const people = await recipients(org.id);
      if (people.length === 0) continue;

      const today = new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(new Date());
      const [{ data: events }, { count: needsYou }] = await Promise.all([
        db.from("moment_events")
          .select("occurs_on, milestone_years, employees(full_name, preferred_name), moment_types(label)")
          .eq("org_id", org.id).gte("occurs_on", today).lte("occurs_on", addDays(today, 6))
          .not("status", "in", "(cancelled,skipped)").order("occurs_on"),
        db.from("moment_events").select("id", { count: "exact", head: true })
          .eq("org_id", org.id).in("status", ["needs_info", "awaiting_approval", "failed"]),
      ]);

      const items = (events ?? []).map((e) => {
        const emp = e.employees as unknown as { full_name: string; preferred_name: string | null } | null;
        const label = (e.moment_types as unknown as { label: string } | null)?.label ?? "moment";
        const who = emp ? emp.preferred_name || emp.full_name.split(" ")[0] : org.name;
        const what = e.milestone_years ? `${e.milestone_years}-year anniversary` : label.toLowerCase();
        return `${who}'s ${what} ${DAY[new Date(`${e.occurs_on}T00:00:00Z`).getUTCDay()]}`;
      });
      // Silence is fine. A text saying "nothing happening" every week is how
      // people learn to ignore us.
      if (items.length === 0 && !needsYou) continue;

      const body = smsText.weeklySummary(org.name, items, needsYou ?? 0, `${config.appUrl}/dashboard`);
      for (const p of people) {
        const r = await send(cronContext(), {
          orgId: org.id, momentEventId: null, taskId: null, channel: "sms", audience: "hr_digest",
          recipientRef: p.phone, body, idempotencyKey: `digest:weekly:${org.id}:${today}:${p.phone}`,
        });
        if (r === "sent") sent++;
      }
    } catch (err) {
      logger.error({ org_id: org.id, err: String(err) }, "weekly summary failed for org");
    }
  }
  logger.info({ sent }, "weekly summaries done");
}

export async function runMonthlyNewsPrompt(): Promise<void> {
  let sent = 0;
  for (const org of await liveOrgs()) {
    try {
      const people = await recipients(org.id);
      if (people.length === 0) continue;
      const month = new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(new Date()).slice(0, 7);
      const body = smsText.monthlyNews(org.name, `${config.appUrl}/employees`);
      for (const p of people) {
        const r = await send(cronContext(), {
          orgId: org.id, momentEventId: null, taskId: null, channel: "sms", audience: "hr_digest",
          recipientRef: p.phone, body, idempotencyKey: `digest:monthly:${org.id}:${month}:${p.phone}`,
        });
        if (r === "sent") sent++;
      }
    } catch (err) {
      logger.error({ org_id: org.id, err: String(err) }, "monthly news prompt failed for org");
    }
  }
  logger.info({ sent }, "monthly news prompts done");
}
