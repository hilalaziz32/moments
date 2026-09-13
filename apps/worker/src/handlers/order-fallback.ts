import type { TaskHandler } from "../poller/types.js";
import { raiseAlert } from "../lib/alerts.js";

/**
 * T-0 08:00 -- the most important handler in the product.
 *
 * If no vendor has the physical gift by the morning of the moment, send a digital
 * one so the employee gets SOMETHING on the day. A birthday where nothing
 * happens is the failure this product cannot have; this converts it into one it
 * can survive.
 */
export const orderFallback: TaskHandler = {
  type: "order_fallback",
  lane: "default",
  leaseSeconds: 120,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, status, gift_enabled, budget_paisa, occurs_on")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event) return { status: "skipped", reason: "moment_no_longer_exists" };
    if (!event.gift_enabled || event.budget_paisa <= 0) return { status: "skipped", reason: "no_gift_expected" };
    if (["rejected", "cancelled", "skipped"].includes(event.status)) {
      return { status: "skipped", reason: "no_gift_expected" };
    }

    const { data, error } = await ctx.db.rpc("substitute_digital_gift", { p_moment_event_id: event.id });
    if (error) throw new Error(`fallback failed: ${error.message}`);

    const r = data as { ok: boolean; skipped?: string; reason?: string; product?: string; orderId?: string };

    if (r.skipped) return { status: "done", result: { fallback: false, reason: r.skipped } };

    if (!r.ok) {
      await raiseAlert("p1", `fallback_unavailable:${event.id}`,
        "No digital gift to fall back on",
        `A gift for ${event.occurs_on} is not with a vendor and there is no digital gift in the catalogue within budget. Someone will get nothing today unless ops acts now.`,
        event.org_id);
      return { status: "skipped", reason: r.reason ?? "fallback_unavailable" };
    }

    // The customer is covered, but ops missed an order. That still needs a look.
    await raiseAlert("p2", `fallback_used:${event.id}`,
      "Sent a digital gift instead",
      `The physical gift for ${event.occurs_on} was never placed with a vendor, so ${r.product} went out instead.`,
      event.org_id);

    ctx.log.warn({ product: r.product }, "digital fallback used");
    return { status: "done", result: { fallback: true, product: r.product, orderId: r.orderId } };
  },
};
