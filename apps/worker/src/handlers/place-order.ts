import type { TaskHandler } from "../poller/types.js";

/**
 * T-2 14:00: turn the selected gift into a real order in the ops queue.
 *
 * v1 is ops-assisted: this creates the order record; a person places it with the
 * vendor. If approval is still pending we come back just after the auto-approve
 * deadline, when an answer is guaranteed to exist, rather than polling hourly and
 * burning the retry budget.
 */
export const placeOrder: TaskHandler = {
  type: "place_order",
  lane: "default",
  leaseSeconds: 120,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, status, approval_required, gift_enabled, budget_paisa, gift_order_id, metadata")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event) return { status: "skipped", reason: "moment_no_longer_exists" };
    if (!event.gift_enabled || event.budget_paisa <= 0) {
      return { status: "skipped", reason: "gifts_disabled_for_this_moment" };
    }
    if (event.gift_order_id) return { status: "skipped", reason: "already_ordered" };
    if (event.status === "rejected") return { status: "skipped", reason: "approval_declined" };

    if (event.approval_required && event.status !== "approved") {
      const { data: latest } = await ctx.db
        .from("approval_requests")
        .select("status, auto_approve_at")
        .eq("moment_event_id", event.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest?.status === "expired") return { status: "skipped", reason: "approval_expired_unanswered" };

      const waitSeconds = latest?.auto_approve_at
        ? Math.max(300, Math.ceil((new Date(latest.auto_approve_at).getTime() - Date.now()) / 1000) + 300)
        : 3600;
      return { status: "retry", reason: "waiting_for_approval", afterSeconds: waitSeconds };
    }

    const meta = (event.metadata ?? {}) as { selectedProductId?: string };
    if (!meta.selectedProductId) return { status: "skipped", reason: "no_gift_selected" };

    const { data: orderId, error } = await ctx.db.rpc("create_gift_order", {
      p_moment_event_id: event.id,
      p_product_id: meta.selectedProductId,
      p_quantity: 1,
    });

    if (error) {
      // The one-live-order-per-moment index: someone got there first.
      if (error.code === "23505") return { status: "skipped", reason: "already_ordered" };
      throw new Error(`could not create the order: ${error.message}`);
    }

    ctx.log.info({ orderId }, "order queued for ops");
    return { status: "done", result: { orderId } };
  },
};
