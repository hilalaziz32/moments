"use client";

import { useActionState, useMemo, useState } from "react";
import { formatPKR, formatPaisaCompact } from "@moments/core/money";
import { saveBudgets, type ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PolicyRow {
  id: string;
  key: string;
  label: string;
  isEnabled: boolean;
  budgetPaisa: number;
  approvalRequired: boolean;
  upcomingCount: number;
}

export function BudgetGrid({
  policies, employeeCount, missingDates,
}: {
  policies: PolicyRow[];
  employeeCount: number;
  missingDates: number;
}) {
  const [state, action, pending] = useActionState(saveBudgets, null as ActionResult | null);
  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  const [local, setLocal] = useState(() =>
    Object.fromEntries(
      policies.map((p) => [p.id, {
        enabled: p.isEnabled,
        rupees: Math.round(p.budgetPaisa / 100),
        approval: p.approvalRequired,
      }]),
    ),
  );

  /*
   * The live estimate. This is the moment the buyer understands the price, so it
   * uses the SAME computeMomentPlans() counts the detector will produce -- the
   * number quoted here is the number that actually materialises.
   */
  const estimate = useMemo(() => {
    let moments = 0;
    let paisa = 0;
    for (const p of policies) {
      const l = local[p.id];
      if (!l?.enabled) continue;
      moments += p.upcomingCount;
      paisa += p.upcomingCount * l.rupees * 100;
    }
    return { moments, paisa };
  }, [policies, local]);

  return (
    <form action={action} className="mt-8 grid gap-8 lg:grid-cols-[1fr_16rem] lg:items-start">
      <div className="divide-y divide-rule rounded-lg border border-rule bg-card">
        {policies.map((p) => {
          const l = local[p.id]!;
          const err = fieldErrors?.[`budget:${p.id}`];
          return (
            <div key={p.id} className={cn("px-5 py-4", !l.enabled && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    name={`enabled:${p.id}`}
                    checked={l.enabled}
                    onChange={(e) =>
                      setLocal((s) => ({ ...s, [p.id]: { ...l, enabled: e.target.checked } }))
                    }
                    className="size-4 rounded border-input accent-[var(--state-active)]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{p.label}</span>
                    <span className="block text-xs text-ink-faint">
                      {p.upcomingCount === 0
                        ? "none coming up in 90 days"
                        : `${p.upcomingCount} in the next 90 days`}
                    </span>
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">PKR</span>
                  <input
                    type="number"
                    name={`budget:${p.id}`}
                    value={l.rupees}
                    min={0}
                    step={500}
                    disabled={!l.enabled}
                    onChange={(e) =>
                      setLocal((s) => ({ ...s, [p.id]: { ...l, rupees: Number(e.target.value) } }))
                    }
                    aria-label={`${p.label} budget in rupees`}
                    aria-invalid={err ? true : undefined}
                    data-numeric
                    className={cn(
                      "h-9 w-28 rounded-md border bg-surface px-3 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      err ? "border-destructive" : "border-input",
                    )}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    name={`approval:${p.id}`}
                    checked={l.approval}
                    disabled={!l.enabled}
                    onChange={(e) =>
                      setLocal((s) => ({ ...s, [p.id]: { ...l, approval: e.target.checked } }))
                    }
                    className="size-4 rounded border-input accent-[var(--state-active)]"
                  />
                  Ask me first
                </label>
              </div>
              {err && <p role="alert" className="mt-2 text-xs text-destructive">{err}</p>}
            </div>
          );
        })}
      </div>

      <aside className="rounded-lg border border-rule bg-card p-5 lg:sticky lg:top-6">
        <p className="text-xs font-medium text-ink-muted">Next 90 days</p>
        <p data-numeric className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {formatPKR(estimate.paisa)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          across {estimate.moments} {estimate.moments === 1 ? "moment" : "moments"} for{" "}
          {employeeCount} {employeeCount === 1 ? "person" : "people"}
        </p>

        {missingDates > 0 && (
          <p className="mt-4 border-t border-rule pt-4 text-xs text-ink-muted">
            {missingDates} {missingDates === 1 ? "person is" : "people are"} missing a date.
            We&rsquo;ll ask them directly, and this number will grow.
          </p>
        )}

        {state && "error" in state && !fieldErrors && (
          <p role="alert" className="mt-4 text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="mt-5 w-full" disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </aside>
    </form>
  );
}
