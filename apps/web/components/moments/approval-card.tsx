"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatPKR } from "@moments/core/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideApproval } from "@/app/actions/approvals";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ApprovalCardData {
  id: string;
  momentId: string;
  employeeName: string;
  department: string | null;
  momentLabel: string;
  occursOn: string;
  amountPaisa: number;
  budgetPaisa: number;
  summary: string | null;
  autoApproveAt: string | null;
}

export function ApprovalCard({
  approval, timezone, canDecide,
}: {
  approval: ApprovalCardData;
  timezone: string;
  canDecide: boolean;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const over = approval.amountPaisa > approval.budgetPaisa;

  function decide(decision: "approved" | "rejected") {
    start(async () => {
      const r = await decideApproval(approval.id, decision, note);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setDone(r.decision);
      toast.success(r.decision === "rejected"
        ? `Declined the gift for ${approval.employeeName}.`
        : `Approved the gift for ${approval.employeeName}.`);
    });
  }

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/moments/${approval.momentId}`} className="font-medium text-ink hover:underline">
            {approval.employeeName}
          </Link>
          <p className="text-sm text-ink-muted">
            {approval.momentLabel}, {formatDate(approval.occursOn, { year: false })}
            {approval.department ? `, ${approval.department}` : ""}
          </p>
          {approval.summary && <p className="mt-2 text-sm text-ink">{approval.summary}</p>}
        </div>
        <div className="text-right">
          <p data-numeric className="text-sm font-medium text-ink">{formatPKR(approval.amountPaisa)}</p>
          <p className={cn("text-xs", over ? "text-state-waiting" : "text-ink-faint")}>
            {over ? "over" : "within"} the {formatPKR(approval.budgetPaisa)} budget
          </p>
        </div>
      </div>

      {done ? (
        <p className="mt-3 text-sm text-ink-muted">
          {done === "rejected" ? "Declined." : done === "auto_approved" ? "It had already gone ahead automatically." : "Approved."}
        </p>
      ) : canDecide ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Note"
            className="h-8 w-56"
          />
          <Button size="sm" disabled={pending} onClick={() => decide("approved")}>Approve</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("rejected")}>Decline</Button>
          {approval.autoApproveAt && (
            <span className="text-xs text-ink-faint">
              Goes ahead on its own {formatDateTime(approval.autoApproveAt, timezone)}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-faint">An HR admin needs to decide this one.</p>
      )}
    </div>
  );
}
