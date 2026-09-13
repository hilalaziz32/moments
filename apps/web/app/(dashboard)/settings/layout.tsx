import { canManagePeople, requireOrg } from "@/lib/auth/org";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const org = await requireOrg();
  const people = canManagePeople(org.role);

  const items = [
    ...(people
      ? [
          { href: "/settings/company", label: "Company" },
          { href: "/settings/team", label: "Team members" },
          { href: "/settings/moments", label: "Budgets" },
          { href: "/settings/messages", label: "Messages" },
          { href: "/settings/activity", label: "Activity" },
        ]
      : []),
    { href: "/settings/profile", label: "Your profile" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      <SettingsNav items={items} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
