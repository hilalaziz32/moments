import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { webConfig } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Twilio from the web app: test texts, the super admin's number picker, and
 * verifying delivery receipts. The worker does the real sending.
 *
 * One Twilio account for the whole platform, from env. Each org can be given
 * its own sending number by the super admin (org_integrations.external_account_id,
 * provider `twilio`). The auth token never reaches the browser.
 */

export interface TwilioCreds {
  accountSid: string;
  authToken: string;
  fromNumber: string | null;
  messagingServiceSid: string | null;
  /** "org" when the org has its own number, "env" for the platform default sender. */
  source: "org" | "env";
}

export interface TwilioNumber {
  phoneNumber: string;
  friendlyName: string;
  sms: boolean;
}

const E164 = /^\+[1-9][0-9]{7,14}$/;

export function twilioAccountConfigured(): boolean {
  return Boolean(webConfig.twilio.accountSid && webConfig.twilio.authToken);
}

/** Has somewhere to send from. */
export function canSend(c: TwilioCreds | null): c is TwilioCreds {
  return Boolean(c && (c.fromNumber || c.messagingServiceSid));
}

/** The org's assigned sending number, if the super admin set one. */
export async function orgSenderNumber(orgId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("org_integrations")
    .select("external_account_id")
    .eq("org_id", orgId)
    .eq("provider", "twilio")
    .maybeSingle();
  const n = data?.external_account_id ?? null;
  return n && E164.test(n) ? n : null;
}

/** Account credentials plus the sender this org texts from. */
export async function resolveTwilioCredentials(orgId: string): Promise<TwilioCreds | null> {
  const t = webConfig.twilio;
  if (!twilioAccountConfigured()) return null;

  const orgNumber = await orgSenderNumber(orgId);
  return {
    accountSid: t.accountSid,
    authToken: t.authToken,
    fromNumber: orgNumber ?? (t.fromNumber || null),
    messagingServiceSid: orgNumber ? null : (t.messagingServiceSid || null),
    source: orgNumber ? "org" : "env",
  };
}

function authHeader(): string {
  const { accountSid, authToken } = webConfig.twilio;
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function twilioGet<T>(url: string): Promise<T | { error: string }> {
  if (!twilioAccountConfigured()) return { error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN aren't set." };
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader() },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as T & { message?: string };
    if (res.status === 401) return { error: "Twilio rejected the Account SID or Auth Token in env." };
    if (!res.ok) return { error: json.message ?? `Twilio returned ${res.status}` };
    return json;
  } catch {
    return { error: "Couldn't reach Twilio. Try again in a minute." };
  }
}

/** Confirms the env credentials work and returns the account's name. */
export async function verifyAccount(): Promise<{ friendlyName: string; status: string } | { error: string }> {
  const r = await twilioGet<{ friendly_name?: string; status?: string }>(
    `https://api.twilio.com/2010-04-01/Accounts/${webConfig.twilio.accountSid}.json`,
  );
  if ("error" in r) return r;
  return { friendlyName: r.friendly_name ?? "Twilio account", status: r.status ?? "unknown" };
}

/** Every phone number on the Twilio account, for the sender picker. */
export async function listNumbers(): Promise<TwilioNumber[] | { error: string }> {
  const r = await twilioGet<{
    incoming_phone_numbers?: { phone_number: string; friendly_name: string; capabilities?: { sms?: boolean } }[];
  }>(`https://api.twilio.com/2010-04-01/Accounts/${webConfig.twilio.accountSid}/IncomingPhoneNumbers.json?PageSize=200`);
  if ("error" in r) return r;
  return (r.incoming_phone_numbers ?? []).map((n) => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
    sms: n.capabilities?.sms !== false,
  }));
}

export async function sendSms(creds: TwilioCreds, to: string, body: string): Promise<{ sid: string } | { error: string }> {
  const form = new URLSearchParams({ To: to, Body: body });
  if (creds.messagingServiceSid) form.set("MessagingServiceSid", creds.messagingServiceSid);
  else form.set("From", creds.fromNumber ?? "");

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok || !json.sid) return { error: json.message ?? `Twilio returned ${res.status}` };
    return { sid: json.sid };
  } catch {
    return { error: "Couldn't reach Twilio. Try again in a minute." };
  }
}

/** The URL Twilio posts receipts to. The signature is computed over exactly this. */
export function statusCallbackUrl(): string {
  return webConfig.twilio.statusCallbackUrl || `${webConfig.app.url}/api/twilio/status`;
}

/**
 * X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + each POST param as
 * key+value, keys sorted)). Computed over the configured public URL, never the
 * request's Host header, which a caller controls.
 */
export function isValidTwilioSignature(signature: string | null, params: Record<string, string>): boolean {
  const { authToken } = webConfig.twilio;
  if (!signature || !authToken) return false;
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], statusCallbackUrl());
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
