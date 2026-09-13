/**
 * Display formatting shared across the app.
 *
 * Calendar dates (a birthday) are formatted from the string, never through a
 * Date, so they cannot drift a day across timezones. Instants (when a task ran)
 * are formatted in the organisation's timezone.
 */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** "28 Sep 2026" from an ISO date. */
export function formatDate(iso: string, opts: { year?: boolean } = {}): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  const base = `${Number(d)} ${MONTHS[Number(m) - 1]}`;
  return opts.year === false ? base : `${base} ${y}`;
}

/** "28 Sep" for an instant, in the given timezone. */
export function formatDayInZone(iso: string, timeZone = "Asia/Karachi"): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" }).format(new Date(iso));
}

/** "28 Sep, 9:00 am" in the given timezone. */
export function formatDateTime(iso: string, timeZone = "Asia/Karachi"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

export function humanize(value: string): string {
  const s = value.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const MOMENT_STATUS_LABEL: Record<string, string> = {
  detected: "Scheduled",
  scheduled: "Scheduled",
  needs_info: "Waiting for their details",
  awaiting_approval: "Waiting for approval",
  approved: "Approved",
  rejected: "Declined",
  fulfilling: "Gift on order",
  delivered: "Delivered",
  announced: "Announced",
  completed: "Done",
  skipped: "Skipped",
  cancelled: "Cancelled",
  failed: "Needs attention",
};

export const TASK_LABEL: Record<string, string> = {
  verify_details_send: "Ask for delivery details",
  verify_details_remind: "Remind about details",
  verify_details_finalize: "Close the details window",
  select_gift: "Pick a gift",
  request_approval: "Ask for approval",
  approval_remind: "Remind approvers",
  approval_auto_decide: "Approval deadline",
  place_order: "Order the gift",
  order_chase: "Check the order was placed",
  order_fallback: "Same-day backup",
  prepare_announcement: "Write the message",
  announce: "Post the announcement",
  nudge_manager: "Send the manager a note",
  confirm_delivery: "Confirm delivery",
  collect_feedback: "Ask how it went",
  close_moment: "Wrap up",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_selection: "Choosing",
  awaiting_approval: "Waiting for approval",
  approved: "Approved",
  queued_for_ops: "Being ordered",
  placed_with_vendor: "Ordered",
  in_transit: "On the way",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const AUDIENCE_LABEL: Record<string, string> = {
  company_announcement: "Announcement",
  manager_nudge: "Note for the manager",
  employee_dm: "Message to them",
  hr_digest: "HR digest",
  approval_request: "Approval request",
  address_verification: "Details request",
  ops_alert: "Ops alert",
};

const SKIP_REASON: Record<string, string> = {
  approval_not_required: "No approval needed for this one",
  announcement_turned_off: "The announcement is turned off",
  gifts_disabled_for_this_moment: "No gift for this kind of moment",
  no_gift_expected: "No gift expected",
  no_budget_set: "No budget set",
  no_product_fits_budget: "Nothing in the catalogue fits the budget. Our team has been told.",
  no_gift_selected: "No gift was picked",
  details_already_confirmed: "They'd already confirmed",
  already_decided: "Already decided",
  already_ordered: "Already ordered",
  approval_declined: "Approval was declined",
  approval_expired_unanswered: "Nobody answered the approval in time",
  no_manager_on_record: "No manager on record",
  manager_has_no_email: "Their manager has no email on file",
  employee_has_no_email: "They have no email on file",
  no_employee: "Not tied to one person",
  org_wide_moment_has_no_employee: "Not tied to one person",
  no_order: "No order to confirm",
  moment_no_longer_exists: "The moment was removed",
  moment_cancelled: "The moment was cancelled",
  moment_skipped: "The moment was skipped",
};

/** Why a step did not run, in words an HR admin can act on. */
export function skipReason(reason: string | null | undefined): string {
  if (!reason) return "Skipped";
  if (reason.endsWith("_not_implemented")) return "Not switched on yet";
  return SKIP_REASON[reason] ?? humanize(reason);
}
