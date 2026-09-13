import "server-only";

import { webConfig } from "@/lib/config";

/**
 * The SaaS owner: whoever's sign-in email is listed in SUPER_ADMIN_EMAILS.
 *
 * Checked against the AUTH user's email, and only once Supabase has confirmed
 * it. Never against moments.profiles.email -- users can edit their own profile
 * row, so trusting it would let anyone type the owner's address and walk in.
 */
export function isSuperAdminUser(user: { email?: string | null; email_confirmed_at?: string | null } | null): boolean {
  if (!user?.email || !user.email_confirmed_at) return false;
  return webConfig.superAdminEmails.includes(user.email.toLowerCase());
}
