"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionTokenSchema, approvalResponseSchema } from "@moments/contracts";

export type LinkDecisionResult =
  | { ok: true; decision: string; alreadyDecided: boolean }
  | { ok: false; error: string; needsCode?: boolean };

/** x-forwarded-for is client-controlled. Only pass something Postgres will accept as inet. */
function safeIp(value: string | null): string | null {
  if (!value) return null;
  const v = value.split(",")[0]!.trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(v) ? v : null;
}

async function allowed(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key, p_limit: limit, p_window_seconds: windowSeconds,
  } as never);
  return error ? true : Boolean(data);
}

/**
 * The emailed-link path. It calls the same respond_to_approval() as the
 * dashboard, which checks the token, the OTP for large amounts, expiry, and that
 * the token belongs to THIS request -- this action trusts none of that itself.
 */
export async function decideFromLink(
  token: string,
  approvalId: string,
  input: { decision: "approved" | "rejected"; note?: string; otp?: string },
): Promise<LinkDecisionResult> {
  if (!actionTokenSchema.safeParse(token).success) {
    return { ok: false, error: "This link isn't valid any more." };
  }

  const parsed = approvalResponseSchema.safeParse({
    decision: input.decision,
    note: input.note?.trim() || null,
    otp: input.otp?.trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const h = await headers();
  const ip = safeIp(h.get("x-forwarded-for") ?? h.get("x-real-ip"));

  // Ten decisions an hour per link is generous for a human and hopeless for
  // someone guessing a six-digit code.
  if (!(await allowed(`tok:sub:${token.slice(0, 12)}`, 10, 3600))) {
    return { ok: false, error: "Too many attempts on this link. Try again later." };
  }
  if (ip && !(await allowed(`tok:ip:${ip}`, 30, 300))) {
    return { ok: false, error: "Too many requests from this connection. Try again shortly." };
  }

  const { data, error } = await createAdminClient().rpc("respond_to_approval", {
    p_approval_id: approvalId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note ?? null,
    p_token: token,
    p_otp: parsed.data.otp ?? null,
    p_ip: ip,
    p_ua: h.get("user-agent"),
  } as never);

  if (error) return { ok: false, error: "We couldn't record that. Try again in a moment." };

  const r = data as unknown as { ok: boolean; reason?: string; decision?: string; alreadyDecided?: boolean };
  if (r?.ok) {
    return { ok: true, decision: r.decision ?? parsed.data.decision, alreadyDecided: Boolean(r.alreadyDecided) };
  }
  if (r?.reason === "otp_required") {
    return { ok: false, needsCode: true, error: "Enter the six-digit code from the separate email we sent." };
  }
  if (r?.reason === "expired") return { ok: false, error: "This request expired before it was answered." };
  return { ok: false, error: "This link isn't valid any more." };
}
