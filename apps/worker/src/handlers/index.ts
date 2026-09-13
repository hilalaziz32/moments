import type { TaskHandler } from "../poller/types.js";
import { verifyDetailsSend } from "./verify-details.js";
import { verifyDetailsRemind } from "./verify-remind.js";
import { verifyDetailsFinalize } from "./verify-finalize.js";
import { selectGift } from "./select-gift.js";
import { requestApproval } from "./request-approval.js";
import { approvalRemind } from "./approval-remind.js";
import { approvalAutoDecide } from "./approval-auto-decide.js";
import { placeOrder } from "./place-order.js";
import { orderChase } from "./order-chase.js";
import { orderFallback } from "./order-fallback.js";
import { announce, prepareAnnouncement, nudgeManager } from "./announce.js";
import { confirmDelivery } from "./confirm-delivery.js";
import { closeMoment } from "./close-moment.js";
import { passthrough } from "./passthrough.js";

/**
 * The handler registry -- every task type the detector schedules.
 *
 * Transports (Slack, WhatsApp, Resend) are still stubbed behind send(), so
 * messages are recorded rather than delivered. Everything else is real.
 */
export const HANDLERS: Record<string, TaskHandler> = {
  verify_details_send: verifyDetailsSend,
  verify_details_remind: verifyDetailsRemind,
  verify_details_finalize: verifyDetailsFinalize,
  select_gift: selectGift,
  request_approval: requestApproval,
  approval_remind: approvalRemind,
  approval_auto_decide: approvalAutoDecide,
  place_order: placeOrder,
  order_chase: orderChase,
  order_fallback: orderFallback,
  prepare_announcement: prepareAnnouncement,
  announce,
  nudge_manager: nudgeManager,
  confirm_delivery: confirmDelivery,
  close_moment: closeMoment,

  // Needs a feedback table and page that don't exist yet. It SKIPS rather than
  // succeeds, so the timeline never claims a step ran when it didn't.
  collect_feedback: passthrough("collect_feedback"),
};
