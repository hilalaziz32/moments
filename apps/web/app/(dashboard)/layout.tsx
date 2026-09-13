import { requireUser } from "@/lib/auth/guard";
import { requireOrg } from "@/lib/auth/org";
import { resumeSetupPath } from "@/lib/setup-step";
import { AppShell } from "@/components/shell/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const org = await requireOrg();
  const resumeHref = org.status === "trial" ? await resumeSetupPath(org) : null;
  return <AppShell org={org} user={user} resumeHref={resumeHref}>{children}</AppShell>;
}
