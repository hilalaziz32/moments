import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canManagePeople, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { AddPersonForm } from "@/components/people/add-person-form";

export const metadata: Metadata = { title: "Add a person" };

export default async function AddPersonPage() {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) redirect("/employees");

  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, full_name, preferred_name")
    .eq("org_id", org.orgId)
    .is("deleted_at", null)
    .neq("status", "exited")
    .order("full_name")
    .limit(1000);

  const managers = (data ?? []).map((e) => ({ id: e.id, name: e.preferred_name || e.full_name }));

  return (
    <div className="max-w-xl">
      <Link href="/employees" className="text-sm text-ink-muted hover:text-ink">← Team</Link>
      <h1 className="mt-3 text-xl font-semibold text-ink">Add a person</h1>
      <p className="mt-1 text-sm text-ink-muted">
        For someone joining between imports. Everything except their name can be filled in later.
      </p>
      <div className="mt-6 rounded-lg border border-rule bg-card p-5">
        <AddPersonForm managers={managers} />
      </div>
    </div>
  );
}
