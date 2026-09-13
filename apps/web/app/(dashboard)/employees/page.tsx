import type { Metadata } from "next";
import Link from "next/link";
import { canManagePeople, requireOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Team" };

export default async function EmployeesPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const canEdit = canManagePeople(org.role);

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, preferred_name, department, job_title, date_of_birth, hire_date, exit_date, status")
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
        {canEdit && (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/setup/import">Import a sheet</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/employees/new">Add a person</Link>
            </Button>
          </div>
        )}
      </div>

      {canEdit && (
        <p className="mt-4 text-sm text-ink-muted">
          Birthdays and work anniversaries come from the sheet. Promotions, weddings, new babies and
          people leaving don&rsquo;t, so open someone to tell us.
        </p>
      )}

      {incomplete > 0 && (
        <p className="mt-4 rounded-lg border border-rule bg-surface-sunk px-4 py-3 text-sm text-ink-muted">
          {incomplete} {incomplete === 1 ? "person is" : "people are"} missing a birthday or
          joining date, so we can&rsquo;t celebrate them yet.
        </p>
      )}

      {/* Phones: one card per person. The table's date columns fell off-screen at 390px. */}
      <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card sm:hidden">
        {rows.map((e) => (
          <li key={e.id}>
            <Link href={`/employees/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-surface-sunk">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{e.preferred_name || e.full_name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {[e.job_title, e.department].filter(Boolean).join(" · ") || "No title yet"}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs">
                {e.date_of_birth
                  ? <span className="block text-ink-muted">Birthday {formatDate(e.date_of_birth, { year: false })}</span>
                  : <span className="block text-state-waiting">no birthday</span>}
                {e.exit_date && <span className="block text-ink-faint">Leaving {formatDate(e.exit_date, { year: false })}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 hidden overflow-x-auto rounded-lg border border-rule bg-card sm:block">
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
              <tr key={e.id} className="border-b border-rule last:border-0 hover:bg-surface-sunk">
                <td className="px-5 py-3">
                  <Link href={`/employees/${e.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {e.preferred_name || e.full_name}
                  </Link>
                  {e.job_title && <span className="block text-xs text-ink-faint">{e.job_title}</span>}
                  {e.exit_date && (
                    <span className="block text-xs text-ink-muted">
                      {e.status === "exited" ? "Left" : "Leaving"} {formatDate(e.exit_date)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-ink-muted">{e.department ?? "—"}</td>
                <td className="px-5 py-3">
                  {e.date_of_birth
                    ? <time data-numeric dateTime={e.date_of_birth} className="text-ink-muted">{formatDate(e.date_of_birth)}</time>
                    : <span className="text-state-waiting">missing</span>}
                </td>
                <td className="px-5 py-3">
                  {e.hire_date
                    ? <time data-numeric dateTime={e.hire_date} className="text-ink-muted">{formatDate(e.hire_date)}</time>
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
