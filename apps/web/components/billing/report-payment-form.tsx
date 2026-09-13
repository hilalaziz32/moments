"use client";

import { useActionState } from "react";
import { reportPayment } from "@/app/actions/billing";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ReportPaymentForm({
  invoices,
}: {
  invoices: { id: string; number: string; outstandingRupees: number }[];
}) {
  const [state, action, pending] = useActionState(reportPayment, null as ActionResult | null);
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  if (state && "success" in state) {
    return (
      <p role="status" className="text-sm text-ink-muted">
        Thanks. We&rsquo;ll match it against our bank statement and mark the invoice paid.
        Your moments keep running while we check.
      </p>
    );
  }

  const field = (name: string) => cn(inputClass, errors[name] ? "border-destructive" : "border-input");

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {invoices.length > 0 && (
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="text-ink-muted">For invoice</span>
          <select name="invoiceId" className={field("invoiceId")} defaultValue={invoices[0]!.id}>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>{i.number}</option>
            ))}
            <option value="">Not for a specific invoice</option>
          </select>
        </label>
      )}

      <label className="grid gap-1.5 text-sm">
        <span className="text-ink-muted">Amount transferred (PKR)</span>
        <input
          name="amount" inputMode="decimal" data-numeric required
          defaultValue={invoices[0]?.outstandingRupees || undefined}
          aria-invalid={errors.amount ? true : undefined} className={field("amount")}
        />
        {errors.amount && <span className="text-xs text-destructive">{errors.amount}</span>}
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-ink-muted">Tax withheld, if any (PKR)</span>
        <input name="wht" inputMode="decimal" data-numeric className={field("wht")} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-ink-muted">Date of transfer</span>
        <input
          name="paidOn" type="date" required
          aria-invalid={errors.paidOn ? true : undefined} className={field("paidOn")}
        />
        {errors.paidOn && <span className="text-xs text-destructive">{errors.paidOn}</span>}
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-ink-muted">Bank reference</span>
        <input
          name="reference" required maxLength={120} placeholder="e.g. IBFT 00412345"
          aria-invalid={errors.reference ? true : undefined} className={field("reference")}
        />
        {errors.reference && <span className="text-xs text-destructive">{errors.reference}</span>}
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Sending…" : "I've paid"}</Button>
        {state && "error" in state && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}
