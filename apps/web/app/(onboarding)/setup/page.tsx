import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getActiveOrg } from "@/lib/auth/org";
import { CreateOrgForm } from "@/components/onboarding/create-org-form";
import { resumeSetupPath } from "@/lib/setup-step";

export const metadata: Metadata = { title: "Set up your company" };

export default async function SetupPage() {
  await requireUser();
  const org = await getActiveOrg();
  if (org) redirect(await resumeSetupPath(org));

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Tell us about your company</h1>
      <p className="mt-1 max-w-md text-sm text-ink-muted">
        This takes about fifteen seconds. You can change any of it later.
      </p>
      <CreateOrgForm />
    </div>
  );
}
