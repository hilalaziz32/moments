function req(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing required env var ${name}. See .env.example.`);
  return v.trim();
}
function opt(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const config = Object.freeze({
  role: opt("PROCESS_ROLE", "all") as "web" | "worker" | "all",
  port: Number(opt("WORKER_PORT", "3001")),
  /** Everything scheduling-related resolves against this. Never an offset. */
  timezone: opt("TZ_SCHEDULE", "Asia/Karachi"),
  workerId: `${opt("RAILWAY_REPLICA_ID", "local")}-${process.pid}`,
  supabase: Object.freeze({
    url: req("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: req("SUPABASE_SERVICE_ROLE_KEY"),
  }),
  internalApiKey: opt("INTERNAL_API_KEY"),
  /** Base for links in emails. */
  appUrl: opt("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  /** SMS. Optional: with no credentials, SMS sends are recorded but not delivered. */
  twilio: Object.freeze({
    accountSid: opt("TWILIO_ACCOUNT_SID"),
    authToken: opt("TWILIO_AUTH_TOKEN"),
    /** E.164 sender, used when no Messaging Service is set. */
    fromNumber: opt("TWILIO_FROM_NUMBER"),
    messagingServiceSid: opt("TWILIO_MESSAGING_SERVICE_SID"),
    /** Delivery receipts. Must be a public https URL, so empty in local dev. */
    statusCallbackUrl: opt("TWILIO_STATUS_CALLBACK_URL"),
  }),
  /** Detector horizon. Long enough that T-7 always exists comfortably. */
  horizonDays: Number(opt("DETECTOR_HORIZON_DAYS", "45")),
});

export type Config = typeof config;
