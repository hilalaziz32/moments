"use server";

import { revalidatePath } from "next/cache";
import { normalizePhone } from "@moments/core/csv";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guard";
import { isOrgAdmin, requireOrg } from "@/lib/auth/org";
import { sendTestSms, twilioConfigured } from "@/lib/twilio";
import type { ActionResult } from "@/app/actions/onboarding";

/**
 * SMS settings live in org_integrations (provider `twilio`). Tenants may update
 * an existing row but have no INSERT grant on that table, so the row is written
 * with the service client -- only after the caller is proven an owner/admin, and
 * only ever for their own org. Nothing secret is stored: Twilio credentials are
 * server env vars.
 */
export async function saveSmsSettings(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const org = await requireOrg();
  if (!isOrgAdmin(org.role)) return { error: "Only an owner or admin can change message settings." };

  const enabled = fd.get("enabled") === "on";
  const testPhoneRaw = String(fd.get("testPhone") ?? "").trim();

  let testPhone: string | null = null;
  if (testPhoneRaw) {
    const parsed = normalizePhone(testPhoneRaw);
    if (!parsed.ok) {
      return { error: "Check the test phone.", fieldErrors: { testPhone: "Enter a mobile number like 0300 1234567." } };
    }
    testPhone = parsed.e164;
  }

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("org_integrations")
    .select("id, config_public")
    .eq("org_id", org.orgId)
    .eq("provider", "twilio")
    .maybeSingle();
  if (readError) return { error: explain(readError.message) };

  const config = { ...((existing?.config_public as Record<string, unknown> | null) ?? {}), testPhone };
  const patch = {
    status: enabled ? ("connected" as const) : ("disconnected" as const),
    display_name: "SMS (Twilio)",
    config_public: config as never,
  };

  const { error } = existing
    ? await admin.from("org_integrations").update(patch).eq("id", existing.id).eq("org_id", org.orgId)
    : await admin.from("org_integrations").insert({ org_id: org.orgId, provider: "twilio", installed_by: user.id, ...patch });
  if (error) return { error: explain(error.message) };

  revalidatePath("/settings/messages");
  return { success: true };
}

export async function sendTestText(_prev: unknown, fd: FormData): Promise<ActionResult<{ note: string }>> {
  const org = await requireOrg();
  // Every text costs money, so only people who can change settings can send one.
  if (!isOrgAdmin(org.role)) return { error: "Only an owner or admin can send a test text." };
  if (!twilioConfigured()) {
    return { error: "Twilio isn't connected on the server yet. Add the TWILIO_ settings, then try again." };
  }

  const parsed = normalizePhone(String(fd.get("phone") ?? ""));
  if (!parsed.ok) {
    return { error: "Check the number.", fieldErrors: { phone: "Enter a mobile number like 0300 1234567." } };
  }

  const result = await sendTestSms(parsed.e164, `Test from Moments: texts for ${org.orgName} are working.`);
  if ("error" in result) return { error: `Twilio said: ${result.error}` };
  return { success: true, note: "Sent. It should arrive within a minute." };
}

function explain(message: string): string {
  return message.includes("invalid input value for enum")
    ? "SMS isn't enabled in the database yet. Run migration 00030, then try again."
    : "Couldn't save the settings. Try again.";
}
