import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { isSuperAdminUser } from "./super-admin";
import { createClient } from "@/lib/supabase/server";
import type { MomentsEnums } from "@/lib/supabase/types";

export type OrgRole = MomentsEnums["org_role"];

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string;
  defaultOrgId: string | null;
  isPlatformStaff: boolean;
  /** The SaaS owner (SUPER_ADMIN_EMAILS, verified email). Opens /admin. */
  isSuperAdmin: boolean;
}

/**
 * Wrapped in React cache() so layout, page and nested components share one
 * lookup per request rather than hitting Supabase three times.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: staff }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, default_org_id").eq("id", user.id).maybeSingle(),
    supabase.from("staff_users").select("user_id").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  ]);

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? "",
    defaultOrgId: profile?.default_org_id ?? null,
    isPlatformStaff: Boolean(staff),
    isSuperAdmin: isSuperAdminUser(user),
  };
});

/** 404s for everyone else, so the admin area doesn't even admit it exists. */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) notFound();
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePlatformStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isPlatformStaff) redirect("/dashboard");
  return user;
}
