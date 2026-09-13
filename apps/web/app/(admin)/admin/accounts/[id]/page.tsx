import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPKR } from "@moments/core/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { webConfig } from "@/lib/config";
import { listNumbers, twilioAccountConfigured } from "@/lib/twilio";
import { AUDIENCE_LABEL, MOMENT_STATUS_LABEL, formatDate, formatDateTime, humanize } from "@/lib/format";
import {
  AdminLifecycleForm, AdminSenderForm, AdminSmsForm, AdminTestTextForm,
} from "@/components/admin/account-forms";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

const E164 = /^\+[1-9][0-9]{7,14}$/;

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: org } = await db
    .from("organizations")
    .select("id, name, slug, status, timezone, dry_run_until, created_at, employee_count_hint")
    .eq("id", id)
    .maybeSingle();
  if (!org) notFound();

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(new Date());
  const active = () => db.from("employees").select("id", { count: "exact", head: true })
    .eq("org_id", id).is("deleted_at", null).neq("status", "exited");

  const [
    { data: members }, { count: people }, { count: withPhone },
    { data: moments }, { data: messages }, { data: sms }, numbers,
  ] = await Promise.all([
    db.from("org_members").select("user_id, role, status").eq("org_id", id),
    active(),
    active().or("phone_e164.not.is.null,whatsapp_e164.not.is.null"),
    db.from("moment_events")
      .select("id, occurs_on, status, budget_paisa, employees(full_name, preferred_name), moment_types(label)")
      .eq("org_id", id).gte("occurs_on", today).not("status", "in", "(cancelled,skipped)")
      .order("occurs_on").limit(10),
    db.from("outbound_messages")
      .select("id, channel, audience, recipient_ref, status, error_message, is_preview, created_at")
      .eq("org_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("org_integrations").select("status, external_account_id, config_public").eq("org_id", id).eq("provider", "twilio").maybeSingle(),
    twilioAccountConfigured() ? listNumbers() : Promise.resolve(null),
  ]);

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] as { id: string; email: string | null; full_name: string }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const currentNumber = sms?.external_account_id && E164.test(sms.external_account_id) ? sms.external_account_id : null;
  const testPhone = ((sms?.config_public ?? {}) as { testPhone?: string }).testPhone ?? null;
  const inDryRun = Boolean(org.dry_run_until && new Date(org.dry_run_until) > new Date());
  const numberList = numbers && !("error" in numbers) ? numbers : [];
  const numbersError = numbers && "error" in numbers ? numbers.error : null;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin" className="text-sm text-ink-muted hover:text-ink">← Accounts</Link>
        <h1 className="mt-3 text-xl font-semibold text-ink">{org.name}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-5">
          {([
            ["Status", humanize(org.status)],
            ["People", `${people ?? 0} (${withPhone ?? 0} with a phone)`],
            ["Dry run", inDryRun ? `until ${formatDateTime(org.dry_run_until!, org.timezone)}` : "Off"],
            ["Timezone", org.timezone],
            ["Joined", formatDate(org.created_at)],
          ] as const).map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-ink-faint">{k}</dt>
              <dd className="mt-0.5 truncate text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="rounded-lg border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Sending number</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The Twilio number this company&rsquo;s texts come from. Numbers are loaded from the Twilio account in env.
        </p>
        {!twilioAccountConfigured() ? (
          <p className="mt-4 text-sm text-destructive">
            TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN aren&rsquo;t set, so there are no numbers to pick from.
          </p>
        ) : numbersError ? (
          <p className="mt-4 text-sm text-destructive">{numbersError}</p>
        ) : (
          <div className="mt-4">
            <AdminSenderForm
              orgId={org.id}
              current={currentNumber}
              defaultFrom={webConfig.twilio.fromNumber || null}
              numbers={numberList}
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">SMS</h2>
        <div className="mt-4">
          <AdminSmsForm orgId={org.id} enabled={sms?.status === "connected"} testPhone={testPhone} />
        </div>
        <div className="mt-6 border-t border-rule pt-5">
          <AdminTestTextForm orgId={org.id} defaultPhone={testPhone} />
        </div>
      </section>

      <section className="rounded-lg border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <div className="mt-4">
          <AdminLifecycleForm orgId={org.id} status={org.status} inDryRun={inDryRun} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Team members</h2>
        <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {(members ?? []).length === 0 && <p className="px-5 py-3 text-sm text-ink-muted">Nobody.</p>}
          {(members ?? []).map((m) => {
            const p = profileById.get(m.user_id);
            return (
              <div key={m.user_id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="text-ink">{p?.full_name || p?.email || m.user_id}</span>
                  {p?.email && <span className="text-ink-muted"> · {p.email}</span>}
                </span>
                <span className="text-ink-muted">{humanize(m.role)}{m.status !== "active" && ` · ${m.status}`}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Coming up</h2>
        <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {(moments ?? []).length === 0 && <p className="px-5 py-3 text-sm text-ink-muted">Nothing planned yet.</p>}
          {(moments ?? []).map((m) => {
            const emp = m.employees as unknown as { full_name: string; preferred_name: string | null } | null;
            const mt = m.moment_types as unknown as { label: string } | null;
            return (
              <div key={m.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="text-ink">{emp?.preferred_name || emp?.full_name || "Everyone"}</span>
                  <span className="text-ink-muted"> · {mt?.label ?? "Moment"} · {formatDate(m.occurs_on)}</span>
                </span>
                <span className="text-ink-muted">
                  {MOMENT_STATUS_LABEL[m.status] ?? humanize(m.status)} · <span data-numeric>{formatPKR(m.budget_paisa)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Recent messages</h2>
        <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {(messages ?? []).length === 0 && <p className="px-5 py-3 text-sm text-ink-muted">None yet.</p>}
          {(messages ?? []).map((m) => (
            <div key={m.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
              <span className="min-w-0">
                <span className="text-ink">{AUDIENCE_LABEL[m.audience] ?? m.audience}</span>
                <span className="text-ink-muted">
                  {" "}· {m.channel.toUpperCase()} · {m.recipient_ref} · {formatDateTime(m.created_at, org.timezone)}
                  {m.is_preview && " · preview"}
                </span>
                {m.error_message && <span className="block text-xs text-ink-faint">{m.error_message}</span>}
              </span>
              <span className={m.status === "failed" ? "text-destructive" : "text-ink"}>{humanize(m.status)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
