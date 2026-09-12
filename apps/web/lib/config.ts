import "server-only";

/**
 * Server-only configuration. One frozen object, namespaced per integration.
 * Nothing in the app reads process.env ad hoc.
 *
 * The build-phase escape hatch exists because `next build` evaluates modules
 * without runtime secrets present; we must not fail the build for a value that
 * will be injected at run time.
 */

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function requireServerEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    if (isBuildPhase) return "";
    throw new Error(`Missing required server environment variable ${name}. See .env.example.`);
  }
  return v.trim();
}

function optionalServerEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const webConfig = Object.freeze({
  supabase: Object.freeze({
    url: requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    /** Bypasses RLS. Never import the admin client into a client component. */
    serviceRoleKey: requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }),
  app: Object.freeze({
    url: optionalServerEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    /** Everything scheduling-related resolves against this. */
    defaultTimezone: "Asia/Karachi",
  }),
  internalApi: Object.freeze({
    baseUrl: optionalServerEnv("INTERNAL_API_URL", "http://localhost:3001/internal-api"),
    key: optionalServerEnv("INTERNAL_API_KEY"),
  }),
  slack: Object.freeze({
    clientId: optionalServerEnv("SLACK_CLIENT_ID"),
    clientSecret: optionalServerEnv("SLACK_CLIENT_SECRET"),
    signingSecret: optionalServerEnv("SLACK_SIGNING_SECRET"),
    actionSecret: optionalServerEnv("SLACK_ACTION_SECRET"),
  }),
  whatsapp: Object.freeze({
    baseUrl: optionalServerEnv("WHATSAPP_BASE_URL", "https://graph.facebook.com/v21.0"),
    token: optionalServerEnv("WHATSAPP_TOKEN"),
    appSecret: optionalServerEnv("WHATSAPP_APP_SECRET"),
    verifyToken: optionalServerEnv("WHATSAPP_VERIFY_TOKEN"),
    phoneNumberId: optionalServerEnv("WHATSAPP_PHONE_NUMBER_ID"),
  }),
  email: Object.freeze({
    resendApiKey: optionalServerEnv("RESEND_API_KEY"),
    from: optionalServerEnv("EMAIL_FROM", "Moments <notify@moments.pk>"),
  }),
});
