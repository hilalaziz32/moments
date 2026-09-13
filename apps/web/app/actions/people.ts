"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addDays } from "@moments/core/schedule";
import { normalizePhone } from "@moments/core/csv";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { canManagePeople, requireOrg } from "@/lib/auth/org";
import { requestDetectorRun } from "@/lib/internal-api";
import type { ActionResult } from "@/app/actions/onboarding";

/**
 * The moments no HR spreadsheet has. Somebody has to tell us about a promotion,
 * a wedding, a baby or a last day, so telling us must take seconds.
 */

const NEWS_KINDS = ["promotion", "marriage", "new_baby"] as const;
type NewsKind = (typeof NEWS_KINDS)[number];

const EXIT_REASONS = ["resigned", "retired", "end_of_contract", "redundancy", "terminated_for_cause"] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LATE_LIMIT_DAYS = 7;   // matches LIFE_EVENT_LOOKBACK_DAYS in the planner
const UNFINISHED = "(completed,cancelled,skipped)";

function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

function afterChange(orgId: string, employeeId: string) {
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/moments");
  revalidatePath("/dashboard");
  return requestDetectorRun(orgId);
}

/* ------------------------------------------------------------------- news */

export async function shareNews(_prev: unknown, fd: FormData): Promise<ActionResult<{ note: string }>> {
  const user = await requireUser();
  const org = await requireOrg();
  if (!canManagePeople(org.role)) return { error: "Only HR admins can log news." };

  const employeeId = String(fd.get("employeeId") ?? "");
  const kind = String(fd.get("kind") ?? "") as NewsKind;
  const eventDate = String(fd.get("eventDate") ?? "");
  const newTitle = String(fd.get("newTitle") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  const today = todayIn(org.timezone);

  const fieldErrors: Record<string, string> = {};
  if (!NEWS_KINDS.includes(kind)) fieldErrors.kind = "Pick what happened.";
  if (!ISO_DATE.test(eventDate)) fieldErrors.eventDate = "Pick the date it happens, or happened.";
  else if (eventDate < addDays(today, -365)) fieldErrors.eventDate = "That's more than a year ago.";
  else if (eventDate > addDays(today, 365)) fieldErrors.eventDate = "That's more than a year away.";
  if (newTitle.length > 120) fieldErrors.newTitle = "Keep the title under 120 characters.";
  if (note.length > 500) fieldErrors.note = "Keep the note under 500 characters.";
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("org_id", org.orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!emp) return { error: "We couldn't find that person." };

  const { data: policies } = await supabase
    .from("moment_policies")
    .select("moment_type_id, is_enabled, moment_types(key, label)")
    .eq("org_id", org.orgId);
  const policy = (policies ?? []).find(
    (p) => (p.moment_types as unknown as { key: string } | null)?.key === kind,
  );
  if (!policy) return { error: "This kind of moment isn't set up for your company." };
  const label = (policy.moment_types as unknown as { label: string } | null)?.label ?? "These";

  const details: Record<string, string> = {};
  if (newTitle) details.newTitle = newTitle;
  if (note) details.note = note;

  const { error } = await supabase.from("employee_events").insert({
    org_id: org.orgId,
    employee_id: employeeId,
    moment_type_id: policy.moment_type_id,
    event_date: eventDate,
    details: details as never,
    recorded_by: user.id,
  });
  if (error) return { error: "Couldn't save that. Try again." };

  if (kind === "promotion" && newTitle) {
    await supabase.from("employees").update({ job_title: newTitle }).eq("id", employeeId).eq("org_id", org.orgId);
  }

  await afterChange(org.orgId, employeeId);

  if (!policy.is_enabled) {
    return { success: true, note: `Saved. ${label} moments are switched off in Budgets, so nothing will happen.` };
  }
  if (eventDate < addDays(today, -LATE_LIMIT_DAYS)) {
    return { success: true, note: "Saved. It was more than a week ago, so we won't celebrate it now." };
  }
  return { success: true, note: "Saved. It will be planned automatically and show up under Moments." };
}

/** Undo logged news: stop celebrating it and cancel anything already planned. */
export async function withdrawNews(fd: FormData): Promise<void> {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) return;
  const eventId = String(fd.get("eventId") ?? "");
  const employeeId = String(fd.get("employeeId") ?? "");

  const supabase = await createClient();
  await supabase
    .from("employee_events")
    .update({ is_celebrated: false })
    .eq("id", eventId)
    .eq("org_id", org.orgId);
  await supabase
    .from("moment_events")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "News withdrawn" })
    .eq("org_id", org.orgId)
    .eq("occurrence_key", `evt:${eventId}`)
    .not("status", "in", UNFINISHED);

  await afterChange(org.orgId, employeeId);
}

