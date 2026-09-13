"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatPKR } from "@moments/core/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewPayment } from "@/app/actions/ops";
import { formatDate } from "@/lib/format";

export interface PaymentRowData {
  id: string;
  orgName: string;
  invoiceNumber: string | null;
  invoiceTotalPaisa: number | null;
  amountPaisa: number;
  whtPaisa: number;
  bankReference: string | null;
  paidOn: string | null;
  submittedAt: string;
}

export function PaymentRow({ payment }: { payment: PaymentRowData }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const covered = payment.amountPaisa + payment.whtPaisa;

  function review(approve: boolean) {
    start(async () => {
      const r = await reviewPayment(payment.id, approve, reason);
      if ("error" in r) toast.error(r.error);
      else setDone(approve ? "Verified" : "Rejected");
    });
  }

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink">{payment.orgName}</p>
          <p className="text-sm text-ink-muted">
            {payment.invoiceNumber ?? "No invoice"}
            {payment.paidOn ? `, paid ${formatDate(payment.paidOn)}` : ""}
          </p>
          <p className="mt-1 text-sm text-ink">Reference {payment.bankReference ?? "none given"}</p>
        </div>
        <div className="text-right text-sm">
          <p data-numeric className="text-ink">{formatPKR(payment.amountPaisa)}</p>
          {payment.whtPaisa > 0 && (
            <p data-numeric className="text-xs text-ink-muted">plus {formatPKR(payment.whtPaisa)} tax withheld</p>
          )}
          {payment.invoiceTotalPaisa !== null && (
            <p data-numeric className={covered >= payment.invoiceTotalPaisa ? "text-xs text-state-done" : "text-xs text-state-waiting"}>
              invoice {formatPKR(payment.invoiceTotalPaisa)}
            </p>
          )}
        </div>
      </div>

      {done ? (
        <p className="mt-3 text-sm text-ink-muted">{done}.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={pending} onClick={() => review(true)}>It&rsquo;s in the bank</Button>
          {rejecting ? (
            <>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why (the customer sees this)"
                aria-label="Rejection reason"
                className="h-8 w-72 text-xs"
                autoFocus
              />
              <Button size="sm" variant="destructive" disabled={pending || !reason.trim()} onClick={() => review(false)}>
                Reject
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>Can&rsquo;t find it</Button>
          )}
        </div>
      )}
    </div>
  );
}
