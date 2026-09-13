"use server";

import { revalidatePath } from "next/cache";
import { normalizePhone } from "@moments/core/csv";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { isOrgAdmin, requireOrg } from "@/lib/auth/org";
import type { ActionResult } from "@/app/actions/onboarding";
import { logActivity } from "@/lib/activity";

const JURISDICTIONS = ["FBR", "SRB", "PRA", "KPRA", "BRA", "ICT"] as const;
const LATE_POLICIES = ["fire_immediately_if_before_15", "next_day", "skip"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- company */

export async function updateCompany(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const org = await requireOrg();
  if (!isOrgAdmin(org.role)) return { error: "Only an owner or admin can change company settings." };

  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const name = get("name");
  const legalName = get("legalName");
  const timezone = get("timezone");
  const billingEmail = get("billingEmail").toLowerCase();
  const ntn = get("ntn");
  const strn = get("strn");
  const jurisdiction = get("taxJurisdiction");
  const feb29 = get("feb29");
  const late = get("latePolicy");
  const announceAt = get("announceAt");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 200) fieldErrors.name = "Enter your company name.";
  if (legalName.length > 200) fieldErrors.legalName = "Keep it under 200 characters.";
  if (!validTimezone(timezone)) fieldErrors.timezone = "Pick a timezone.";
  if (billingEmail && !EMAIL.test(billingEmail)) fieldErrors.billingEmail = "That doesn't look like an email address.";
  if (ntn && !/^[0-9]{7}-?[0-9]?$/.test(ntn) && !/^[0-9]{13}$/.test(ntn)) fieldErrors.ntn = "NTN is 7 digits with a check digit (1234567-8), or a 13-digit CNIC.";
  if (strn && !/^[0-9]{13}$/.test(strn)) fieldErrors.strn = "STRN is 13 digits.";
  if (jurisdiction && !JURISDICTIONS.includes(jurisdiction as (typeof JURISDICTIONS)[number])) fieldErrors.taxJurisdiction = "Pick one.";
  if (!["feb_28", "mar_01"].includes(feb29)) fieldErrors.feb29 = "Pick one.";
  if (!LATE_POLICIES.includes(late as (typeof LATE_POLICIES)[number])) fieldErrors.latePolicy = "Pick one.";
  if (!HHMM.test(announceAt)) fieldErrors.announceAt = "Pick a time.";
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      legal_name: legalName || null,
      timezone,
      billing_email: billingEmail || null,
      ntn: ntn || null,
      strn: strn || null,
      tax_jurisdiction: (jurisdiction || null) as (typeof JURISDICTIONS)[number] | null,
      feb29_observed_on: feb29 as "feb_28" | "mar_01",
      late_announcement_policy: late as (typeof LATE_POLICIES)[number],
      celebrate_on_terminated_exit: fd.get("celebrateOnTerminatedExit") === "on",
    })
    .eq("id", org.orgId);
  if (error) return { error: "Couldn't save. Try again." };

  // One announcement time for every moment except farewells, which go out at
  // the end of the last day on purpose.
  const { data: policies } = await supabase
    .from("moment_policies").select("id, moment_types(key)").eq("org_id", org.orgId);
  const ids = (policies ?? [])
    .filter((p) => (p.moment_types as unknown as { key: string } | null)?.key !== "farewell")
    .map((p) => p.id);
  if (ids.length) {
    await supabase.from("moment_policies").update({ announcement_local_time: announceAt }).in("id", ids).eq("org_id", org.orgId);
  }
  await logActivity(org.orgId, "company.updated", "organizations", org.orgId);

  revalidatePath("/", "layout");
  return { success: true };
}

/* ---------------------------------------------------------------- profile */

export async function updateProfile(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const fullName = String(fd.get("fullName") ?? "").trim();
  const phoneRaw = String(fd.get("phone") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 1 || fullName.length > 200) fieldErrors.fullName = "Enter your name.";
  let phone: string | null = null;
  if (phoneRaw) {
    const parsed = normalizePhone(phoneRaw);
    if (parsed.ok) phone = parsed.e164;
    else fieldErrors.phone = "Enter a mobile number like 0300 1234567.";
  }
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone_e164: phone }).eq("id", user.id);
  if (error) return { error: "Couldn't save. Try again." };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePassword(_prev: unknown, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (confirm !== password) fieldErrors.confirm = "The two passwords don't match.";
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("reauthentication")
        ? "For security, sign out and use “Forgot your password?” to set a new one."
        : error.message,
    };
  }
  return { success: true };
}
