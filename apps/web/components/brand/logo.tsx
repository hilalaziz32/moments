import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The Moments mark: a gift box whose ribbon is a calendar tick. Drawn in ink so
 * it sits with the rest of the system; colour stays reserved for state.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <rect x="1" y="1" width="22" height="22" rx="6" className="fill-ink" />
      <path d="M6 11h12v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18z" className="fill-[var(--paper)]" opacity="0.95" />
      <rect x="5" y="8" width="14" height="3.2" rx="1" className="fill-[var(--paper)]" />
      <rect x="11.1" y="8" width="1.8" height="11.5" className="fill-ink" />
      <path d="M12 8c-1.2-2.4-3.6-3-4.4-1.8C6.9 7.3 9 8 12 8zm0 0c1.2-2.4 3.6-3 4.4-1.8C17.1 7.3 15 8 12 8z" className="fill-[var(--paper)]" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-ink", className)}>
      <LogoMark />
      <span>Moments</span>
    </Link>
  );
}
