import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canManagePeople, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { EditPersonForm } from "@/components/people/edit-person-form";
import { removePerson } from "@/app/actions/people";

export const metadata: Metadata = { title: "Edit person" };

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg();
  if (!canManagePeople(org.role)) redirect(`/employees/${id}`);
  const supabase = await createClient();

  const [{ data: e }, { data: team }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, preferred_name, work_email, personal_email, phone_e164, whatsapp_e164, date_of_birth, hire_date, job_title, department, manager_id, halal_only, is_vegetarian, needs_eggless, allergies, shirt_size, celebration_opt_out, hide_birth_year")
      .eq("id", id).eq("org_id", org.orgId).is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id, full_name, preferred_name")
      .eq("org_id", org.orgId).is("deleted_at", null).neq("status", "exited")
      .order("full_name").limit(1000),
  ]);
  if (!e) notFound();

  const name = e.preferred_name || e.full_name;

  return (
    <div className="max-w-2xl">
      <Link href={`/employees/${e.id}`} className="text-sm text-ink-muted hover:text-ink">← {name}</Link>
      <h1 className="mt-3 text-xl font-semibold text-ink">Edit {name}</h1>

      <div className="mt-6 rounded-lg border border-rule bg-card p-5">
        <EditPersonForm
          managers={(team ?? []).map((t) => ({ id: t.id, name: t.preferred_name || t.full_name }))}
          person={{
            id: e.id,
            fullName: e.full_name,
            preferredName: e.preferred_name,
            workEmail: e.work_email,
            personalEmail: e.personal_email,
            phone: e.phone_e164,
            whatsapp: e.whatsapp_e164,
            dateOfBirth: e.date_of_birth,
            hireDate: e.hire_date,
            jobTitle: e.job_title,
            department: e.department,
            managerId: e.manager_id,
            halalOnly: e.halal_only,
            isVegetarian: e.is_vegetarian,
            needsEggless: e.needs_eggless,
            allergies: e.allergies ?? [],
            shirtSize: e.shirt_size,
            celebrationOptOut: e.celebration_opt_out,
            hideBirthYear: e.hide_birth_year,
          }}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink">Remove from the team</h2>
        <p className="mt-1 text-sm text-ink-muted">
          For someone added by mistake. If they&rsquo;re leaving, set their last day instead so they get a farewell.
        </p>
        <form action={removePerson} className="mt-3">
          <input type="hidden" name="employeeId" value={e.id} />
          <button type="submit" className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/5">
            Remove {name}
          </button>
        </form>
      </section>
    </div>
  );
}
