"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { requireOrg, isOrgAdmin, ACTIVE_ORG_COOKIE } from "@/lib/auth/org";
import { employeeImportRowSchema } from "@moments/contracts";
import { planOrgNow } from "@/lib/planning";

/**
 * Server action result.
 *
 * Deliberately NOT `{ success: true; [k: string]: unknown }` -- an index
 * signature on the success branch makes `error` resolve to `unknown` on both
 * branches, so `"error" in state` stops narrowing and every consumer breaks.
 */
export type ActionError = { error: string; fieldErrors?: Record<string, string> };
export type ActionResult<T = Record<never, never>> = ({ success: true } & T) | ActionError;

/* ------------------------------------------------------------------ step 0 */

export async function createOrganization(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "Asia/Karachi");
  const hintRaw = String(formData.get("employeeCountHint") ?? "").trim();

  if (name.length < 2) {
    return { error: "Check the details below.", fieldErrors: { name: "Enter your company name." } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_timezone: timezone,
    p_employee_count_hint: hintRaw ? Number(hintRaw) : null,
  } as never);

  if (error) return { error: error.message };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, String(data), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  redirect("/setup/import");
}

/* ------------------------------------------------------------- steps 1 - 3 */

export interface StagedRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
  errors: { field: string; code: string; message: string }[];
}

/**
 * Stages parsed CSV rows for review.
 *
 * Written in chunks of 200: the `authenticator` role carries
 * statement_timeout = 8s, so a single insert of 5,000 rows is killed mid-flight.
 */
export async function stageImport(payload: {
  filename: string;
  columnMapping: Record<string, string | null>;
  dateFormats: Record<string, string>;
  matchOn: "work_email" | "employee_code";
  rows: StagedRow[];
}): Promise<ActionResult<{ batchId: string; valid: number; invalid: number }>> {
  const org = await requireOrg();
  const user = await requireUser();
  const supabase = await createClient();

  const valid = payload.rows.filter((r) => r.errors.length === 0);
  const invalid = payload.rows.length - valid.length;

  const { data: batch, error: batchError } = await supabase
    .from("employee_import_batches")
    .insert({
      org_id: org.orgId,
      uploaded_by: user.id,
      filename: payload.filename,
      status: "validated",
      column_mapping: payload.columnMapping,
      options: { match_on: payload.matchOn, date_formats: payload.dateFormats },
      total_rows: payload.rows.length,
      valid_rows: valid.length,
      error_rows: invalid,
    })
    .select("id")
    .single();

  if (batchError || !batch) return { error: batchError?.message ?? "Could not start the import." };

  const CHUNK = 200;
  for (let i = 0; i < payload.rows.length; i += CHUNK) {
    const slice = payload.rows.slice(i, i + CHUNK).map((r) => ({
      batch_id: batch.id,
      org_id: org.orgId,
      row_number: r.rowNumber,
      raw: r.raw as never,
      normalized: r.normalized as never,
      status: (r.errors.length === 0 ? "valid" : "invalid") as "valid" | "invalid",
      errors: r.errors as never,
    }));
    const { error } = await supabase.from("employee_import_rows").insert(slice);
    if (error) return { error: `Row ${i + 1}: ${error.message}` };
  }

  revalidatePath("/setup/import");
  return { success: true, batchId: batch.id, valid: valid.length, invalid };
}

/** Loops the chunked RPC until nothing is left. */
export async function commitImport(
  batchId: string,
): Promise<ActionResult<{ imported: number; updated: number }>> {
  const org = await requireOrg();
  const supabase = await createClient();

  let imported = 0;
  let updated = 0;
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase.rpc("commit_employee_import", {
      p_batch_id: batchId,
      p_chunk: 200,
    } as never);
    if (error) return { error: error.message };

    const row = (Array.isArray(data) ? data[0] : data) as
      | { imported: number; updated: number; remaining: number }
      | undefined;
    if (!row) break;
    imported += row.imported;
    updated += row.updated;
    if (row.remaining === 0) break;
  }

  // A re-import after going live can bring new hires and changed dates.
  if (org.status !== "trial") await planOrgNow(org.orgId);

  revalidatePath("/", "layout");
  return { success: true, imported, updated };
}

/* ------------------------------------------------------------------ step 4 */

