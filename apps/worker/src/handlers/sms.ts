import type { TaskContext } from "../poller/types.js";

export interface SmsSettings {
  /** The org switched SMS on in Settings -> Messages. */
  enabled: boolean;
  /** Where dry-run texts go instead of employees. */
  testPhone: string | null;
}

const E164 = /^\+[1-9][0-9]{7,14}$/;

/**
 * Per-org SMS settings, kept in org_integrations (provider `twilio`). Nothing
 * secret lives there: the Twilio credentials are worker env vars.
 */
export async function smsSettings(db: TaskContext["db"], orgId: string): Promise<SmsSettings> {
  const { data } = await db
    .from("org_integrations")
    .select("status, config_public")
    .eq("org_id", orgId)
    .eq("provider", "twilio" as never)
    .maybeSingle();

  const cfg = (data?.config_public ?? {}) as { testPhone?: unknown };
  const testPhone = typeof cfg.testPhone === "string" && E164.test(cfg.testPhone) ? cfg.testPhone : null;
  return { enabled: data?.status === "connected", testPhone };
}

/** The number to text someone on: their phone, else their WhatsApp number. */
export function smsNumber(p: { phone_e164?: string | null; whatsapp_e164?: string | null } | null): string | null {
  return p?.phone_e164 || p?.whatsapp_e164 || null;
}
