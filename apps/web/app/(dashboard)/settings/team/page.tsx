import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { canManagePeople, isOrgAdmin, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HINT, ROLE_LABEL } from "@/lib/invitations";
import { formatDate } from "@/lib/format";
import { InviteForm, RoleSelect } from "@/components/settings/team-forms";
import { removeMember, revokeInvite } from "@/app/actions/team";

export const metadata: Metadata = { title: "Team members" };

export default async function TeamSettingsPage() {
  const user = await requireUser();
  const org = await requireOrg();
  if (!canManagePeople(org.role)) redirect("/settings/profile");
  const admin = isOrgAdmin(org.role);
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("org_members").select("id, user_id, role, status, joined_at")
      .eq("org_id", org.orgId).eq("status", "active").order("joined_at"),
    admin
      ? supabase.from("invitations").select("id, email, role, created_at")
          .eq("org_id", org.orgId).is("accepted_at", null).is("revoked_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; email: string; role: string; created_at: string }[] }),
  ]);

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string; email: string | null }[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-ink">Team members</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-muted">
          People who can sign in to Moments for {org.orgName}. Employees don&rsquo;t need accounts; they get texts.
        </p>
      </div>

      {admin && (
        <section className="rounded-lg border border-rule bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Invite someone</h2>
          <div className="mt-4"><InviteForm /></div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink">Members <span className="font-normal text-ink-faint">{members?.length ?? 0}</span></h2>
        <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {(members ?? []).map((m) => {
            const p = byId.get(m.user_id);
            const isMe = m.user_id === user.id;
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {p?.full_name || p?.email || "Unnamed"}{isMe && <span className="font-normal text-ink-faint"> (you)</span>}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{p?.email} · joined {formatDate(m.joined_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {admin && !isMe ? (
                    <>
                      <RoleSelect memberId={m.id} role={m.role} allowOwner={org.role === "owner"} />
                      <form action={removeMember}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <button type="submit" className="text-xs text-ink-muted underline underline-offset-4 hover:text-destructive">
                          Remove
                        </button>
                      </form>
                    </>
                  ) : (
                    <span className="text-sm text-ink" title={ROLE_HINT[m.role]}>{ROLE_LABEL[m.role] ?? m.role}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {admin && (invites ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink">Waiting to join</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Lost the link? Invite the same email again and the old link stops working.
          </p>
          <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
            {(invites ?? []).map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="text-ink">{i.email}</span>
                  <span className="text-ink-muted"> · {ROLE_LABEL[i.role] ?? i.role} · invited {formatDate(i.created_at)}</span>
                </span>
                <form action={revokeInvite}>
                  <input type="hidden" name="invitationId" value={i.id} />
                  <button type="submit" className="text-xs text-ink-muted underline underline-offset-4 hover:text-destructive">
                    Cancel invite
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
