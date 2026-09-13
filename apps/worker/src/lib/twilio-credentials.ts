import { config } from "../config.js";
import type { db as Db } from "./supabase.js";
import type { TwilioCredentials } from "./twilio.js";

/**
 * Which Twilio sender an org texts from.
 *
 * One Twilio account for the whole platform (TWILIO_ACCOUNT_SID/AUTH_TOKEN env).
 * The super admin assigns each org a sending number in the admin panel; it is
 * stored in org_integrations.external_account_id for provider `twilio` -- a
 * column tenants have no UPDATE grant on, so a customer can't switch to another
 * customer's number. Orgs without one use TWILIO_FROM_NUMBER or the Messaging
 * Service.
 *
 * Cached for a minute: a fan-out of 40 texts should not be 40 lookups, and a
 * number changed in the admin panel is picked up within the minute.
 */

const TTL_MS = 60_000;
const E164 = /^\+[1-9][0-9]{7,14}$/;
const cache = new Map<string, { at: number; value: TwilioCredentials | null }>();

export async function twilioCredentials(db: typeof Db, orgId: string): Promise<TwilioCredentials | null> {
  const hit = cache.get(orgId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const t = config.twilio;
  let value: TwilioCredentials | null = null;

  if (t.accountSid && t.authToken) {
    const { data } = await db
      .from("org_integrations")
      .select("external_account_id")
      .eq("org_id", orgId)
      .eq("provider", "twilio" as never)
      .maybeSingle();

    const orgNumber = data?.external_account_id && E164.test(data.external_account_id)
      ? data.external_account_id
      : null;
    const fromNumber = orgNumber ?? (t.fromNumber || null);
    const messagingServiceSid = orgNumber ? null : (t.messagingServiceSid || null);

    if (fromNumber || messagingServiceSid) {
      value = {
        accountSid: t.accountSid,
        authToken: t.authToken,
        fromNumber,
        messagingServiceSid,
        source: orgNumber ? "org" : "env",
      };
    }
  }

  cache.set(orgId, { at: Date.now(), value });
  return value;
}
