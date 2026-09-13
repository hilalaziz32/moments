import type { Metadata } from "next";
import { isOrgAdmin, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { SmsSettingsForm } from "@/components/settings/sms-settings-form";
import { finishMessagesStep } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Messages" };

export default async function SetupMessagesPage() {
  const org = await requireOrg();
  const supabase = await createClient();

  const [{ data: integration }, { count: total }, { count: withPhone }] = await Promise.all([
    supabase.from("org_integrations").select("status, config_public").eq("org_id", org.orgId).eq("provider", "twilio").maybeSingle(),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("org_id", org.orgId).is("deleted_at", null),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("org_id", org.orgId).is("deleted_at", null)
      .or("phone_e164.not.is.null,whatsapp_e164.not.is.null"),
  ]);

  const testPhone = ((integration?.config_public ?? {}) as { testPhone?: string }).testPhone ?? null;
  const missing = (total ?? 0) - (withPhone ?? 0);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">How we&rsquo;ll reach people</h1>
      <p className="mt-1 max-w-lg text-sm text-ink-muted">
        Employees don&rsquo;t log in. We text them to confirm where their gift should go, and text their
        manager a suggested note on the day.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-start">
        <div className="rounded-lg border border-rule bg-card p-5">
          <SmsSettingsForm enabled={integration?.status === "connected"} testPhone={testPhone} readOnly={!isOrgAdmin(org.role)} />
        </div>
        <aside className="rounded-lg border border-rule bg-card p-5">
          <p className="text-xs font-medium text-ink-muted">Who we can text</p>
          <p data-numeric className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            {withPhone ?? 0}<span className="text-base font-normal text-ink-muted"> / {total ?? 0}</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {missing > 0 ? `${missing} people have no mobile number yet. You can add them later.` : "Everyone has a number."}
          </p>
          <p className="mt-4 border-t border-rule pt-4 text-xs text-ink-muted">
            Put your own number as the test phone: during your first week every text comes to you instead.
          </p>
        </aside>
      </div>

      <form action={finishMessagesStep} className="mt-8">
        <Button type="submit">Continue</Button>
      </form>
    </div>
  );
}
