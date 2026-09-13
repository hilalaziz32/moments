"use server";

import { revalidatePath } from "next/cache";
import { normalizePhone } from "@moments/core/csv";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { canSend, listNumbers, resolveTwilioCredentials, sendSms } from "@/lib/twilio";
import type { ActionResult } from "@/app/actions/onboarding";

/**
 * Super admin actions. Every one re-checks requireSuperAdmin() -- a server
 * action is a public endpoint, and the layout's check does not protect it --
 * then writes with the service client and leaves an audit row.
 */

const ORG_STATUSES = ["trial", "active", "past_due", "suspended", "churned"] as const;

async function twilioRow(orgId: string) {
  const { data } = await createAdminClient()
    .from("org_integrations")
    .select("id, status, external_account_id, config_public")
    .eq("org_id", orgId)
    .eq("provider", "twilio")
    .maybeSingle();
  return data;
}

async function audit(actorId: string, orgId: string, action: string, after: Record<string, unknown>) {
  await createAdminClient().from("audit_log").insert({
    org_id: orgId, actor_kind: "staff", actor_user_id: actorId, action, entity: "organizations", entity_id: orgId,
    after: after as never,
  } as never);
}

function revalidate(orgId: string) {
  revalidatePath(`/admin/accounts/${orgId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/twilio");
}

function enumError(message: string): string {
  return message.includes("invalid input value for enum")
    ? "The database doesn't know about Twilio yet. Run migration 00030, then try again."
    : "Couldn't save. Try again.";
}

/** Assign the number this org texts from. Empty means the platform default. */
export async function setOrgSender(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const orgId = String(fd.get("orgId") ?? "");
  const fromNumber = String(fd.get("fromNumber") ?? "").trim();

  if (fromNumber) {
    const numbers = await listNumbers();
    if ("error" in numbers) return { error: numbers.error };
    const match = numbers.find((n) => n.phoneNumber === fromNumber);
    if (!match) return { error: "That number isn't on the Twilio account." };
    if (!match.sms) return { error: "That number can't send SMS." };
  }

  const db = createAdminClient();
  const existing = await twilioRow(orgId);
  const { error } = existing
    ? await db.from("org_integrations").update({ external_account_id: fromNumber || null }).eq("id", existing.id)
    : await db.from("org_integrations").insert({
        org_id: orgId, provider: "twilio", status: "connected", display_name: "SMS (Twilio)",
        external_account_id: fromNumber || null, installed_by: admin.id,
      });
  if (error) return { error: enumError(error.message) };

  await audit(admin.id, orgId, "sms.sender_set", { fromNumber: fromNumber || null });
  revalidate(orgId);
  return { success: true };
}

/** Switch SMS on or off for the org and set where dry-run texts go. */
export async function setOrgSms(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const orgId = String(fd.get("orgId") ?? "");
  const enabled = fd.get("enabled") === "on";
  const testPhoneRaw = String(fd.get("testPhone") ?? "").trim();

  let testPhone: string | null = null;
  if (testPhoneRaw) {
    const parsed = normalizePhone(testPhoneRaw);
    if (!parsed.ok) return { error: "Check the test phone.", fieldErrors: { testPhone: "Enter a mobile number like 0300 1234567." } };
    testPhone = parsed.e164;
  }

  const db = createAdminClient();
  const existing = await twilioRow(orgId);
  const config = { ...((existing?.config_public as Record<string, unknown> | null) ?? {}), testPhone };
  const status = enabled ? ("connected" as const) : ("disconnected" as const);

  const { error } = existing
    ? await db.from("org_integrations").update({ status, config_public: config as never }).eq("id", existing.id)
    : await db.from("org_integrations").insert({
        org_id: orgId, provider: "twilio", status, display_name: "SMS (Twilio)",
        config_public: config as never, installed_by: admin.id,
      });
  if (error) return { error: enumError(error.message) };

  await audit(admin.id, orgId, "sms.settings_set", { enabled, testPhone });
  revalidate(orgId);
  return { success: true };
}

export async function sendAdminTestText(_prev: unknown, fd: FormData): Promise<ActionResult<{ note: string }>> {
  await requireSuperAdmin();
  const orgId = String(fd.get("orgId") ?? "");

  const creds = await resolveTwilioCredentials(orgId);
  if (!canSend(creds)) return { error: "This account has no sending number, and there's no platform default." };

  const parsed = normalizePhone(String(fd.get("phone") ?? ""));
  if (!parsed.ok) return { error: "Check the number.", fieldErrors: { phone: "Enter a mobile number like 0300 1234567." } };

  const result = await sendSms(creds, parsed.e164, "Test from Moments: SMS for this account is working.");
  if ("error" in result) return { error: `Twilio said: ${result.error}` };
  return { success: true, note: `Sent from ${creds.fromNumber ?? "the messaging service"}.` };
}

/** Account status and the dry-run window. */
export async function setOrgLifecycle(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const orgId = String(fd.get("orgId") ?? "");
  const status = String(fd.get("status") ?? "") as (typeof ORG_STATUSES)[number];
  const dryRun = String(fd.get("dryRun") ?? "keep");

  if (!ORG_STATUSES.includes(status)) return { error: "Pick a status." };

  const patch: { status: (typeof ORG_STATUSES)[number]; dry_run_until?: string | null } = { status };
  if (dryRun === "end") patch.dry_run_until = null;
  if (dryRun === "extend") patch.dry_run_until = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const { error } = await createAdminClient().from("organizations").update(patch).eq("id", orgId);
  if (error) return { error: "Couldn't save. Try again." };

  await audit(admin.id, orgId, "org.lifecycle_set", { status, dryRun });
  revalidate(orgId);
  return { success: true };
}
