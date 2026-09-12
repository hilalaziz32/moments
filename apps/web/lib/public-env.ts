/**
 * Client-safe environment. Validated at import time so a misconfigured deploy
 * fails loudly at boot rather than silently at the first Supabase call.
 *
 * NOTHING else in the app reads process.env for these values.
 */

function requireString(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value.trim();
}

function normalizeUrl(name: string, value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} is not a valid URL: ${value}`);
  }
}

const supabaseUrl = normalizeUrl(
  "NEXT_PUBLIC_SUPABASE_URL",
  requireString("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
);

export const publicEnv = Object.freeze({
  supabaseUrl,
  supabaseAnonKey: requireString(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  appUrl: normalizeUrl(
    "NEXT_PUBLIC_APP_URL",
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
});
