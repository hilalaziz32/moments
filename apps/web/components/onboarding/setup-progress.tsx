"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Setup genuinely is a sequence, so an ordered progress rail is the honest
 * structure here rather than decoration. It uses the same dot-and-rule language
 * as the moment pipeline, so the two read as one system.
 */
const STEPS = [
  { href: "/setup",         label: "Company" },
  { href: "/setup/import",  label: "Your team" },
  { href: "/setup/budgets", label: "Budgets" },
  { href: "/setup/messages", label: "Messages" },
  { href: "/setup/review",  label: "Go live" },
] as const;

export function SetupProgress() {
  const pathname = usePathname();
  const current = Math.max(
    0,
    STEPS.findIndex((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)),
  );

  return (
    <ol className="flex items-center" aria-label="Setup progress">
      {STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "idle";
        return (
          <li key={step.href} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-full border-2",
                  state === "done" && "border-state-done bg-state-done",
                  state === "active" && "border-state-active bg-state-active",
                  state === "idle" && "border-state-idle bg-surface",
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  state === "idle" ? "text-ink-faint" : "font-medium text-ink",
                )}
              >
                {step.label}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn("mx-3 h-px flex-1", i < current ? "bg-state-done" : "bg-rule")}
              />
            )}
            <span className="sr-only">{state === "done" ? "completed" : state === "active" ? "current step" : "not started"}</span>
          </li>
        );
      })}
    </ol>
  );
}
