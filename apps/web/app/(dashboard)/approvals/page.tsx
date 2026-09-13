import type { Metadata } from "next";
import Link from "next/link";
import { formatPKR } from "@moments/core/money";
import { requireOrg, canManagePeople } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard, type ApprovalCardData } from "@/components/moments/approval-card";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Approvals" };

type EmbeddedMoment = {
  id: string;
  occurs_on: string;
  employees: { full_name: string; preferred_name: string | null; department?: string | null } | null;
  moment_types: { label: string } | null;
} | null;

const DECISION: Record<string, string> = {
  approved: "Approved",
  rejected: "Declined",
  auto_approved: "Went ahead automatically",
  expired: "Expired unanswered",
  cancelled: "Withdrawn",
};

export default async function ApprovalsPage() {
  const org = await requireOrg();
  const supabase = await createClient();

  const [{ data: pending }, { data: decided }] = await Promise.all([
    supabase
      .from("approval_requests")
      .select("id, requested_amount_paisa, budget_paisa, summary, auto_approve_at, moment_events(id, occurs_on, employees(full_name, preferred_name, department), moment_types(label))")
      .eq("org_id", org.orgId)
      .eq("status", "pending")
      .order("expires_at"),
    supabase
      .from("approval_requests")
      .select("id, status, responded_at, responder_label, requested_amount_paisa, moment_events(id, occurs_on, employees(full_name, preferred_name), moment_types(label))")
      .eq("org_id", org.orgId)
      .neq("status", "pending")
      .order("responded_at", { ascending: false, nullsFirst: false })
      .limit(15),
  ]);

  const cards: ApprovalCardData[] = (pending ?? []).map((a) => {
    const m = a.moment_events as unknown as EmbeddedMoment;
    return {
      id: a.id,
      momentId: m?.id ?? "",
      employeeName: m?.employees?.preferred_name || m?.employees?.full_name || org.orgName,
      department: m?.employees?.department ?? null,
      momentLabel: m?.moment_types?.label ?? "Moment",
      occursOn: m?.occurs_on ?? "",
      amountPaisa: a.requested_amount_paisa,
      budgetPaisa: a.budget_paisa,
      summary: a.summary,
      autoApproveAt: a.auto_approve_at,
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Approvals</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Gifts waiting on a yes. If nobody answers, each one goes ahead at its deadline.
      </p>

      {cards.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule-strong px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">Nothing waiting on you.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Turn on &ldquo;Ask me first&rdquo; for a kind of moment in{" "}
            <Link href="/settings/moments" className="underline underline-offset-4">Budgets</Link>{" "}
            to approve those gifts here.
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {cards.map((c) => (
            <ApprovalCard key={c.id} approval={c} timezone={org.timezone} canDecide={canManagePeople(org.role)} />
          ))}
        </div>
      )}

      {(decided ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-ink">Recently decided</h2>
          <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-card">
            {(decided ?? []).map((a) => {
              const m = a.moment_events as unknown as EmbeddedMoment;
              return (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <span className="text-ink">
                    {m?.employees?.preferred_name || m?.employees?.full_name || org.orgName}
                    <span className="text-ink-muted">
                      , {m?.moment_types?.label ?? "Moment"}{m?.occurs_on ? ` ${formatDate(m.occurs_on, { year: false })}` : ""}
                    </span>
                  </span>
                  <span className="text-ink-muted">
                    {DECISION[a.status] ?? a.status}
                    {a.responder_label && a.status !== "auto_approved" && a.status !== "expired" ? ` by ${a.responder_label}` : ""}
                    {a.responded_at ? `, ${formatDateTime(a.responded_at, org.timezone)}` : ""}
                    <span data-numeric className="ml-3 text-ink">{formatPKR(a.requested_amount_paisa)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
