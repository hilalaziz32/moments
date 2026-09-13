import type { TaskContext } from "../poller/types.js";

/**
 * The people allowed to approve spend for an org: owners, admins and HR managers.
 *
 * Two queries rather than an embed -- org_members.user_id references auth.users,
 * not profiles, so there is no foreign key for PostgREST to follow.
 */
export async function approverEmails(
  db: TaskContext["db"],
  orgId: string,
): Promise<{ email: string; name: string }[]> {
  const { data: members } = await db
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "hr_manager"]);

  const ids = (members ?? []).map((m: { user_id: string }) => m.user_id);
  if (ids.length === 0) return [];

  const { data: profiles } = await db
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);

  return (profiles ?? [])
    .filter((p: { email: string | null }) => Boolean(p.email))
    .map((p: { email: string; full_name: string }) => ({ email: p.email, name: p.full_name }));
}
