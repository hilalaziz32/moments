import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PaymentRow, type PaymentRowData } from "@/components/ops/payment-row";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

/**
 * Bank transfers waiting to be matched against the statement. There is no card
 * gateway in Pakistan worth the integration at this stage, so a person checking
 * the bank is the real mechanism -- and customers stay live while they wait.
 */
export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("id, amount_paisa, wht_paisa, bank_reference, paid_on, submitted_at, organizations(name), invoices(number, total_paisa)")
    .in("status", ["reported", "under_review"])
    .order("submitted_at");

  const rows: PaymentRowData[] = (data ?? []).map((p) => {
    const org = p.organizations as unknown as { name: string } | null;
    const inv = p.invoices as unknown as { number: string; total_paisa: number } | null;
    return {
      id: p.id,
      orgName: org?.name ?? "Unknown organisation",
      invoiceNumber: inv?.number ?? null,
      invoiceTotalPaisa: inv?.total_paisa ?? null,
      amountPaisa: p.amount_paisa,
      whtPaisa: p.wht_paisa,
      bankReference: p.bank_reference,
      paidOn: p.paid_on,
      submittedAt: p.submitted_at,
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Payments to verify</h1>
      <p className="mt-1 text-sm text-ink-muted">Match each one to the bank statement before verifying.</p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule-strong px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">Nothing waiting.</p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {rows.map((r) => <PaymentRow key={r.id} payment={r} />)}
        </div>
      )}
    </div>
  );
}
