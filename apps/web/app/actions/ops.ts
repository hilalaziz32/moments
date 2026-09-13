"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformStaff } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@moments/core/csv";

/**
 * Internal ops actions.
 *
 * Order and payment changes go through SECURITY DEFINER functions with the
 * signed-in client, so the database itself checks is_platform_staff() and the
 * audit row carries the real person. Catalogue edits use the service-role
 * client, but only after requirePlatformStaff(), and they write their own audit
 * row -- customers must never be able to touch the supply side.
 */

export type OpsResult = { success: true } | { error: string };

const ORDER_STATUSES = new Set(["placed_with_vendor", "in_transit", "delivered", "failed", "cancelled"]);
const CATEGORIES = new Set([
  "cake", "flowers", "chocolate", "hamper", "voucher", "electronics",
  "apparel", "book", "toy", "plant", "card", "custom",
]);
const ORDERING_METHODS = new Set(["whatsapp", "phone", "email", "portal"]);

export async function updateOrderStatus(
  orderId: string,
  status: string,
  opts: { vendorRef?: string; reason?: string } = {},
): Promise<OpsResult> {
  await requirePlatformStaff();
  if (!ORDER_STATUSES.has(status)) return { error: "That isn't a status ops can set." };
  if ((status === "failed" || status === "cancelled") && !opts.reason?.trim()) {
    return { error: "Say what went wrong. It goes in the audit log." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ops_update_order", {
    p_order_id: orderId,
    p_status: status,
    p_vendor_ref: opts.vendorRef?.trim() || null,
    p_vendor_id: null,
    p_reason: opts.reason?.trim() || null,
  } as never);

  if (error) return { error: error.message };
  const r = data as unknown as { ok: boolean; reason?: string };
  if (!r?.ok) return { error: r?.reason === "not_found" ? "That order no longer exists." : "Couldn't update the order." };

  revalidatePath("/ops");
  return { success: true };
}

export async function reviewPayment(paymentId: string, approve: boolean, reason: string): Promise<OpsResult> {
  await requirePlatformStaff();
  if (!approve && !reason.trim()) return { error: "Say why it's being rejected. The customer sees this." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_payment", {
    p_payment_id: paymentId,
    p_approve: approve,
    p_reason: reason.trim() || null,
  } as never);
  if (error) return { error: error.message };

  revalidatePath("/ops/payments");
  return { success: true };
}

export async function createVendor(_prev: unknown, formData: FormData): Promise<OpsResult> {
  const staff = await requirePlatformStaff();
  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("contactPhone") ?? "").trim();
  const orderingMethod = String(formData.get("orderingMethod") ?? "whatsapp");
  const leadDays = Number(formData.get("leadDays") ?? 2);
  const feeRupees = Number(formData.get("deliveryFee") ?? 0);
  const cityIds = formData.getAll("cityId").map(String).filter(Boolean);

  if (name.length < 2) return { error: "Give the vendor a name." };
  if (!ORDERING_METHODS.has(orderingMethod)) return { error: "Pick how orders are placed." };
  if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > 30) return { error: "Lead time must be 0 to 30 days." };
  if (!Number.isFinite(feeRupees) || feeRupees < 0) return { error: "Delivery fee can't be negative." };
  if (cityIds.length === 0) return { error: "Pick at least one city they deliver to." };

  let phone: string | null = null;
  if (phoneRaw) {
    const p = normalizePhone(phoneRaw);
    if (!p.ok) return { error: `Phone: ${p.reason}` };
    phone = p.e164;
  }

  const db = createAdminClient();
  const { data: vendor, error } = await db
    .from("vendors")
    .insert({
      name, contact_phone: phone, whatsapp_e164: orderingMethod === "whatsapp" ? phone : null,
      ordering_method: orderingMethod, default_lead_days: leadDays,
    } as never)
    .select("id")
    .single();
  if (error || !vendor) {
    return { error: error?.code === "23505" ? "A vendor with that name already exists." : (error?.message ?? "Couldn't save.") };
  }

  const { error: coverageError } = await db.from("vendor_city_coverage").insert(
    cityIds.map((cityId) => ({
      vendor_id: vendor.id, city_id: cityId, lead_time_days: leadDays,
      delivery_fee_paisa: Math.round(feeRupees * 100),
    })) as never,
  );
  if (coverageError) return { error: coverageError.message };

  await db.from("audit_log").insert({
    actor_kind: "staff", actor_user_id: staff.id, action: "vendor.created",
    entity: "vendors", entity_id: vendor.id,
  } as never);

  revalidatePath("/ops/catalog");
  return { success: true };
}

export async function createProduct(_prev: unknown, formData: FormData): Promise<OpsResult> {
  const staff = await requirePlatformStaff();
  const on = (k: string) => formData.get(k) === "on";

  const vendorId = String(formData.get("vendorId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const cost = Number(formData.get("costRupees"));
  const price = Number(formData.get("priceRupees"));
  const minLeadDays = Number(formData.get("minLeadDays") ?? 1);
  const momentKeys = formData.getAll("momentKey").map(String);

  if (!vendorId) return { error: "Pick a vendor." };
  if (name.length < 2) return { error: "Give the product a name." };
  if (!CATEGORIES.has(category)) return { error: "Pick a category." };
  if (!Number.isFinite(price) || price < 100) return { error: "Price must be at least PKR 100." };
  if (!Number.isFinite(cost) || cost < 0) return { error: "Enter what the vendor charges us." };
  if (cost > price) return { error: "Cost is higher than price. That loses money on every order." };
  if (!Number.isInteger(minLeadDays) || minLeadDays < 0 || minLeadDays > 30) return { error: "Lead time must be 0 to 30 days." };

  const isFood = on("isFood");
  const db = createAdminClient();
  const { data: product, error } = await db
    .from("gift_products")
    .insert({
      vendor_id: vendorId,
      name,
      category,
      cost_paisa: Math.round(cost * 100),
      list_price_paisa: Math.round(price * 100),
      is_food: isFood,
      is_halal_certified: isFood && on("isHalal"),
      is_eggless: isFood && on("isEggless"),
      is_vegetarian: isFood && on("isVegetarian"),
      contains_nuts: isFood && on("containsNuts"),
      is_digital: on("isDigital"),
      suitable_moment_keys: momentKeys,
      min_lead_days: minLeadDays,
    } as never)
    .select("id")
    .single();
  if (error || !product) return { error: error?.message ?? "Couldn't save." };

  await db.from("audit_log").insert({
    actor_kind: "staff", actor_user_id: staff.id, action: "product.created",
    entity: "gift_products", entity_id: product.id,
  } as never);

  revalidatePath("/ops/catalog");
  return { success: true };
}
