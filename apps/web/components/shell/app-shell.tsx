import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { ActiveOrg } from "@/lib/auth/org";
import type { CurrentUser } from "@/lib/auth/guard";
import { canManageBilling, canManagePeople } from "@/lib/auth/org";

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
    { href: "/settings/moments", label: "Budgets", show: canManagePeople(org.role) },
    { href: "/settings/messages", label: "Messages", show: canManagePeople(org.role) },
    { href: "/billing", label: "Billing", show: canManageBilling(org.role) },
    { href: "/ops", label: "Ops", show: user.isPlatformStaff },
    { href: "/admin", label: "Admin", show: user.isSuperAdmin },
  ].filter((n) => n.show);

  const initials = (user.fullName || user.email || "?")
    .split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-ink">
            Moments
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunk hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-xs text-ink-faint sm:block">{org.orgName}</span>
          <form action={signOut}>
            <button
              type="submit"
              title={`Signed in as ${user.email ?? ""} — sign out`}
              className="flex size-7 items-center justify-center rounded-full bg-surface-sunk text-[11px] font-medium text-ink transition-colors hover:bg-rule"
            >
              {initials}
            </button>
          </form>
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

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
