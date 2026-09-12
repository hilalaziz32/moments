import type { Metadata } from "next";
import { requireOrg } from "@/lib/auth/org";
import { ImportWizard } from "@/components/onboarding/import-wizard";

export const metadata: Metadata = { title: "Upload your team" };

export default async function ImportPage() {
  await requireOrg();
  return <ImportWizard />;
}
