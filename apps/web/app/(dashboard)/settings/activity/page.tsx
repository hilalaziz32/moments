import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canManagePeople, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/invitations";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Activity" };

type After = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");

/** One sentence per change, in words an HR admin would use. */
function describe(action: string, a: After): string {
  const name = s(a.name) || "someone";
  switch (action) {
    case "budgets.saved": return "changed the budgets";
    case "company.updated": return "updated company settings";
    case "person.added": return `added ${name} to the team`;
    case "person.updated": return `edited ${name}'s details`;
    case "person.removed": return `removed ${name} from the team`;
    case "news.shared": return `logged ${s(a.label).toLowerCase() || "news"} for ${name}${a.date ? ` on ${formatDate(s(a.date))}` : ""}`;
    case "news.withdrawn": return `withdrew news for ${name}`;
    case "leaving.set": return `set ${name}'s last day to ${a.lastDay ? formatDate(s(a.lastDay)) : "a date"}`;
    case "leaving.cleared": return `marked ${name} as staying`;
    case "member.invited": return `invited ${s(a.email)} as ${ROLE_LABEL[s(a.role)] ?? s(a.role)}`;
    case "member.role_changed": return `made ${name} ${ROLE_LABEL[s(a.role)] ?? s(a.role)}`;
    case "member.removed": return `removed ${name}'s access`;
    case "sms.settings_saved": return `turned texts ${a.enabled ? "on" : "off"}`;
    case "sms.sender_set": return `set the sending number to ${s(a.fromNumber) || "the default"}`;
    case "sms.settings_set": return `turned texts ${a.enabled ? "on" : "off"}`;
    case "org.lifecycle_set": return "changed the account status";
    default: return action.replace(/[._]/g, " ");
  }
}

export default async function ActivityPage() {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) redirect("/settings/profile");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, actor_kind, actor_label, action, after, created_at")
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false })
    .limit(150);

  const entries = rows ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Activity</h1>
      <p className="mt-1 text-sm text-ink-muted">Every change made to {org.orgName}, newest first. Nobody can edit or delete this list.</p>

      {entries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule-strong px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">Nothing yet.</p>
          <p className="mt-1 text-sm text-ink-muted">Changes to people, budgets and settings will be listed here.</p>
        </div>
      ) : (
        <ol className="mt-6 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {entries.map((r) => {
            const who = r.actor_kind === "staff" ? "Moments support" : r.actor_label || "Someone";
            return (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-ink">{who}</span>{" "}
                  <span className="text-ink">{describe(r.action, (r.after ?? {}) as After)}</span>
                </span>
                <time dateTime={r.created_at} className="shrink-0 text-xs text-ink-faint">
                  {formatDateTime(r.created_at, org.timezone)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
