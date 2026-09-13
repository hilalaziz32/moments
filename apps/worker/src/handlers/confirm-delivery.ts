import type { TaskHandler } from "../poller/types.js";
import { raiseAlert } from "../lib/alerts.js";

/** T-0 17:00: an order that is still "on the way" at end of day needs a human. */
export const confirmDelivery: TaskHandler = {
  type: "confirm_delivery",
  lane: "default",
  leaseSeconds: 60,

  async handle(ctx) {
    const { data: order } = await ctx.db
      .from("gift_orders")
      .select("id, org_id, order_number, status, deliver_on")
      .eq("moment_event_id", ctx.task.moment_event_id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (!order) return { status: "skipped", reason: "no_order" };
    if (order.status === "delivered") return { status: "done", result: { delivered: true } };

    if (order.status === "placed_with_vendor" || order.status === "in_transit") {
      await raiseAlert("p3", `confirm_delivery:${order.id}`,
        `Confirm delivery for ${order.order_number}`,
        `It was due ${order.deliver_on} and is still marked ${order.status.replace(/_/g, " ")}. Check with the vendor and mark it delivered or failed.`,
        order.org_id);
    }
    return { status: "done", result: { delivered: false, status: order.status } };
  },
};
