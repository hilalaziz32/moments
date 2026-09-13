import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPKR } from "@moments/core/money";
import { requireOrg, canManagePeople } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateMark } from "@/components/moments/date-mark";
import { Pipeline, stepsForStatus } from "@/components/moments/pipeline";
import { MomentActions } from "@/components/moments/moment-actions";
import {
  AUDIENCE_LABEL, MOMENT_STATUS_LABEL, ORDER_STATUS_LABEL, TASK_LABEL,
  formatDate, formatDateTime, formatDayInZone, humanize, skipReason,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Moment" };

const TASK_DOT: Record<string, string> = {
  succeeded: "bg-state-done border-state-done",
  running: "bg-state-active border-state-active",
  failed: "bg-surface border-state-waiting",
  dead: "bg-state-failed border-state-failed",
  pending: "bg-surface border-state-idle",
  skipped: "bg-surface border-state-idle",
  cancelled: "bg-surface border-state-idle",
};

/**
 * The trust screen. When something goes wrong -- or a customer asks why a gift
 * was late -- this page has to explain it in one read, so every step shows what
 * happened and, when it didn't run, why.
 */
export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("moment_events")
    .select("id, occurs_on, status, budget_paisa, milestone_years, occurrence_note, is_provisional, cancel_reason, metadata, employees(full_name, preferred_name, department, job_title), moment_types(label)")
    .eq("id", id)
    .eq("org_id", org.orgId)
    .maybeSingle();

  if (!event) notFound();

  const [tasksRes, approvalRes, orderRes, messagesRes] = await Promise.all([
    supabase
      .from("moment_tasks")
      .select("id, task_type, status, scheduled_for, finished_at, attempts, last_error, result")
      .eq("moment_event_id", id)
      .order("scheduled_for"),
    supabase
      .from("approval_requests")
      .select("id, status, requested_amount_paisa, responded_at, responder_label, decision_note, auto_approve_at")
      .eq("moment_event_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Only the columns a customer may see: never our cost, margin or supplier.
    supabase
      .from("gift_orders")
      .select("id, order_number, status, deliver_on, total_price_paisa, is_fallback, delivered_at, failure_reason, gift_order_items(name_snapshot, quantity)")
      .eq("moment_event_id", id)
      .neq("status", "cancelled")
      .maybeSingle(),
    supabase
      .from("outbound_messages")
      .select("id, channel, audience, status, rendered_subject, rendered_body, is_preview, sent_at, created_at")
      .eq("moment_event_id", id)
      .order("created_at"),
  ]);

  const emp = event.employees as unknown as {
    full_name: string; preferred_name: string | null; department: string | null; job_title: string | null;
  } | null;
  const label = (event.moment_types as unknown as { label: string } | null)?.label ?? "Moment";
  const title = event.milestone_years ? `${event.milestone_years} year anniversary` : label;
  const name = emp?.preferred_name || emp?.full_name || org.orgName;
  const tasks = tasksRes.data ?? [];
  const approval = approvalRes.data;
  const order = orderRes.data;
  const messages = messagesRes.data ?? [];
  const meta = (event.metadata ?? {}) as { selectedName?: string; selectedPricePaisa?: number };
  const items = order ? (order.gift_order_items as unknown as { name_snapshot: string; quantity: number }[]) : [];

  const dayOf = (type: string) => {
    const t = tasks.find((x) => x.task_type === type);
    return t ? formatDayInZone(t.scheduled_for, org.timezone) : undefined;
  };
  const steps = stepsForStatus(event.status, {
    verify: dayOf("verify_details_send"),
    select: dayOf("select_gift"),
    approve: dayOf("request_approval"),
    deliver: dayOf("announce") ?? formatDate(event.occurs_on, { year: false }),
  });

  return (
    <div className="space-y-6">
      <Link href="/moments" className="text-sm text-ink-muted hover:text-ink">All moments</Link>

      <header className="flex flex-wrap items-center gap-6">
        <DateMark iso={event.occurs_on} size="lg" className="w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-ink">{name}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {title}{emp?.department ? `, ${emp.department}` : ""}
          </p>
          <p className="mt-1 text-sm text-ink">
            {MOMENT_STATUS_LABEL[event.status] ?? humanize(event.status)}
            {event.is_provisional && (
              <span className="text-ink-muted"> (date not yet confirmed by the moon-sighting committee)</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p data-numeric className="text-lg font-semibold text-ink">{formatPKR(event.budget_paisa)}</p>
          <p className="text-xs text-ink-faint">budget</p>
        </div>
      </header>

      <Card>
        <CardContent className="pt-5">
          <Pipeline steps={steps} showLabels />
        </CardContent>
      </Card>

      {canManagePeople(org.role) && <MomentActions momentId={event.id} status={event.status} />}
      {event.cancel_reason && (
        <p className="text-sm text-ink-muted">Reason given: {event.cancel_reason}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader><CardTitle>What happens, and when</CardTitle></CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing is scheduled yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-rule pl-5">
                {tasks.map((t) => {
                  const result = (t.result ?? {}) as { reason?: string };
                  const isFuture = new Date(t.scheduled_for).getTime() > Date.now();
                  const state =
                    t.status === "succeeded" ? "Done"
                    : t.status === "running" ? "Running now"
                    : t.status === "failed" ? `Retrying, attempt ${t.attempts}`
                    : t.status === "dead" ? "Failed"
                    : t.status === "skipped" ? skipReason(result.reason)
                    : t.status === "cancelled" ? "Cancelled"
                    : isFuture ? "Scheduled" : "Due";
                  return (
                    <li key={t.id} className="relative">
                      <span
                        aria-hidden
                        className={cn("absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2", TASK_DOT[t.status] ?? TASK_DOT.pending)}
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <p className="text-sm font-medium text-ink">{TASK_LABEL[t.task_type] ?? humanize(t.task_type)}</p>
                        <time className="text-xs text-ink-faint" dateTime={t.scheduled_for}>
                          {formatDateTime(t.scheduled_for, org.timezone)}
                        </time>
                      </div>
                      <p className={cn("text-sm",
                        t.status === "dead" ? "text-state-failed"
                        : t.status === "failed" ? "text-state-waiting" : "text-ink-muted")}>
                        {state}
                      </p>
                      {(t.status === "dead" || t.status === "failed") && t.last_error && (
                        <p className="mt-0.5 text-xs text-ink-faint">{t.last_error}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Gift</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {order ? (
                <>
                  <p className="text-ink">{items.map((i) => i.name_snapshot).join(", ") || "Gift"}</p>
                  <p className="text-ink-muted">
                    {ORDER_STATUS_LABEL[order.status] ?? humanize(order.status)}, {formatPKR(order.total_price_paisa ?? 0)}
                  </p>
                  <p className="text-xs text-ink-faint">Order {order.order_number}</p>
                  {order.is_fallback && (
                    <p className="pt-2 text-ink-muted">
                      Sent as a digital gift because the physical one wasn&rsquo;t with a vendor in time.
                    </p>
                  )}
                  {order.failure_reason && order.status === "failed" && (
                    <p className="pt-2 text-state-failed">{order.failure_reason}</p>
                  )}
                </>
              ) : meta.selectedName ? (
                <p className="text-ink">
                  Picked {meta.selectedName}
                  {meta.selectedPricePaisa ? `, ${formatPKR(meta.selectedPricePaisa)}` : ""}.{" "}
                  <span className="text-ink-muted">Not ordered yet.</span>
                </p>
              ) : (
                <p className="text-ink-muted">Not picked yet. We choose a few days before.</p>
              )}
            </CardContent>
          </Card>

          {approval && (
            <Card>
              <CardHeader><CardTitle>Approval</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {approval.status === "pending" && (
                  <p className="text-ink">
                    Waiting for a decision.
                    {approval.auto_approve_at && (
                      <span className="text-ink-muted">
                        {" "}Goes ahead automatically {formatDateTime(approval.auto_approve_at, org.timezone)}.
                      </span>
                    )}{" "}
                    <Link href="/approvals" className="font-medium underline underline-offset-4">Decide now</Link>
                  </p>
                )}
                {approval.status === "approved" && (
                  <p className="text-ink">
                    Approved{approval.responder_label ? ` by ${approval.responder_label}` : ""}
                    {approval.responded_at ? ` on ${formatDateTime(approval.responded_at, org.timezone)}` : ""}.
                  </p>
                )}
                {approval.status === "auto_approved" && (
                  <p className="text-ink">
                    Nobody answered, so it went ahead automatically
                    {approval.responded_at ? ` on ${formatDateTime(approval.responded_at, org.timezone)}` : ""}.
                  </p>
                )}
                {approval.status === "rejected" && (
                  <p className="text-ink">
                    Declined{approval.responder_label ? ` by ${approval.responder_label}` : ""}. No gift will be sent.
                  </p>
                )}
                {approval.status === "expired" && <p className="text-ink">Expired before anyone answered.</p>}
                {approval.decision_note && (
                  <p className="mt-2 text-ink-muted">&ldquo;{approval.decision_note}&rdquo;</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing has been sent for this moment yet.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {messages.map((m) => (
                <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-4 text-sm">
                      <span className="text-ink">
                        {AUDIENCE_LABEL[m.audience] ?? humanize(m.audience)}
                        <span className="text-ink-muted"> by {humanize(m.channel)}</span>
                        {m.is_preview && <span className="text-state-waiting"> (preview only)</span>}
                      </span>
                      <time className="text-xs text-ink-faint" dateTime={m.sent_at ?? m.created_at}>
                        {formatDateTime(m.sent_at ?? m.created_at, org.timezone)}
                      </time>
                    </summary>
                    {m.rendered_subject && <p className="mt-2 text-sm font-medium text-ink">{m.rendered_subject}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{m.rendered_body}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
