import type { Metadata } from "next";
import { formatPKR } from "@moments/core/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApproveForm } from "@/components/public/approve-form";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Approve a gift" };
export const dynamic = "force-dynamic";

interface ApprovalInfo {
  valid: boolean;
  approvalId?: string;
  status?: string;
  amountPaisa?: number;
  budgetPaisa?: number;
  summary?: string | null;
  requiresOtp?: boolean;
  autoApproveAt?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  orgName?: string;
  employeeName?: string | null;
  momentLabel?: string | null;
  occursOn?: string | null;
}

/**
 * GET NEVER MUTATES. Mail scanners pre-fetch links; if viewing this page spent
 * the token, the approver would find it dead before they clicked.
 */
export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data } = await createAdminClient().rpc("resolve_approval_token", { p_token: token } as never);
  const info = data as unknown as ApprovalInfo | null;

  if (!info?.valid || !info.approvalId) {
    return (
      <Notice
        title="This link isn't valid any more"
        body="It may have expired. Sign in to Moments to see anything still waiting for approval."
      />
    );
  }

  const name = info.employeeName ?? "your team";

  if (info.status !== "pending") {
    const by = info.decidedBy ? ` by ${info.decidedBy}` : "";
    const when = info.decidedAt ? ` on ${formatDateTime(info.decidedAt)}` : "";
    const outcomes: Record<string, { title: string; body: string }> = {
      approved: { title: `Already approved${by}`, body: `The gift for ${name} is going ahead${when}.` },
      rejected: { title: `Already declined${by}`, body: `No gift will be sent for ${name}.` },
      auto_approved: {
        title: "This went ahead automatically",
        body: `Nobody answered before the deadline, so the gift for ${name} is going ahead.`,
      },
      expired: { title: "This request expired", body: "Nobody answered before it closed." },
      cancelled: { title: "This request was withdrawn", body: "There's nothing to decide." },
    };
    const o = outcomes[info.status ?? ""] ?? { title: "Already decided", body: "" };
    return <Notice title={o.title} body={o.body} />;
  }

  const amount = info.amountPaisa ?? 0;
  const budget = info.budgetPaisa ?? 0;
  const over = amount > budget;

  return (
    <div>
      <p className="text-xs text-ink-faint">{info.orgName}</p>
      <h1 className="mt-1 text-xl font-semibold text-ink">Approve a gift for {name}?</h1>

      <dl className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-card text-sm">
        <Row label="Occasion">
          {info.momentLabel ?? "Celebration"}{info.occursOn ? `, ${formatDate(info.occursOn)}` : ""}
        </Row>
        {info.summary && <Row label="Gift">{info.summary}</Row>}
        <Row label="Cost">
          <span data-numeric>{formatPKR(amount)}</span>
          <span className={over ? "text-state-waiting" : "text-ink-faint"}>
            {" "}({over ? "over" : "within"} the {formatPKR(budget)} budget)
          </span>
        </Row>
      </dl>

      {info.autoApproveAt && (
        <p className="mt-3 text-xs text-ink-muted">
          If nobody answers by {formatDateTime(info.autoApproveAt)}, it goes ahead automatically.
        </p>
      )}

      <ApproveForm
        token={token}
        approvalId={info.approvalId}
        requiresOtp={Boolean(info.requiresOtp)}
        employeeName={name}
      />
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-rule bg-card p-6 text-center">
      <h1 className="text-base font-semibold text-ink">{title}</h1>
      {body && <p className="mt-2 text-sm text-ink-muted">{body}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-20 shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
