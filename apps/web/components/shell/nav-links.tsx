"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, CircleCheck, House, Receipt, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Top navigation with the current section marked, so people know where they are. */
export function NavLinks({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("min-w-0 flex-1 items-center gap-1 overflow-x-auto", className)}>
      {items.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-surface-sunk font-medium text-ink" : "text-ink-muted hover:bg-surface-sunk hover:text-ink",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

const ICONS: Record<string, typeof House> = {
  "/dashboard": House,
  "/moments": CalendarHeart,
  "/approvals": CircleCheck,
  "/employees": Users,
  "/billing": Receipt,
  "/settings": Settings,
};

/**
 * Phones get a thumb-reachable tab bar. A top bar squeezed to 390px showed three
 * sections and silently hid the rest off-screen.
 */
export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const tabs = items.filter((i) => ICONS[i.href]).slice(0, 5);

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const Icon = ICONS[t.href]!;
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                  active ? "font-medium text-ink" : "text-ink-muted",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.25]")} aria-hidden />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
