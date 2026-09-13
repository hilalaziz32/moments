import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN_FORMAT, tokenMatches } from "@/lib/tokens";

/**
 * Resolves an invitation link. Service client, because the person opening it
 * is by definition not yet a member and no policy could let them see the row.
 * Returns only what the join page needs to show.
 */

export type InviteLookup =
  | { state: "invalid" }
  | { state: "expired" | "revoked" | "accepted"; orgName: string }
  | {
      state: "ok";
      tokenId: string;
      useCount: number;
      invitationId: string;
      orgId: string;
      orgName: string;
      email: string;
      role: string;
      inviterId: string | null;
      inviterName: string | null;
    };

export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  hr_manager: "HR manager",
  finance: "Finance",
  manager: "Manager",
  viewer: "Viewer",
};

export const ROLE_HINT: Record<string, string> = {
  owner: "Everything, including removing the account.",
  admin: "Everything: people, budgets, messages, billing and the team.",
  hr_manager: "People, moments, approvals and news. Can't change budgets or billing.",
  finance: "Billing and invoices.",
  manager: "Sees upcoming moments.",
  viewer: "Can look, can't change anything.",
};

export async function resolveInvite(token: string): Promise<InviteLookup> {
  if (!TOKEN_FORMAT.test(token)) return { state: "invalid" };

  const db = createAdminClient();
  const { data: rows } = await db
    .from("action_tokens")
    .select("id, token_hash, subject_id, expires_at, revoked_at, consumed_at, use_count, max_uses")
    .eq("token_lookup", token.slice(0, 12))
    .eq("purpose", "invitation");

  const row = (rows ?? []).find((r) => tokenMatches(token, String(r.token_hash)));
  if (!row) return { state: "invalid" };

  const { data: inv } = await db
    .from("invitations")
    .select("id, org_id, email, role, accepted_at, revoked_at, invited_by, organizations(name)")
    .eq("id", row.subject_id)
    .maybeSingle();
  if (!inv) return { state: "invalid" };

  const orgName = (inv.organizations as unknown as { name: string } | null)?.name ?? "your team";
  if (inv.accepted_at) return { state: "accepted", orgName };
  if (inv.revoked_at || row.revoked_at) return { state: "revoked", orgName };
  if (new Date(row.expires_at) < new Date() || row.use_count >= row.max_uses) return { state: "expired", orgName };

  let inviterName: string | null = null;
  if (inv.invited_by) {
    const { data: p } = await db.from("profiles").select("full_name").eq("id", inv.invited_by).maybeSingle();
    inviterName = p?.full_name || null;
  }

  return {
    state: "ok",
    tokenId: row.id,
    useCount: row.use_count,
    invitationId: inv.id,
    orgId: inv.org_id,
    orgName,
    email: inv.email,
    role: inv.role,
    inviterId: inv.invited_by,
    inviterName,
  };
}
