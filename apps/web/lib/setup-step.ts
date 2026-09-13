import "server-only";

import type { ActiveOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";

/**
 * The setup step to send someone back to. Derived from what actually exists,
 * so "pick up where you left off" never restarts a finished step:
 *
 *   no people yet          -> import
 *   budgets never saved    -> budgets   (policies are pre-seeded with defaults,
 *                                        so only an explicit save counts)
 *   otherwise              -> go live
 */
export async function resumeSetupPath(org: ActiveOrg): Promise<string> {
  if (org.status !== "trial") return "/dashboard";

  const supabase = await createClient();
  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.orgId)
    .is("deleted_at", null);

  if (!count) return "/setup/import";
  if (!org.onboardingState.budgets_saved_at) return "/setup/budgets";
  if (!org.onboardingState.messages_seen_at) return "/setup/messages";
  return "/setup/review";
}
