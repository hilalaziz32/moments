import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guard";

/**
 * The owner's area: every customer account, and the Twilio sender each one
 * texts from. Styled like ops on purpose -- nobody should mistake a page that
 * sees every customer for the customer app.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();

  return (
    <div className="min-h-dvh">
      <header className="bg-ink text-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <span className="text-sm font-semibold tracking-tight">Moments admin</span>
          <nav className="flex flex-1 items-center gap-1 text-sm">
            {[
              { href: "/admin", label: "Accounts" },
              { href: "/admin/twilio", label: "Twilio" },
            ].map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1.5 opacity-80 hover:bg-white/10 hover:opacity-100">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-xs opacity-60 sm:block">{user.email}</span>
          <Link href="/dashboard" className="text-xs opacity-80 hover:opacity-100">Customer app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
