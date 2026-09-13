import type { TaskHandler } from "../poller/types.js";
import { raiseAlert } from "../lib/alerts.js";

/** T-1: make sure ops actually placed the order while there is still time. */
export const orderChase: TaskHandler = {
  type: "order_chase",
  lane: "default",
  leaseSeconds: 60,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, status, gift_enabled, budget_paisa, occurs_on")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event) return { status: "skipped", reason: "moment_no_longer_exists" };
    if (!event.gift_enabled || event.budget_paisa <= 0 || ["rejected", "cancelled", "skipped"].includes(event.status)) {
      return { status: "skipped", reason: "no_gift_expected" };
    }

    const { data: order } = await ctx.db
      .from("gift_orders")
      .select("id, order_number, status")
      .eq("moment_event_id", event.id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (!order) {
      await raiseAlert("p2", `order_missing:${event.id}`,
        "A gift was never ordered",
        `The moment on ${event.occurs_on} has no order. The same-day backup will send a digital gift unless one is placed.`,
        event.org_id);
      return { status: "done", result: { chased: true, order: null } };
    }

    if (order.status === "queued_for_ops" || order.status === "approved") {
      await raiseAlert("p2", `order_not_placed:${order.id}`,
        `${order.order_number} hasn't been placed with a vendor`,
        `It's due on ${event.occurs_on}. Place it today, or the digital backup replaces it on the morning.`,
        event.org_id);
      return { status: "done", result: { chased: true, order: order.order_number } };
    }

    return { status: "done", result: { chased: false, orderStatus: order.status } };
  },
};
