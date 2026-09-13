"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatPKR } from "@moments/core/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrderStatus } from "@/app/actions/ops";

export interface QueueRow {
  id: string;
  order_number: string;
  status: string;
  deliver_on: string;
  ops_sla_due_at: string | null;
  city: string | null;
  org_name: string;
  recipient_name: string;
  recipient_phone: string | null;
  address_snapshot: Record<string, string | null> | null;
  dietary_snapshot: Record<string, unknown> | null;
  total_price_paisa: number;
  total_cost_paisa: number;
  margin_paisa: number;
  vendor_name: string | null;
  is_fallback: boolean;
  days_until_delivery: number;
}

const STATUS_LABEL: Record<string, string> = {
  queued_for_ops: "To place",
  approved: "To place",
  placed_with_vendor: "With vendor",
  in_transit: "On the way",
};

export function OrderRow({ row }: { row: QueueRow }) {
  const [pending, start] = useTransition();
  const [vendorRef, setVendorRef] = useState("");
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState(false);

  const addr = row.address_snapshot ?? {};
  const diet = row.dietary_snapshot ?? {};
  const dietary = [diet.halalOnly && "halal", diet.eggless && "eggless", diet.vegetarian && "vegetarian"]
    .filter(Boolean)
    .join(", ");
  const toPlace = row.status === "queued_for_ops" || row.status === "approved";
  const unconfirmed = addr.verification && addr.verification !== "employee_confirmed" && addr.verification !== "hr_confirmed";

  function act(status: string, opts: { vendorRef?: string; reason?: string } = {}) {
    start(async () => {
      const r = await updateOrderStatus(row.id, status, opts);
      if ("error" in r) toast.error(r.error);
      else toast.success(`${row.order_number} updated.`);
    });
  }

  return (
    <div className="border-b border-rule px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-ink">{row.recipient_name}</span>
            <span className="text-sm text-ink-muted">{row.org_name}</span>
            {row.is_fallback && <span className="text-xs text-state-waiting">digital backup</span>}
          </p>
          <p className="mt-1 text-sm text-ink">
            {[addr.line1, addr.line2, addr.area, addr.city ?? addr.cityText].filter(Boolean).join(", ") || "No address on file"}
          </p>
          {addr.landmark && <p className="text-sm text-ink-muted">Near {addr.landmark}</p>}
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-faint">
            <span>{row.recipient_phone ?? "no phone"}</span>
            {dietary && <span>{dietary}</span>}
            {unconfirmed && <span className="text-state-waiting">address not confirmed by them</span>}
          </p>
        </div>
        <div className="text-right text-sm">
          <p data-numeric className="text-ink">{formatPKR(row.total_price_paisa)}</p>
          <p data-numeric className="text-xs text-ink-faint">
            cost {formatPKR(row.total_cost_paisa)}, margin {formatPKR(row.margin_paisa)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-ink-muted">
          {row.order_number}, {STATUS_LABEL[row.status] ?? row.status}
          {row.vendor_name ? `, ${row.vendor_name}` : ""}
        </span>

        {toPlace && (
          <>
            <Input
              value={vendorRef}
              onChange={(e) => setVendorRef(e.target.value)}
              placeholder="Vendor's order number"
              aria-label="Vendor order reference"
              className="h-8 w-44 text-xs"
            />
            <Button size="sm" disabled={pending} onClick={() => act("placed_with_vendor", { vendorRef })}>
              Mark placed
            </Button>
          </>
        )}
        {row.status === "placed_with_vendor" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act("in_transit")}>
            Mark on the way
          </Button>
        )}
        {(row.status === "placed_with_vendor" || row.status === "in_transit") && (
          <Button size="sm" disabled={pending} onClick={() => act("delivered")}>Mark delivered</Button>
        )}
        <Button size="sm" variant="ghost" aria-expanded={problem} onClick={() => setProblem((p) => !p)}>
          Problem
        </Button>
      </div>

      {problem && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What went wrong"
            aria-label="Reason"
            className="h-8 w-72 text-xs"
          />
          <Button size="sm" variant="outline" disabled={pending || !reason.trim()} onClick={() => act("failed", { reason })}>
            Mark failed
          </Button>
          <Button size="sm" variant="destructive" disabled={pending || !reason.trim()} onClick={() => act("cancelled", { reason })}>
            Cancel order
          </Button>
        </div>
      )}
    </div>
  );
}
