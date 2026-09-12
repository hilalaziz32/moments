import { requireUser } from "@/lib/auth/guard";
import { requireOrg } from "@/lib/auth/org";
import { AppShell } from "@/components/shell/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const org = await requireOrg();
  return <AppShell org={org} user={user}>{children}</AppShell>;
}
