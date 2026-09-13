import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveInvite, ROLE_HINT, ROLE_LABEL } from "@/lib/invitations";
import { acceptInvite, } from "@/app/actions/team";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Join your team" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await resolveInvite(token);
  const joinPath = `/join/${token}`;

  if (invite.state !== "ok") {
    const copy = {
      invalid: { title: "This invite link doesn't work", body: "Check you copied the whole link, or ask for a new one." },
      expired: { title: "This invite has expired", body: "Invite links last 7 days. Ask whoever invited you for a new one." },
      revoked: { title: "This invite was cancelled", body: "Ask whoever invited you for a new link." },
      accepted: { title: "This invite has already been used", body: "If it was you, just sign in." },
    }[invite.state];
    return (
      <div>
        <h1 className="text-xl font-semibold text-ink">{copy.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{copy.body}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-ink underline underline-offset-4">Sign in</Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const signedInEmail = user?.email?.toLowerCase() ?? null;
  const q = `next=${encodeURIComponent(joinPath)}&email=${encodeURIComponent(invite.email)}`;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Invitation</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">Join {invite.orgName} on Moments</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {invite.inviterName ? `${invite.inviterName} invited you` : "You've been invited"} as{" "}
        <span className="font-medium text-ink">{ROLE_LABEL[invite.role] ?? invite.role}</span>.{" "}
        {ROLE_HINT[invite.role]}
      </p>

      <div className="mt-8 rounded-lg border border-rule bg-card p-5">
        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">This invite is for <span className="font-medium">{invite.email}</span>.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild><Link href={`/signup?${q}`}>Create account</Link></Button>
              <Button asChild variant="outline"><Link href={`/login?${q}`}>I have an account</Link></Button>
            </div>
          </div>
        ) : signedInEmail !== invite.email ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              You&rsquo;re signed in as <span className="font-medium">{user.email}</span>, but this invite is for{" "}
              <span className="font-medium">{invite.email}</span>.
            </p>
            <form action={signOut}>
              <Button type="submit" variant="outline">Sign out and switch account</Button>
            </form>
          </div>
        ) : !user.email_confirmed_at ? (
          <p className="text-sm text-ink">Confirm your email first. Check your inbox, then open this link again.</p>
        ) : (
          <form action={acceptInvite} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-ink">Signed in as <span className="font-medium">{user.email}</span>.</p>
            <Button type="submit">Join {invite.orgName}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
