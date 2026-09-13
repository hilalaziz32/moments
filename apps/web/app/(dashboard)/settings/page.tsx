import { redirect } from "next/navigation";
import { canManagePeople, requireOrg } from "@/lib/auth/org";

export default async function SettingsIndex() {
  const org = await requireOrg();
  redirect(canManagePeople(org.role) ? "/settings/company" : "/settings/profile");
}
