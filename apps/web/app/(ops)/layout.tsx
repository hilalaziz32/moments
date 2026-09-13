import Link from "next/link";
import { requirePlatformStaff } from "@/lib/auth/guard";

/**
 * The cross-tenant staff area. It looks different from the customer app on
 * purpose: someone here can see every organisation's orders, and the chrome
 * should never let them forget it.
 */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const staff = await requirePlatformStaff();

  return (
    <div className="min-h-dvh">
      <header className="bg-ink text-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <span className="text-sm font-semibold tracking-tight">Moments ops</span>
          <nav className="flex flex-1 items-center gap-1 text-sm">
            {[
              { href: "/ops", label: "Orders" },
              { href: "/ops/payments", label: "Payments" },
              { href: "/ops/catalog", label: "Catalogue" },
            ].map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1.5 opacity-80 hover:bg-white/10 hover:opacity-100">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-xs opacity-60 sm:block">{staff.email}</span>
          <Link href="/dashboard" className="text-xs opacity-80 hover:opacity-100">Customer app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
