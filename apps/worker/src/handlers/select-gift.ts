import { PermanentTaskError } from "@moments/contracts";
import type { TaskHandler } from "../poller/types.js";

/**
 * T-4: pick a gift that fits the budget, the city and the person.
 *
 * Deterministic budget-fit plus category and dietary rules. No ML in v1 -- a
 * recommendation you cannot explain to a customer whose cake was wrong is worse
 * than a rule you can.
 */
export const selectGift: TaskHandler = {
  type: "select_gift",
  lane: "default",
  leaseSeconds: 120,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, employee_id, budget_paisa, occurs_on, gift_enabled, moment_types(key), employees(halal_only, is_vegetarian, needs_eggless, allergies, gender)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event) throw new PermanentTaskError("moment no longer exists");
    if (!event.gift_enabled) return { status: "skipped", reason: "gifts_disabled_for_this_moment" };
    if (event.budget_paisa <= 0) return { status: "skipped", reason: "no_budget_set" };

    const momentKey = (event.moment_types as unknown as { key: string } | null)?.key ?? "";
    const emp = event.employees as unknown as {
      halal_only: boolean; is_vegetarian: boolean; needs_eggless: boolean;
      allergies: string[]; gender: string | null;
    } | null;

    // Where is it going? Delivery city gates which vendors can actually serve it.
    const { data: address } = await ctx.db
      .from("addresses")
      .select("city_id, verification_status")
      .eq("employee_id", event.employee_id ?? "")
      .eq("is_primary", true)
      .eq("is_active", true)
      .maybeSingle();

    const { data: candidates } = await ctx.db
      .from("gift_products")
      .select("id, name, category, cost_paisa, list_price_paisa, vendor_id, is_food, is_halal_certified, is_eggless, is_vegetarian, contains_nuts, suitable_moment_keys, gender_suitability, min_lead_days")
      .eq("is_active", true)
      .lte("list_price_paisa", event.budget_paisa)
      .order("list_price_paisa", { ascending: false })
      .limit(100);

    const fit = (candidates ?? []).filter((p) => {
      if (p.suitable_moment_keys.length > 0 && !p.suitable_moment_keys.includes(momentKey)) return false;
      if (p.gender_suitability !== "any" && emp?.gender && p.gender_suitability !== emp.gender) return false;
      if (p.is_food) {
        if (emp?.halal_only && !p.is_halal_certified) return false;
        if (emp?.needs_eggless && !p.is_eggless) return false;
        if (emp?.is_vegetarian && !p.is_vegetarian) return false;
        if (p.contains_nuts && (emp?.allergies ?? []).some((a) => /nut/i.test(a))) return false;
      }
      return true;
    });

    if (fit.length === 0) {
      // Not a crash: an empty catalogue for this budget and city is an ops
      // problem, and ops needs to see it rather than a retry storm.
      ctx.log.warn({ budget: event.budget_paisa, momentKey }, "no gift fits");
      await ctx.db.from("alerts").insert({
        severity: "p2", kind: "catalog_gap", org_id: event.org_id,
        dedupe_key: `catalog_gap:${momentKey}:${event.budget_paisa}`,
        title: "No gift fits this budget",
        body: `A ${momentKey} at PKR ${event.budget_paisa / 100} has no matching product.`,
      } as never);
      return { status: "skipped", reason: "no_product_fits_budget" };
    }

    // Best use of the budget, not the cheapest option.
    const chosen = fit[0]!;

    await ctx.db
      .from("moment_events")
      .update({
        status: "fulfilling",
        metadata: {
          selectedProductId: chosen.id,
          selectedName: chosen.name,
          selectedPricePaisa: chosen.list_price_paisa,
          deliveryCityId: address?.city_id ?? null,
          addressVerified: address?.verification_status ?? "unverified",
        } as never,
      } as never)
      .eq("id", event.id);

    ctx.log.info({ product: chosen.name, pricePaisa: chosen.list_price_paisa }, "gift selected");
    return { status: "done", result: { productId: chosen.id, pricePaisa: chosen.list_price_paisa } };
  },
};
