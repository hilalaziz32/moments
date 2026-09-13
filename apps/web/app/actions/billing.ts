"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { canManageBilling, requireOrg } from "@/lib/auth/org";
import type { ActionResult } from "@/app/actions/onboarding";

function rupeesToPaisa(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/**
 * The customer tells us they paid. It lands as `reported`; only our staff can
 * verify it against the bank statement. The account stays live meanwhile.
 */
export async function reportPayment(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const org = await requireOrg();
  if (!canManageBilling(org.role)) return { error: "Only an owner, admin or finance can report payments." };

  const fieldErrors: Record<string, string> = {};
  const invoiceId = String(formData.get("invoiceId") ?? "") || null;
  const amount = rupeesToPaisa(formData.get("amount"));
  const wht = rupeesToPaisa(formData.get("wht")) ?? 0;
  const paidOn = String(formData.get("paidOn") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();

  if (amount === null || amount < 100) fieldErrors.amount = "Enter the amount you transferred.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) fieldErrors.paidOn = "Pick the date of the transfer.";
  else if (paidOn > new Date().toISOString().slice(0, 10)) fieldErrors.paidOn = "That date is in the future.";
  if (reference.length < 3) fieldErrors.reference = "Add the bank reference so we can match it.";
  if (reference.length > 120) fieldErrors.reference = "That reference is too long.";

  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    org_id: org.orgId,
    invoice_id: invoiceId,
    method: "bank_transfer",
    status: "reported",
    amount_paisa: amount!,
    wht_paisa: wht,
    paid_on: paidOn,
    bank_reference: reference,
    submitted_by: user.id,
  });
  if (error) return { error: "We couldn't record that payment. Try again, or email us the receipt." };

  revalidatePath("/billing");
  return { success: true };
}
