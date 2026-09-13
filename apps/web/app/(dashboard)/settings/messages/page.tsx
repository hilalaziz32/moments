import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canManagePeople, isOrgAdmin, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { twilioConfigured } from "@/lib/twilio";
import { formatDateTime, AUDIENCE_LABEL } from "@/lib/format";
import { SmsSettingsForm, TestTextForm } from "@/components/settings/sms-settings-form";

export const metadata: Metadata = { title: "Messages" };

const STATUS: Record<string, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  suppressed: "Not sent",
  queued: "Queued",
};

export default async function MessagesSettingsPage() {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) redirect("/dashboard");
  const supabase = await createClient();

  const [{ data: integration }, { data: orgRow }, { count: total }, { count: withPhone }, { data: recent }] =
    await Promise.all([
      supabase.from("org_integrations").select("status, config_public").eq("org_id", org.orgId).eq("provider", "twilio").maybeSingle(),
      supabase.from("organizations").select("dry_run_until").eq("id", org.orgId).single(),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("org_id", org.orgId).is("deleted_at", null).neq("status", "exited"),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("org_id", org.orgId).is("deleted_at", null).neq("status", "exited")
        .or("phone_e164.not.is.null,whatsapp_e164.not.is.null"),
      supabase.from("outbound_messages")
        .select("id, audience, recipient_ref, status, error_message, is_preview, created_at")
        .eq("org_id", org.orgId).eq("channel", "sms")
        .order("created_at", { ascending: false }).limit(15),
    ]);

  const enabled = integration?.status === "connected";
  const testPhone = ((integration?.config_public ?? {}) as { testPhone?: string }).testPhone ?? null;
  const inDryRun = Boolean(orgRow?.dry_run_until && new Date(orgRow.dry_run_until) > new Date());
  const serverReady = twilioConfigured();
  const missingPhones = (total ?? 0) - (withPhone ?? 0);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-ink">Messages</h1>
        <p className="mt-1 text-sm text-ink-muted">
          How Moments reaches people who don&rsquo;t log in. Texts are sent by SMS. Email is coming later.
        </p>
      </div>

      {!serverReady && (
        <p className="rounded-lg border border-rule bg-surface-sunk px-4 py-3 text-sm text-ink-muted">
          SMS isn&rsquo;t connected on our side yet, so texts are recorded below but not sent.
        </p>
      )}

      <section className="rounded-lg border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">SMS</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {inDryRun
            ? testPhone
              ? "You're in dry run: texts go to your test phone only."
              : "You're in dry run and there's no test phone, so no texts go out yet."
            : enabled
              ? "Live: texts go to your people."
              : "Off."}
        </p>
        <div className="mt-5">
          <SmsSettingsForm enabled={enabled} testPhone={testPhone} readOnly={!isOrgAdmin(org.role)} />
        </div>
        {isOrgAdmin(org.role) && serverReady && (
          <div className="mt-6 border-t border-rule pt-5">
            <TestTextForm defaultPhone={testPhone} />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Who we can text</h2>
        <p className="mt-1 text-sm text-ink-muted">
          <span data-numeric className="font-medium text-ink">{withPhone ?? 0}</span> of {total ?? 0} people have a
          mobile number.
          {missingPhones > 0 && " Add a phone column to your sheet and import it again to reach the rest."}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Recent texts</h2>
        {!recent || recent.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">None yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
            {recent.map((m) => (
              <div key={m.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <span className="text-ink">{AUDIENCE_LABEL[m.audience] ?? m.audience}</span>
                  <span className="text-ink-muted">
                    {" "}· ending {m.recipient_ref.slice(-4)} · {formatDateTime(m.created_at, org.timezone)}
                    {m.is_preview && " · preview"}
                  </span>
                  {m.error_message && <p className="mt-0.5 text-xs text-ink-faint">{m.error_message}</p>}
                </div>
                <span className={m.status === "failed" ? "text-destructive" : "text-ink"}>
                  {STATUS[m.status] ?? m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
