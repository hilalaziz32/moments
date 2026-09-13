import { db } from "./supabase.js";
import { logger } from "./logger.js";

/**
 * Records an alert for the ops team.
 *
 * alerts has a partial unique index on dedupe_key WHERE status = 'open', so a
 * flapping condition creates one alert rather than four hundred.
 */
export async function raiseAlert(
  severity: "p1" | "p2" | "p3",
  dedupeKey: string,
  title: string,
  body: string,
  orgId?: string,
): Promise<void> {
  const { error } = await db.from("alerts").insert({
    severity,
    kind: dedupeKey.split(":")[0] ?? "worker",
    dedupe_key: dedupeKey,
    title,
    body,
    org_id: orgId ?? null,
  });
  if (error && !error.message.includes("duplicate key")) {
    logger.error({ err: error.message }, "could not record alert");
  }
}
