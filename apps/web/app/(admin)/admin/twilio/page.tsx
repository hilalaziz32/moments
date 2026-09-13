import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { webConfig } from "@/lib/config";
import { listNumbers, statusCallbackUrl, twilioAccountConfigured, verifyAccount } from "@/lib/twilio";

export const metadata: Metadata = { title: "Twilio" };
export const dynamic = "force-dynamic";

/**
 * The platform Twilio account (credentials live in env, never in the database)
 * and which customer uses which number.
 */
export default async function TwilioPage() {
  const t = webConfig.twilio;
  const configured = twilioAccountConfigured();

  const [account, numbers, { data: assigned }] = await Promise.all([
    configured ? verifyAccount() : Promise.resolve(null),
    configured ? listNumbers() : Promise.resolve(null),
    createAdminClient()
      .from("org_integrations")
      .select("org_id, external_account_id, organizations(name)")
      .eq("provider", "twilio")
      .not("external_account_id", "is", null),
  ]);

  const usedBy = new Map<string, { orgId: string; name: string }[]>();
  for (const a of assigned ?? []) {
    const name = (a.organizations as unknown as { name: string } | null)?.name ?? a.org_id;
    const list = usedBy.get(a.external_account_id!) ?? [];
    list.push({ orgId: a.org_id, name });
    usedBy.set(a.external_account_id!, list);
  }

  const envRows: [string, string][] = [
    ["TWILIO_ACCOUNT_SID", t.accountSid ? `…${t.accountSid.slice(-6)}` : "not set"],
    ["TWILIO_AUTH_TOKEN", t.authToken ? "set" : "not set"],
    ["TWILIO_FROM_NUMBER", t.fromNumber || "not set (customers need their own number)"],
    ["TWILIO_MESSAGING_SERVICE_SID", t.messagingServiceSid || "not set"],
    ["Delivery receipts URL", statusCallbackUrl()],
  ];

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-ink">Twilio</h1>
        <p className="mt-1 text-sm text-ink-muted">
          One Twilio account for every customer, from env. Assign numbers per customer on their account page.
        </p>
      </div>

      <section className="rounded-lg border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Connection</h2>
        <p className="mt-1 text-sm">
          {!configured ? (
            <span className="text-destructive">Not configured. Add the settings below in Vercel and on the worker.</span>
          ) : account && "error" in account ? (
            <span className="text-destructive">{account.error}</span>
          ) : account ? (
            <span className="text-ink">Connected to {account.friendlyName} ({account.status})</span>
          ) : null}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          {envRows.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-2">
              <dt className="font-mono text-xs text-ink-muted">{k}</dt>
              <dd className="break-all text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Numbers on the account</h2>
        {!numbers ? (
          <p className="mt-3 text-sm text-ink-muted">Connect Twilio to see them.</p>
        ) : "error" in numbers ? (
          <p className="mt-3 text-sm text-destructive">{numbers.error}</p>
        ) : numbers.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No numbers yet. Buy one in the Twilio console and it will appear here.</p>
        ) : (
          <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
            {numbers.map((n) => {
              const users = usedBy.get(n.phoneNumber) ?? [];
              return (
                <div key={n.phoneNumber} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span data-numeric className="font-medium text-ink">{n.phoneNumber}</span>
                    <span className="text-ink-muted"> · {n.friendlyName}</span>
                    {!n.sms && <span className="block text-xs text-destructive">Can&rsquo;t send SMS</span>}
                    {n.phoneNumber === t.fromNumber && <span className="block text-xs text-ink-faint">Platform default</span>}
                  </span>
                  <span className="text-ink-muted">
                    {users.length === 0
                      ? "Unassigned"
                      : users.map((u, i) => (
                          <span key={u.orgId}>
                            {i > 0 && ", "}
                            <Link href={`/admin/accounts/${u.orgId}`} className="underline underline-offset-4">{u.name}</Link>
                          </span>
                        ))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
