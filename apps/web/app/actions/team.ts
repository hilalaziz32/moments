"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guard";
import { ACTIVE_ORG_COOKIE, isOrgAdmin, requireOrg } from "@/lib/auth/org";
import { mintToken } from "@/lib/tokens";
import { resolveInvite } from "@/lib/invitations";
import { appOrigin } from "@/lib/origin";
import type { ActionResult } from "@/app/actions/onboarding";

/**
 * Team members and invitations.
 *
 * Email is on hold, so an invitation is a link the admin shares themselves
 * (WhatsApp, Slack). The link only works for the email it was made for, and
 * only once that email is confirmed -- a forwarded link can't let a stranger in.
 *
 * Tokens and memberships are written with the service client: action_tokens has
 * no tenant privileges at all, and the invitee isn't a member yet. Every action
 * checks the caller's role first.
 */

const INVITABLE = ["admin", "hr_manager", "finance", "manager", "viewer"] as const;
const ALL_ROLES = ["owner", ...INVITABLE] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_DAYS = 7;

export async function inviteMember(_prev: unknown, fd: FormData): Promise<ActionResult<{ link: string; email: string }>> {
  const user = await requireUser();
  const org = await requireOrg();
  if (!isOrgAdmin(org.role)) return { error: "Only an owner or admin can invite people." };

  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role") ?? "") as (typeof INVITABLE)[number];

  const fieldErrors: Record<string, string> = {};
  if (!EMAIL.test(email)) fieldErrors.email = "Enter their work email.";
  if (!INVITABLE.includes(role)) fieldErrors.role = "Pick a role.";
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const db = createAdminClient();
  const { data: existing } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    const { data: m } = await db.from("org_members").select("status").eq("org_id", org.orgId).eq("user_id", existing.id).maybeSingle();
    if (m?.status === "active") return { error: "They're already on the team.", fieldErrors: { email: "Already a member." } };
  }

  // One live invitation per email: making a new link kills the old one.
  const now = new Date().toISOString();
  const { data: stale } = await db
    .from("invitations")
    .update({ revoked_at: now })
    .eq("org_id", org.orgId).eq("email", email).is("accepted_at", null).is("revoked_at", null)
    .select("id");
  if (stale?.length) {
    await db.from("action_tokens").update({ revoked_at: now, revoked_reason: "replaced" } as never)
      .eq("subject_type", "invitation").in("subject_id", stale.map((s) => s.id));
  }

  const { data: inv, error } = await db
    .from("invitations")
    .insert({ org_id: org.orgId, email, role, invited_by: user.id })
    .select("id")
    .single();
  if (error || !inv) return { error: "Couldn't create the invitation. Try again." };

  const t = mintToken();
  const { data: tok, error: tokenError } = await db
    .from("action_tokens")
    .insert({
      org_id: org.orgId,
      purpose: "invitation",
      token_hash: t.hashBytea,
      token_lookup: t.lookup,
      subject_type: "invitation",
      subject_id: inv.id,
      issued_to_email: email,
      expires_at: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(),
      max_uses: 5,
      created_by: user.id,
    } as never)
    .select("id")
    .single();
  if (tokenError || !tok) return { error: "Couldn't create the invitation link. Try again." };

  await db.from("invitations").update({ token_id: (tok as { id: string }).id }).eq("id", inv.id);
  await db.from("audit_log").insert({
    org_id: org.orgId, actor_user_id: user.id, action: "member.invited", entity: "invitations", entity_id: inv.id,
    after: { email, role } as never,
  } as never);

  revalidatePath("/settings/team");
  return { success: true, link: `${await appOrigin()}/join/${t.token}`, email };
}

export async function revokeInvite(fd: FormData): Promise<void> {
  const org = await requireOrg();
  if (!isOrgAdmin(org.role)) return;
  const invitationId = String(fd.get("invitationId") ?? "");
  const now = new Date().toISOString();

  const supabase = await createClient();
  await supabase.from("invitations").update({ revoked_at: now }).eq("id", invitationId).eq("org_id", org.orgId);
  await createAdminClient().from("action_tokens").update({ revoked_at: now, revoked_reason: "revoked" } as never)
    .eq("subject_type", "invitation").eq("subject_id", invitationId).eq("org_id", org.orgId);

  revalidatePath("/settings/team");
}

async function guardMemberChange(memberId: string, nextRole: string | null) {
  const user = await requireUser();
  const org = await requireOrg();
  if (!isOrgAdmin(org.role)) return { ok: false, error:"Only an owner or admin can change the team." } as const;

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("org_members").select("id, user_id, role").eq("id", memberId).eq("org_id", org.orgId).maybeSingle();
  if (!member) return { ok: false, error:"That person isn't on the team." } as const;
  if (member.user_id === user.id) return { ok: false, error:"You can't change your own access. Ask another admin." } as const;
  if ((member.role === "owner" || nextRole === "owner") && org.role !== "owner") {
    return { ok: false, error:"Only an owner can make or change an owner." } as const;
  }
  if (member.role === "owner" && nextRole !== "owner") {
    const { count } = await supabase.from("org_members").select("id", { count: "exact", head: true })
      .eq("org_id", org.orgId).eq("role", "owner").eq("status", "active");
    if ((count ?? 0) <= 1) return { ok: false, error:"Every account needs an owner. Make someone else owner first." } as const;
  }
  return { ok: true, org, supabase, member } as const;
}

export async function changeRole(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const role = String(fd.get("role") ?? "") as (typeof ALL_ROLES)[number];
  if (!ALL_ROLES.includes(role)) return { error: "Pick a role." };

  const g = await guardMemberChange(String(fd.get("memberId") ?? ""), role);
  if (!g.ok) return { error: g.error };

  const { error } = await g.supabase.from("org_members").update({ role }).eq("id", g.member.id).eq("org_id", g.org.orgId);
  if (error) return { error: "Couldn't change their role. Try again." };

  revalidatePath("/settings/team");
  return { success: true };
}

export async function removeMember(fd: FormData): Promise<void> {
  const g = await guardMemberChange(String(fd.get("memberId") ?? ""), null);
  if (!g.ok) return;
  await g.supabase.from("org_members").update({ status: "removed" }).eq("id", g.member.id).eq("org_id", g.org.orgId);
  revalidatePath("/settings/team");
}

/** The invitee's side: join the org the link was made for. */
export async function acceptInvite(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  const joinPath = `/join/${token}`;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(joinPath)}`);

  const invite = await resolveInvite(token);
  if (invite.state !== "ok") redirect(joinPath);
  // The confirmed auth email, never the editable profile email.
  if (!user.email_confirmed_at || user.email?.toLowerCase() !== invite.email) redirect(joinPath);

  const db = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await db.from("org_members").upsert(
    { org_id: invite.orgId, user_id: user.id, role: invite.role as (typeof ALL_ROLES)[number], status: "active", invited_by: invite.inviterId },
    { onConflict: "org_id,user_id" },
  );
  if (error) redirect(joinPath);

  await db.from("invitations").update({ accepted_at: now, accepted_by: user.id }).eq("id", invite.invitationId);
  await db.from("action_tokens").update({ consumed_at: now, last_used_at: now, use_count: invite.useCount + 1 } as never).eq("id", invite.tokenId);
  await db.from("profiles").update({ default_org_id: invite.orgId }).eq("id", user.id).is("default_org_id", null);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, invite.orgId, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
