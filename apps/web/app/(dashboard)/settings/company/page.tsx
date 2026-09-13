import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canManagePeople, isOrgAdmin, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "@/components/settings/company-form";

export const metadata: Metadata = { title: "Company settings" };

export default async function CompanySettingsPage() {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) redirect("/settings/profile");
  const supabase = await createClient();

  const [{ data: o }, { data: policies }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, legal_name, timezone, billing_email, ntn, strn, tax_jurisdiction, feb29_observed_on, late_announcement_policy, celebrate_on_terminated_exit")
      .eq("id", org.orgId)
      .single(),
    supabase.from("moment_policies").select("announcement_local_time, moment_types(key)").eq("org_id", org.orgId),
  ]);

  const birthday = (policies ?? []).find((p) => (p.moment_types as unknown as { key: string } | null)?.key === "birthday");
  const announceAt = String(birthday?.announcement_local_time ?? "09:00").slice(0, 5);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Company</h1>
      <p className="mt-1 text-sm text-ink-muted">How Moments runs for {org.orgName}.</p>
      <div className="mt-6 rounded-lg border border-rule bg-card p-5">
        {o && (
          <CompanyForm
            readOnly={!isOrgAdmin(org.role)}
            values={{
              name: o.name,
              legalName: o.legal_name,
              timezone: o.timezone,
              billingEmail: o.billing_email,
              ntn: o.ntn,
              strn: o.strn,
              taxJurisdiction: o.tax_jurisdiction,
              feb29: o.feb29_observed_on,
              latePolicy: o.late_announcement_policy,
              celebrateOnTerminatedExit: o.celebrate_on_terminated_exit,
              announceAt,
            }}
          />
        )}
      </div>
    </div>
  );
}
