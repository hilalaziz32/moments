import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, type OrgRole } from "./guard";

export const ACTIVE_ORG_COOKIE = "moments_org";

export interface ActiveOrg {
  orgId: string;
  orgName: string;
  slug: string;
  role: OrgRole;
  timezone: string;
  status: string;
  onboardingState: Record<string, unknown>;
}

/**
 * Resolves the active organisation for this request.
 *
 * THE COOKIE IS A CONVENIENCE, NOT A SECURITY BOUNDARY. Membership is verified
 * against org_members through RLS, so a forged cookie naming another org simply
 * returns no rows and we fall through to the user's real membership.
 */
export const getActiveOrg = cache(async (): Promise<ActiveOrg | null> => {
  const user = await requireUser();
  const supabase = await createClient();
  const cookieStore = await cookies();
  const requested = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(id, name, slug, timezone, status, onboarding_state)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) return null;

  const pick =
    memberships.find((m) => m.org_id === requested) ??
    memberships.find((m) => m.org_id === user.defaultOrgId) ??
    memberships[0]!;

  const org = pick.organizations as unknown as {
    id: string; name: string; slug: string; timezone: string;
    status: string; onboarding_state: Record<string, unknown>;
  } | null;
  if (!org) return null;

  return {
    orgId: org.id,
    orgName: org.name,
    slug: org.slug,
    role: pick.role,
    timezone: org.timezone,
    status: org.status,
    onboardingState: org.onboarding_state ?? {},
  };
});

export async function requireOrg(): Promise<ActiveOrg> {
  const org = await getActiveOrg();
  if (!org) redirect("/setup");
  return org;
}

const RANK: Record<OrgRole, number> = {
  owner: 5, admin: 4, hr_manager: 3, finance: 2, manager: 2, viewer: 1,
};

export async function requireRole(allowed: OrgRole[]): Promise<ActiveOrg> {
  const org = await requireOrg();
  if (!allowed.includes(org.role)) redirect("/dashboard");
  return org;
}

export function canManagePeople(role: OrgRole): boolean {
  return role === "owner" || role === "admin" || role === "hr_manager";
}
export function canManageBilling(role: OrgRole): boolean {
  return role === "owner" || role === "admin" || role === "finance";
}
export function isOrgAdmin(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}
export { RANK as ROLE_RANK };
