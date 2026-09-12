import type { TaskHandler } from "../poller/types.js";
import { verifyDetailsSend } from "./verify-details.js";
import { selectGift } from "./select-gift.js";
import { announce, prepareAnnouncement, nudgeManager } from "./announce.js";
import { closeMoment } from "./close-moment.js";
import { passthrough } from "./passthrough.js";

/**
 * The handler registry.
 *
 * Phase 3 of the build deliberately ships the pipeline with real state
 * transitions and stubbed transports. Everything here moves the moment forward
 * and records what it did; what it does NOT yet do is talk to Slack, WhatsApp or
 * Resend. That keeps the engine testable before any BSP onboarding completes.
 */
export const HANDLERS: Record<string, TaskHandler> = {
  verify_details_send: verifyDetailsSend,
  select_gift: selectGift,
  prepare_announcement: prepareAnnouncement,
  announce,
  nudge_manager: nudgeManager,
  close_moment: closeMoment,

  // Not yet implemented; they succeed quietly so the pipeline does not stall and
  // the dashboard timeline stays truthful about what has and has not run.
  verify_details_remind: passthrough("verify_details_remind"),
  verify_details_finalize: passthrough("verify_details_finalize"),
  request_approval: passthrough("request_approval"),
  approval_remind: passthrough("approval_remind"),
  approval_auto_decide: passthrough("approval_auto_decide"),
  place_order: passthrough("place_order"),
  order_chase: passthrough("order_chase"),
  order_fallback: passthrough("order_fallback"),
  confirm_delivery: passthrough("confirm_delivery"),
  collect_feedback: passthrough("collect_feedback"),
};
