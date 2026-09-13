import { config } from "../config.js";

/**
 * Twilio Messages API, called directly over HTTPS -- one endpoint does not
 * justify an SDK dependency.
 *
 * Credentials are platform-wide worker env vars, not per-tenant secrets: every
 * customer's texts go out through our Twilio account and are billed to us.
 */

export class TwilioError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code: number | null,
  ) {
    super(message);
    this.name = "TwilioError";
  }

  /** Rate limits and Twilio-side outages are worth retrying; a bad number is not. */
  get retryable(): boolean {
    return this.httpStatus === 429 || this.httpStatus >= 500 || this.httpStatus === 0;
  }
}

export function twilioConfigured(): boolean {
  const t = config.twilio;
  return Boolean(t.accountSid && t.authToken && (t.messagingServiceSid || t.fromNumber));
}

export async function sendSms(
  to: string,
  body: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ sid: string; status: string }> {
  const t = config.twilio;
  const form = new URLSearchParams({ To: to, Body: body });
  // A Messaging Service handles sender selection and, where Twilio supports it,
  // opt-out keywords. A bare From number is the simpler starting point.
  if (t.messagingServiceSid) form.set("MessagingServiceSid", t.messagingServiceSid);
  else form.set("From", t.fromNumber);
  if (t.statusCallbackUrl) form.set("StatusCallback", t.statusCallbackUrl);

  let res: Response;
  try {
    res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${t.accountSid}:${t.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: opts.signal,
    });
  } catch (err) {
    throw new TwilioError(`could not reach Twilio: ${String(err)}`, 0, null);
  }

  const json = (await res.json().catch(() => ({}))) as {
    sid?: string; status?: string; message?: string; code?: number;
  };
  if (!res.ok || !json.sid) {
    throw new TwilioError(json.message ?? `Twilio returned ${res.status}`, res.status, json.code ?? null);
  }
  return { sid: json.sid, status: json.status ?? "queued" };
}
