import type { Metadata } from "next";
import { formatPKR } from "@moments/core/money";
import { requireRole } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDayInZone, humanize } from "@/lib/format";
import { ReportPaymentForm } from "@/components/billing/report-payment-form";

export const metadata: Metadata = { title: "Billing" };

const INVOICE_STATUS: Record<string, string> = {
  draft: "Draft",
  issued: "Due",
  sent: "Due",
  partially_paid: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  written_off: "Written off",
};

const PAYMENT_STATUS: Record<string, string> = {
  reported: "We're checking",
  under_review: "We're checking",
  verified: "Verified",
  rejected: "Couldn't match",
  refunded: "Refunded",
};

const SUBSCRIPTION_STATUS: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment overdue",
  paused: "Paused",
  cancelled: "Cancelled",
};

export default async function BillingPage() {
  const org = await requireRole(["owner", "admin", "finance"]);
  const supabase = await createClient();

  const [{ data: subs }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, trial_ends_on, plans(name, base_price_paisa, included_employees, per_employee_paisa)")
      .eq("org_id", org.orgId)
      .in("status", ["trialing", "active", "past_due", "paused"])
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("invoices")
      .select("id, number, status, period_start, period_end, total_paisa, paid_paisa, wht_paisa, due_on")
      .eq("org_id", org.orgId)
      .neq("status", "draft")
      .order("period_start", { ascending: false })
      .limit(24),
    supabase
      .from("payments")
      .select("id, status, amount_paisa, paid_on, bank_reference, submitted_at, rejection_reason, invoices(number)")
      .eq("org_id", org.orgId)
      .order("submitted_at", { ascending: false })
      .limit(10),
  ]);

  const sub = subs?.[0];
  const plan = sub?.plans as unknown as {
    name: string; base_price_paisa: number; included_employees: number; per_employee_paisa: number;
  } | null;

  const open = (invoices ?? [])
    .filter((i) => ["issued", "sent", "partially_paid", "overdue"].includes(i.status))
    .map((i) => ({
      id: i.id,
      number: i.number,
      outstandingRupees: Math.max(0, Math.round((i.total_paisa - i.paid_paisa - i.wht_paisa) / 100)),
    }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-ink">Billing</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-muted">
          One invoice a month: your plan, plus the gifts that were actually delivered.
          You&rsquo;re never billed for a gift that didn&rsquo;t arrive.
        </p>
      </div>

      <section className="rounded-lg border border-rule bg-card p-5">
        <p className="text-xs font-medium text-ink-muted">Plan</p>
        {sub && plan ? (
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-medium text-ink">{plan.name}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {formatPKR(plan.base_price_paisa)} a month
                {plan.included_employees > 0 && ` for up to ${plan.included_employees} people`}
                {plan.per_employee_paisa > 0 && `, then ${formatPKR(plan.per_employee_paisa)} per person`}
              </p>
            </div>
            <p className="text-sm text-ink">
              {SUBSCRIPTION_STATUS[sub.status] ?? humanize(sub.status)}
              {sub.status === "trialing" && sub.trial_ends_on && (
                <span className="text-ink-muted"> · ends {formatDate(sub.trial_ends_on)}</span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No active plan yet.</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Invoices</h2>
        {!invoices || invoices.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-rule-strong px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink">No invoices yet.</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
              Your first one arrives at the end of your first full month.
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-rule bg-card">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Invoice</th>
                  <th className="px-5 py-2.5 font-medium">Period</th>
                  <th className="px-5 py-2.5 font-medium">Due</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="px-5 py-3 font-medium text-ink" data-numeric>{i.number}</td>
                    <td className="px-5 py-3 text-ink-muted">
                      {formatDate(i.period_start, { year: false })} – {formatDate(i.period_end)}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{i.due_on ? formatDate(i.due_on) : "—"}</td>
                    <td className="px-5 py-3 text-right text-ink" data-numeric>{formatPKR(i.total_paisa)}</td>
                    <td className="px-5 py-3 text-ink">{INVOICE_STATUS[i.status] ?? humanize(i.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Tell us you&rsquo;ve paid</h2>
        <p className="mt-1 max-w-lg text-sm text-ink-muted">
          Pay by bank transfer and use the invoice number as the reference.
        </p>
        <div className="mt-4 rounded-lg border border-rule bg-card p-5">
          <ReportPaymentForm invoices={open} />
        </div>
      </section>

      {payments && payments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink">Payments</h2>
          <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
            {payments.map((p) => {
              const inv = p.invoices as unknown as { number: string } | null;
              return (
                <div key={p.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-ink" data-numeric>{formatPKR(p.amount_paisa)}</span>
                    <span className="text-ink-muted">
                      {" "}· {p.paid_on ? formatDate(p.paid_on) : formatDayInZone(p.submitted_at, org.timezone)}
                      {inv && ` · ${inv.number}`}
                      {p.bank_reference && ` · ref ${p.bank_reference}`}
                    </span>
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">{p.rejection_reason}</p>
                    )}
                  </div>
                  <span className="text-ink">{PAYMENT_STATUS[p.status] ?? humanize(p.status)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