/* ---------------------------------------------------------------- leaving */

export async function setLeaving(_prev: unknown, fd: FormData): Promise<ActionResult<{ note: string }>> {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) return { error: "Only HR admins can change this." };

  const employeeId = String(fd.get("employeeId") ?? "");
  const lastDay = String(fd.get("lastDay") ?? "");
  const reason = String(fd.get("reason") ?? "") as (typeof EXIT_REASONS)[number];
  const today = todayIn(org.timezone);

  const fieldErrors: Record<string, string> = {};
  if (!ISO_DATE.test(lastDay)) fieldErrors.lastDay = "Pick their last working day.";
  if (!EXIT_REASONS.includes(reason)) fieldErrors.reason = "Pick a reason.";
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .update({
      exit_date: lastDay,
      exit_reason: reason,
      // Still working through their last day; gone after it.
      status: lastDay < today ? "exited" : "notice_period",
    })
    .eq("id", employeeId)
    .eq("org_id", org.orgId)
    .select("id");

  if (error) {
    return error.code === "23514"
      ? { error: "Their last day can't be before they joined.", fieldErrors: { lastDay: "Before their joining date." } }
      : { error: "Couldn't save that. Try again." };
  }
  if (!data?.length) return { error: "We couldn't find that person." };

  // A moved last day is a new farewell; a firing gets none at all.
  let stale = supabase
    .from("moment_events")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Last day changed" })
    .eq("org_id", org.orgId)
    .eq("employee_id", employeeId)
    .like("occurrence_key", "exit:%")
    .not("status", "in", UNFINISHED);
  if (reason !== "terminated_for_cause") stale = stale.neq("occurrence_key", `exit:${lastDay}`);
  await stale;

  await afterChange(org.orgId, employeeId);

  if (reason === "terminated_for_cause") return { success: true, note: "Saved. There won't be a farewell." };
  if (lastDay < today) return { success: true, note: "Saved. Their last day has passed, so there's no farewell." };
  return { success: true, note: "Saved. A farewell is planned for their last day." };
}

export async function clearLeaving(fd: FormData): Promise<void> {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) return;
  const employeeId = String(fd.get("employeeId") ?? "");

  const supabase = await createClient();
  await supabase
    .from("employees")
    .update({ exit_date: null, exit_reason: null, status: "active" })
    .eq("id", employeeId)
    .eq("org_id", org.orgId);
  await supabase
    .from("moment_events")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "No longer leaving" })
    .eq("org_id", org.orgId)
    .eq("employee_id", employeeId)
    .like("occurrence_key", "exit:%")
    .not("status", "in", UNFINISHED);

  await afterChange(org.orgId, employeeId);
}

/* ------------------------------------------------------------- add person */

export async function addPerson(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const org = await requireOrg();
  if (!canManagePeople(org.role)) return { error: "Only HR admins can add people." };

  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const fullName = get("fullName");
  const workEmail = get("workEmail").toLowerCase();
  const phoneRaw = get("phone");
  const dateOfBirth = get("dateOfBirth");
  const hireDate = get("hireDate");
  const jobTitle = get("jobTitle");
  const department = get("department");
  const managerId = get("managerId");
  const today = todayIn(org.timezone);

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 1 || fullName.length > 200) fieldErrors.fullName = "Enter their full name.";
  if (workEmail && !EMAIL.test(workEmail)) fieldErrors.workEmail = "That doesn't look like an email address.";

  let phone: string | null = null;
  if (phoneRaw) {
    const parsed = normalizePhone(phoneRaw);
    if (parsed.ok) phone = parsed.e164;
    else fieldErrors.phone = "Enter a mobile number like 0300 1234567.";
  }
  if (!workEmail && !phoneRaw) fieldErrors.phone = "Add a phone number or an email, so we can reach them.";

  if (dateOfBirth && (!ISO_DATE.test(dateOfBirth) || dateOfBirth >= today || dateOfBirth <= "1930-01-01")) {
    fieldErrors.dateOfBirth = "Pick a real date of birth.";
  }
  if (hireDate && (!ISO_DATE.test(hireDate) || hireDate <= "1970-01-01")) {
    fieldErrors.hireDate = "Pick a real joining date.";
  }
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted fields.", fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      org_id: org.orgId,
      full_name: fullName,
      work_email: workEmail || null,
      phone_e164: phone,
      date_of_birth: dateOfBirth || null,
      hire_date: hireDate || null,
      job_title: jobTitle || null,
      department: department || null,
      manager_id: managerId || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "Someone with this email is already on the team.", fieldErrors: { workEmail: "Already on the team." } };
    }
    return { error: "Couldn't add them. Try again." };
  }

  await afterChange(org.orgId, data.id);
  redirect(`/employees/${data.id}`);
}
