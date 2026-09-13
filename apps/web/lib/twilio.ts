import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { webConfig } from "@/lib/config";

/**
 * Twilio from the web app: the "send a test text" button, and verifying the
 * delivery receipts Twilio posts back. The worker does the real sending.
 */

export function twilioConfigured(): boolean {
  const t = webConfig.twilio;
  return Boolean(t.accountSid && t.authToken && (t.messagingServiceSid || t.fromNumber));
}

export async function sendTestSms(to: string, body: string): Promise<{ sid: string } | { error: string }> {
  const t = webConfig.twilio;
  const form = new URLSearchParams({ To: to, Body: body });
  if (t.messagingServiceSid) form.set("MessagingServiceSid", t.messagingServiceSid);
  else form.set("From", t.fromNumber);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${t.accountSid}:${t.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
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

/**
 * X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + each POST param as
 * key+value, keys sorted)). Verified over the configured public URL, never the
 * request's Host header, which a caller controls.
 */
export function isValidTwilioSignature(signature: string | null, params: Record<string, string>): boolean {
  const { authToken, statusCallbackUrl } = webConfig.twilio;
  if (!signature || !authToken || !statusCallbackUrl) return false;

  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], statusCallbackUrl);
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
