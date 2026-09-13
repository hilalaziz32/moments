import { config } from "../config.js";

/**
 * Twilio Messages API, called directly over HTTPS -- one endpoint does not
 * justify an SDK dependency.
 *
 * Credentials are resolved per organisation (see twilio-credentials.ts): an org
 * may send from its own number on the platform account, or from its own Twilio
 * account entirely.
 */

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string | null;
  messagingServiceSid: string | null;
  /** Where these came from, for logs: the org's own settings, the platform's, or env. */
  source: "org" | "platform" | "env";
}

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

/** Twilio can only call back a public https URL, so local dev sends without receipts. */
function statusCallbackUrl(): string {
  if (config.twilio.statusCallbackUrl) return config.twilio.statusCallbackUrl;
  return config.appUrl.startsWith("https://") ? `${config.appUrl}/api/twilio/status` : "";
}

export async function sendSms(
  creds: TwilioCredentials,
  to: string,
  body: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ sid: string; status: string }> {
  const form = new URLSearchParams({ To: to, Body: body });
  // A Messaging Service handles sender selection; a bare From number is the
  // simpler starting point.
  if (creds.messagingServiceSid) form.set("MessagingServiceSid", creds.messagingServiceSid);
  else form.set("From", creds.fromNumber ?? "");
  const callback = statusCallbackUrl();
  if (callback) form.set("StatusCallback", callback);

  let res: Response;
  try {
    res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64")}`,
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
