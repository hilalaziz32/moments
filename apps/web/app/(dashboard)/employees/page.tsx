import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Team" };

export default async function EmployeesPage() {
  const org = await requireOrg();
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, preferred_name, work_email, department, job_title, date_of_birth, hire_date, status")
    .eq("org_id", org.orgId)
    .is("deleted_at", null)
    .order("full_name")
    .limit(500);

  const rows = employees ?? [];
  const incomplete = rows.filter((e) => !e.date_of_birth || !e.hire_date).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">
          Team <span className="font-normal text-ink-faint">{rows.length}</span>
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/setup/import">Import more people</Link>
        </Button>
      </div>

      {incomplete > 0 && (
        <p className="mt-4 rounded-lg border border-rule bg-surface-sunk px-4 py-3 text-sm text-ink-muted">
          {incomplete} {incomplete === 1 ? "person is" : "people are"} missing a birthday or
          joining date, so we can&rsquo;t celebrate them yet.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-card">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <caption className="sr-only">Everyone in {org.orgName}</caption>
          <thead>
            <tr className="border-b border-rule text-xs text-ink-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">Name</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Department</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Birthday</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-rule last:border-0">
                <td className="px-5 py-3">
                  <span className="font-medium text-ink">{e.preferred_name || e.full_name}</span>
                  {e.job_title && <span className="block text-xs text-ink-faint">{e.job_title}</span>}
                </td>
                <td className="px-5 py-3 text-ink-muted">{e.department ?? "—"}</td>
                <td className="px-5 py-3">
                  {e.date_of_birth
                    ? <time data-numeric dateTime={e.date_of_birth} className="text-ink-muted">{fmt(e.date_of_birth)}</time>
                    : <span className="text-state-waiting">missing</span>}
                </td>
                <td className="px-5 py-3">
                  {e.hire_date
                    ? <time data-numeric dateTime={e.hire_date} className="text-ink-muted">{fmt(e.hire_date)}</time>
                    : <span className="text-state-waiting">missing</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}
