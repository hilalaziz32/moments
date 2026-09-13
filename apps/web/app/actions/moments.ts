"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrg, canManagePeople } from "@/lib/auth/org";

export type MomentActionResult = { success: true } | { error: string };

/**
 * Skip or cancel a moment.
 *
 * The database decides what is allowed: a tenant may skip a moment that hasn't
 * started, or cancel one at any point. The cancellation trigger then stops its
 * pending tasks and any order a vendor doesn't have yet.
 */
export async function changeMomentStatus(
  momentId: string,
  to: "skipped" | "cancelled",
  reason: string,
): Promise<MomentActionResult> {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) return { error: "Only HR admins can change a moment." };

  const supabase = await createClient();
  const note = reason.trim() || null;
  const patch =
    to === "cancelled"
      ? { status: "cancelled" as const, cancelled_at: new Date().toISOString(), cancel_reason: note }
      : { status: "skipped" as const, cancel_reason: note };

  const { error } = await supabase
    .from("moment_events")
    .update(patch)
    .eq("id", momentId)
    .eq("org_id", org.orgId);

  if (error) {
    return {
      error: error.code === "23514"
        ? "This moment is already under way, so it can be cancelled but not skipped."
        : "Couldn't update the moment. Try again.",
    };
  }

  revalidatePath(`/moments/${momentId}`);
  revalidatePath("/moments");
  revalidatePath("/dashboard");
  return { success: true };
}
