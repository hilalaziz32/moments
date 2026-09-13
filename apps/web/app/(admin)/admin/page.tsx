import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatDayInZone, humanize } from "@/lib/format";
import { webConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

const E164 = /^\+[1-9][0-9]{7,14}$/;

/**
 * Every customer account. Read with the service client: this page exists to see
 * across tenants, and requireSuperAdmin() in the layout is the gate.
 */
export default async function AccountsPage() {
  const db = createAdminClient();
  const { data: orgs } = await db
    .from("organizations")
    .select("id, name, status, dry_run_until, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const list = orgs ?? [];
  const ids = list.map((o) => o.id);

  const [{ data: members }, { data: sms }, counts] = ids.length
    ? await Promise.all([
        db.from("org_members").select("org_id, user_id, role").in("org_id", ids).eq("status", "active"),
        db.from("org_integrations").select("org_id, status, external_account_id").eq("provider", "twilio").in("org_id", ids),
        Promise.all(ids.map((id) =>
          db.from("employees").select("id", { count: "exact", head: true })
            .eq("org_id", id).is("deleted_at", null).neq("status", "exited")
            .then((r) => [id, r.count ?? 0] as const),
        )),
      ])
    : [{ data: [] }, { data: [] }, [] as (readonly [string, number])[]];

  const ownerIds = [...new Set((members ?? []).filter((m) => m.role === "owner").map((m) => m.user_id))];
  const { data: owners } = ownerIds.length
    ? await db.from("profiles").select("id, email").in("id", ownerIds)
    : { data: [] as { id: string; email: string | null }[] };

  const emailById = new Map((owners ?? []).map((p) => [p.id, p.email]));
  const ownerByOrg = new Map<string, string | null>();
  for (const m of members ?? []) {
    if (m.role === "owner" && !ownerByOrg.has(m.org_id)) ownerByOrg.set(m.org_id, emailById.get(m.user_id) ?? null);
  }
  const smsByOrg = new Map((sms ?? []).map((s) => [s.org_id, s]));
  const peopleByOrg = new Map(counts);
  const defaultFrom = webConfig.twilio.fromNumber;
  const now = new Date();

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">
        Accounts <span className="font-normal text-ink-faint">{list.length}</span>
      </h1>
      <p className="mt-1 text-sm text-ink-muted">Every company using Moments. Open one to set its sending number.</p>

      {list.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule-strong px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">No accounts yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-card">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-xs text-ink-muted">
                <th className="px-5 py-2.5 font-medium">Account</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">People</th>
                <th className="px-5 py-2.5 font-medium">Texts from</th>
                <th className="px-5 py-2.5 font-medium">Dry run</th>
                <th className="px-5 py-2.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {list.map((o) => {
                const s = smsByOrg.get(o.id);
                const number = s?.external_account_id && E164.test(s.external_account_id) ? s.external_account_id : null;
                const inDryRun = o.dry_run_until && new Date(o.dry_run_until) > now;
                return (
                  <tr key={o.id} className="hover:bg-surface-sunk">
                    <td className="px-5 py-3">
                      <Link href={`/admin/accounts/${o.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                        {o.name}
                      </Link>
                      <span className="block text-xs text-ink-faint">{ownerByOrg.get(o.id) ?? "no owner"}</span>
                    </td>
                    <td className="px-5 py-3 text-ink">{humanize(o.status)}</td>
                    <td className="px-5 py-3 text-right text-ink" data-numeric>{peopleByOrg.get(o.id) ?? 0}</td>
                    <td className="px-5 py-3">
                      {number
                        ? <span data-numeric className="text-ink">{number}</span>
                        : <span className="text-ink-muted">{defaultFrom ? `default (${defaultFrom})` : "not set"}</span>}
                      <span className="block text-xs text-ink-faint">SMS {s?.status === "connected" ? "on" : "off"}</span>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {inDryRun ? `until ${formatDayInZone(o.dry_run_until!)}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{formatDate(o.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
