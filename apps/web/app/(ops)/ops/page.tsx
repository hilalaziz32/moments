import type { Metadata } from "next";
import { formatPKR } from "@moments/core/money";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/ops/auto-refresh";
import { OrderRow, type QueueRow } from "@/components/ops/order-row";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

function whenLabel(days: number): string {
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} late`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/**
 * The fulfilment queue. Grouped by delivery date because that is the only order
 * of work that matters: what has to reach someone soonest.
 */
export default async function OpsQueuePage() {
  const supabase = await createClient();
  // Gated inside the database by is_platform_staff(); a customer calling this
  // gets an error, not an empty list.
  const { data, error } = await supabase.rpc("ops_order_queue", { p_limit: 300 } as never);
  const rows = (data ?? []) as unknown as QueueRow[];

  const toPlace = rows.filter((r) => r.status === "queued_for_ops" || r.status === "approved");
  const pastSla = toPlace.filter((r) => r.ops_sla_due_at && new Date(r.ops_sla_due_at).getTime() < Date.now());
  const dueSoon = rows.filter((r) => r.days_until_delivery <= 1);
  const margin = rows.reduce((s, r) => s + r.margin_paisa, 0);

  const groups = new Map<string, QueueRow[]>();
  for (const r of rows) {
    const list = groups.get(r.deliver_on) ?? [];
    list.push(r);
    groups.set(r.deliver_on, list);
  }

  return (
    <div>
      <AutoRefresh />
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Orders</h1>
        <p className="text-sm text-ink-muted">
          <span data-numeric className="text-ink">{formatPKR(margin)}</span> margin in the queue
        </p>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error.message}</p>}

      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-rule bg-rule">
        {[
          { label: "To place with a vendor", value: toPlace.length, tone: "" },
          { label: "Past their order-by time", value: pastSla.length, tone: pastSla.length ? "text-state-failed" : "" },
          { label: "Delivering today or tomorrow", value: dueSoon.length, tone: dueSoon.length ? "text-state-waiting" : "" },
        ].map((s) => (
          <div key={s.label} className="bg-card px-4 py-3">
            <dt className="text-xs text-ink-muted">{s.label}</dt>
            <dd data-numeric className={cn("mt-1 text-2xl font-semibold text-ink", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule-strong px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">The queue is empty.</p>
          <p className="mt-1 text-sm text-ink-muted">Orders land here two days before each moment.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[...groups.entries()].map(([date, list]) => {
            const days = list[0]!.days_until_delivery;
            return (
              <section key={date}>
                <h2 className="flex items-baseline gap-2 text-sm font-semibold text-ink">
                  {formatDate(date)}
                  <span className={cn("font-normal",
                    days < 0 ? "text-state-failed" : days <= 1 ? "text-state-waiting" : "text-ink-muted")}>
                    {whenLabel(days)}
                  </span>
                  <span className="font-normal text-ink-faint">{list.length}</span>
                </h2>
                <div className="mt-2 overflow-hidden rounded-lg border border-rule bg-card">
                  {list.map((r) => <OrderRow key={r.id} row={r} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
