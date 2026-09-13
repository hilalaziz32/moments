import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTwilioSignature } from "@/lib/twilio";

/**
 * Twilio delivery receipts. Twilio posts every status change of a text we sent;
 * we record the ones HR cares about: it arrived, or it didn't and why.
 *
 * Unsigned or wrongly signed requests are refused -- otherwise anyone could mark
 * messages delivered.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  if (!isValidTwilioSignature(request.headers.get("x-twilio-signature"), params)) {
    return new NextResponse("invalid signature", { status: 403 });
  }

  const sid = params.MessageSid;
  const status = params.MessageStatus;
  if (!sid || !status) return new NextResponse(null, { status: 204 });

  const now = new Date().toISOString();
  let patch: Record<string, unknown> | null = null;
  if (status === "delivered") {
    patch = { status: "delivered", delivered_at: now };
  } else if (status === "failed" || status === "undelivered") {
    patch = {
      status: "failed",
      failed_at: now,
      error_code: params.ErrorCode ? String(params.ErrorCode) : status,
      error_message: status === "undelivered" ? "The carrier didn't deliver the text." : "Twilio couldn't send the text.",
    };
  }

  if (patch) {
    const db = createAdminClient();
    await db
      .from("outbound_messages")
      .update(patch as never)
      .eq("provider_message_id", sid)
      .eq("channel", "sms");
  }

  // Twilio only needs a 2xx; a body would be ignored.
  return new NextResponse(null, { status: 204 });
}
