"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrg, canManagePeople } from "@/lib/auth/org";

export type ApprovalDecisionResult =
  | { success: true; decision: string; alreadyDecided: boolean }
  | { error: string };

/**
 * The signed-in path. The emailed-link path calls the SAME database function,
 * so the rules for who may decide, and what a decision does, cannot drift apart.
 */
export async function decideApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  note: string,
): Promise<ApprovalDecisionResult> {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) return { error: "Only HR admins can approve spend." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_to_approval", {
    p_approval_id: approvalId,
    p_decision: decision,
    p_note: note.trim() || null,
  } as never);

  if (error) return { error: "Couldn't record that decision. Try again." };

  const r = data as unknown as { ok: boolean; reason?: string; decision?: string; alreadyDecided?: boolean };
  if (!r?.ok) {
    const messages: Record<string, string> = {
      expired: "This request expired before it was answered.",
      not_allowed: "You don't have permission to approve this.",
      not_found: "That request no longer exists.",
    };
    return { error: messages[r?.reason ?? ""] ?? "Couldn't record that decision." };
  }

  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  revalidatePath("/moments", "layout");
  return { success: true, decision: r.decision ?? decision, alreadyDecided: Boolean(r.alreadyDecided) };
}