export async function saveBudgets(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const org = await requireOrg();
  const mode = formData.get("mode") === "settings" ? "settings" : "onboarding";

  // RLS only lets owners and admins write budgets, and a blocked UPDATE is not
  // an error -- it just changes nothing. Say so instead of pretending it saved.
  if (!isOrgAdmin(org.role)) {
    return { error: "Only an owner or admin can change budgets." };
  }

  const supabase = await createClient();

  type PolicyUpdate = { is_enabled: boolean; approval_required: boolean; budget_paisa?: number };
  const updates: { id: string; patch: PolicyUpdate }[] = [];
  const fieldErrors: Record<string, string> = {};

  // Keyed off the hidden `policy` field, not `budget:<id>`: a switched-off
  // moment's budget box is disabled, and disabled inputs are not submitted.
  for (const raw of new Set(formData.getAll("policy").map(String))) {
    const policyId = raw;
    const enabled = formData.get(`enabled:${policyId}`) === "on";
    const approval = formData.get(`approval:${policyId}`) === "on";
    const budgetField = formData.get(`budget:${policyId}`);

    if (!enabled) {
      // Keep the stored budget so switching a moment back on restores it.
      updates.push({ id: policyId, patch: { is_enabled: false, approval_required: approval } });
      continue;
    }

    const rupees = Number(String(budgetField ?? "").replace(/[^\d.]/g, ""));
    if (budgetField === null || !Number.isFinite(rupees) || rupees < 100) {
      fieldErrors[`budget:${policyId}`] = "Set at least PKR 100, or turn this moment off.";
      continue;
    }
    if (rupees > 1_000_000) {
      fieldErrors[`budget:${policyId}`] = "That is above the PKR 1,000,000 limit.";
      continue;
    }
    updates.push({
      id: policyId,
      patch: { is_enabled: true, approval_required: approval, budget_paisa: Math.round(rupees * 100) },
    });
  }

  if (Object.keys(fieldErrors).length) {
    return { error: "Check the budgets highlighted on the left.", fieldErrors };
  }

  for (const u of updates) {
    const { data, error } = await supabase
      .from("moment_policies")
      .update(u.patch)
      .eq("id", u.id)
      .eq("org_id", org.orgId)
      .select("id");
    if (error) return { error: error.message };
    if (!data || data.length === 0) {
      return { error: "Some budgets could not be saved. Refresh the page and try again." };
    }
  }

  // Budgets are pre-seeded with defaults, so the data alone can't tell whether
  // this step was done. Record it, so "pick up where you left off" skips ahead.
  if (!org.onboardingState.budgets_saved_at) {
    await supabase
      .from("organizations")
      .update({
        onboarding_state: { ...org.onboardingState, budgets_saved_at: new Date().toISOString() } as never,
      })
      .eq("id", org.orgId);
  }

  // Switching a moment on after going live should plan it straight away.
  if (org.status !== "trial") await planOrgNow(org.orgId);

  revalidatePath("/", "layout");
  if (mode === "settings") return { success: true };
  redirect("/setup/messages");
}

/* ------------------------------------------------------------------ step 5 */

/** Leaves the messages step, remembering it was seen so setup resumes past it. */
export async function finishMessagesStep(): Promise<void> {
  const org = await requireOrg();
  if (!org.onboardingState.messages_seen_at) {
    const supabase = await createClient();
    await supabase
      .from("organizations")
      .update({ onboarding_state: { ...org.onboardingState, messages_seen_at: new Date().toISOString() } as never })
      .eq("id", org.orgId);
  }
  revalidatePath("/", "layout");
  redirect("/setup/review");
}

/* ------------------------------------------------------------------ step 6 */

export async function goLive(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const org = await requireOrg();
  const supabase = await createClient();
  const keepDryRun = formData.get("dryRun") === "on";

  const { error } = await supabase
    .from("organizations")
    .update({
      status: "active",
      // Dry run defaults ON for a week. Every message renders and every task
      // runs; sends go only to the HR admin with a [PREVIEW] banner.
      dry_run_until: keepDryRun
        ? new Date(Date.now() + 7 * 86_400_000).toISOString()
        : null,
      onboarding_state: { ...org.onboardingState, completed_at: new Date().toISOString() } as never,
    })
    .eq("id", org.orgId);

  if (error) return { error: error.message };

  // Plan now so the dashboard they land on already shows their people.
  await planOrgNow(org.orgId);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
