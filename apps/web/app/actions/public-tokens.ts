"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { employeeConfirmationSchema } from "@moments/contracts";

/**
 * The only server actions callable without a session.
 *
 * They do NOT trust themselves: every write goes through
 * moments.submit_employee_confirmation(), which whitelists columns server-side.
 * This file could be bypassed; that function cannot.
 */

export type PublicResult = { ok: true } | { ok: false; error: string };

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

/** Postgres-backed sliding window. No Redis: not worth the dependency at v1 scale. */
async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("check_rate_limit", {
    p_key: key, p_limit: limit, p_window_seconds: windowSeconds,
  } as never);
  if (error) return true;   // fail open: never lock a real employee out over telemetry
  return Boolean(data);
}

export async function submitConfirmation(
  token: string,
  values: unknown,
): Promise<PublicResult> {
  const ip = await clientIp();
  const h = await headers();
  const ua = h.get("user-agent");

  if (!(await rateLimit(`tok:sub:${token.slice(0, 12)}`, 20, 3600))) {
    return { ok: false, error: "That's a lot of changes at once. Try again in a little while." };
  }
  if (ip && !(await rateLimit(`tok:ip:${ip}`, 30, 300))) {
    return { ok: false, error: "Too many requests from this connection. Try again shortly." };
  }

  const parsed = employeeConfirmationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("submit_employee_confirmation", {
    p_token: token,
    p_payload: parsed.data as never,
    p_ip: ip,
    p_ua: ua,
  } as never);

  if (error) return { ok: false, error: "We couldn't save that. Try again in a moment." };

  const result = data as { ok?: boolean } | null;
  if (!result?.ok) {
    return { ok: false, error: "This link is no longer valid. Ask your HR team for a new one." };
  }
  return { ok: true };
}
