import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/invitations";
import { ProfileForm, PasswordForm } from "@/components/settings/profile-forms";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone_e164").eq("id", user.id).maybeSingle();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Your profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {user.email} · {ROLE_LABEL[org.role] ?? org.role} at {org.orgName}
        </p>
      </div>

      <section className="rounded-lg border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Details</h2>
        <div className="mt-4">
          <ProfileForm fullName={profile?.full_name ?? user.fullName} phone={profile?.phone_e164 ?? null} />
        </div>
      </section>

      <section className="rounded-lg border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Password</h2>
        <div className="mt-4"><PasswordForm /></div>
      </section>
    </div>
  );
}
