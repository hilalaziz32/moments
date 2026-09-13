import { db } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";

/**
 * 1st of the month, 02:00 local: invoice last month for every live org.
 *
 * generate_invoice is idempotent by (org, period), so a re-run -- or two workers
 * racing -- returns the existing invoice instead of billing twice.
 */
export async function runMonthlyBilling(now = new Date()): Promise<{ invoiced: number; failed: number }> {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone, year: "numeric", month: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const mm = String(prevMonth).padStart(2, "0");
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const periodStart = `${prevYear}-${mm}-01`;
  const periodEnd = `${prevYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const startedAt = Date.now();
  const { data: run } = await db
    .from("job_runs")
    .insert({ kind: "billing", worker_id: config.workerId })
    .select("id")
    .single();

  const { data: orgs } = await db
    .from("organizations")
    .select("id")
    .in("status", ["trial", "active", "past_due"])
    .is("deleted_at", null);

  let invoiced = 0;
  let failed = 0;
  for (const org of orgs ?? []) {
    const { error } = await db.rpc("generate_invoice", {
      p_org_id: org.id, p_period_start: periodStart, p_period_end: periodEnd,
    });
    if (error) {
      failed++;
      logger.error({ org_id: org.id, err: error.message }, "invoice generation failed");
    } else {
      invoiced++;
    }
  }

  await db.from("job_runs").update({
    status: failed > 0 && invoiced === 0 ? "failed" : "succeeded",
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    counts: { invoiced, failed, periodStart, periodEnd },
  }).eq("id", run?.id ?? "");

  logger.info({ invoiced, failed, periodStart, periodEnd }, "monthly billing finished");
  return { invoiced, failed };
}
