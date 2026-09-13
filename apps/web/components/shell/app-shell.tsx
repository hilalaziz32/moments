import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { ActiveOrg } from "@/lib/auth/org";
import type { CurrentUser } from "@/lib/auth/guard";
import { canManageBilling, canManagePeople } from "@/lib/auth/org";
import { ROLE_LABEL } from "@/lib/invitations";
import { NavLinks } from "./nav-links";

export function AppShell({
  org, user, resumeHref, children,
}: {
  org: ActiveOrg;
  user: CurrentUser;
  /** Where unfinished setup continues from; null once the org is live. */
  resumeHref: string | null;
  children: React.ReactNode;
}) {
  const nav = [
    { href: "/dashboard", label: "Today", show: true },
    { href: "/moments", label: "Moments", show: true },
    { href: "/approvals", label: "Approvals", show: canManagePeople(org.role) },
    { href: "/employees", label: "Team", show: canManagePeople(org.role) },
    { href: "/billing", label: "Billing", show: canManageBilling(org.role) },
    { href: "/settings", label: "Settings", show: true },
    { href: "/ops", label: "Ops", show: user.isPlatformStaff },
    { href: "/admin", label: "Admin", show: user.isSuperAdmin },
  ].filter((n) => n.show).map(({ href, label }) => ({ href, label }));

  const initials = (user.fullName || user.email || "?")
    .split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6">
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold tracking-tight text-ink">
            Moments
          </Link>
          <NavLinks items={nav} />

          {/* A real menu. Clicking your initials used to sign you out on the spot. */}
          <details className="group relative shrink-0">
            <summary
              className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-surface-sunk text-[11px] font-medium text-ink transition-colors hover:bg-rule [&::-webkit-details-marker]:hidden"
              aria-label="Account menu"
            >
              {initials}
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-60 rounded-lg border border-rule bg-card p-1 shadow-lg">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-ink">{user.fullName || user.email}</p>
                <p className="truncate text-xs text-ink-muted">{org.orgName} · {ROLE_LABEL[org.role] ?? org.role}</p>
              </div>
              <div className="my-1 h-px bg-rule" />
              <Link href="/settings/profile" className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-sunk">Your profile</Link>
              {canManagePeople(org.role) && (
                <Link href="/settings/team" className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-sunk">Invite teammates</Link>
              )}
              <form action={signOut}>
                <button type="submit" className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunk">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      {resumeHref && (
        <p className="border-b border-rule bg-surface-sunk px-6 py-2 text-center text-xs text-ink-muted">
          Setup isn&rsquo;t finished.{" "}
          <Link href={resumeHref} className="font-medium text-ink underline underline-offset-4">
            Pick up where you left off
          </Link>
        </p>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
