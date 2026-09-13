import cron from "node-cron";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { runDetector } from "./detector.js";
import { runReaper } from "./reaper.js";
import { runAnnouncementWatchdog, runLatenessSweep } from "./watchdog.js";
import { runApprovalSweep } from "./approvals.js";
import { runMonthlyBilling } from "./billing.js";
import { runMonthlyNewsPrompt, runWeeklySummary } from "./hr-digest.js";

/**
 * Every schedule passes { timezone } explicitly. The container runs TZ=UTC on
 * purpose -- relying on the ambient timezone is how a deploy to a differently
 * configured host silently moves everyone's 9 AM.
 */
export function startCrons(): void {
  const timezone = config.timezone;
  const guard = (name: string, fn: () => Promise<unknown>) => () => {
    void fn().catch((e) => logger.error({ err: String(e) }, `${name} threw`));
  };

  cron.schedule("15 0 * * *",   guard("detector", () => runDetector()), { timezone });           // 00:15 materialise 45 days
  cron.schedule("10 9 * * *",   guard("watchdog", runAnnouncementWatchdog), { timezone });       // 09:10 did 9 AM happen?
  cron.schedule("* * * * *",    guard("reaper", () => runReaper()), { timezone });               // recover dead workers
  cron.schedule("*/5 * * * *",  guard("lateness", runLatenessSweep), { timezone });              // anything running late
  cron.schedule("*/15 * * * *", guard("approvals", runApprovalSweep), { timezone });             // auto-approve deadlines
  cron.schedule("0 2 1 * *",    guard("billing", () => runMonthlyBilling()), { timezone });      // invoice last month
  cron.schedule("30 9 * * 1",   guard("weekly-summary", runWeeklySummary), { timezone });        // Mon 09:30 HR: this week
  cron.schedule("0 10 1 * *",   guard("news-prompt", runMonthlyNewsPrompt), { timezone });       // 1st 10:00 HR: any news?

  logger.info({ timezone }, "crons started");
}
