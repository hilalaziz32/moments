import cron from "node-cron";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { runDetector } from "./detector.js";
import { runReaper } from "./reaper.js";
import { runAnnouncementWatchdog, runLatenessSweep } from "./watchdog.js";

/**
 * All schedules pass { timezone } explicitly. The container runs TZ=UTC on
 * purpose -- relying on ambient timezone is how a deploy to a differently
 * configured host silently moves everyone's 9 AM.
 */
export function startCrons(): void {
  const timezone = config.timezone;

  // 00:15 local: materialise the next 45 days.
  cron.schedule("15 0 * * *", () => {
    void runDetector().catch((e) => logger.error({ err: String(e) }, "detector cron threw"));
  }, { timezone });

  // 09:10 local: did every announcement actually go out?
  cron.schedule("10 9 * * *", () => {
    void runAnnouncementWatchdog().catch((e) => logger.error({ err: String(e) }, "watchdog threw"));
  }, { timezone });

  // Every minute: recover tasks from dead workers.
  cron.schedule("* * * * *", () => {
    void runReaper().catch((e) => logger.error({ err: String(e) }, "reaper threw"));
  }, { timezone });

  // Every five minutes: anything running late anywhere.
  cron.schedule("*/5 * * * *", () => {
    void runLatenessSweep().catch((e) => logger.error({ err: String(e) }, "lateness sweep threw"));
  }, { timezone });

  logger.info({ timezone }, "crons started");
}
