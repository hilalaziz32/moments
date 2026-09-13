import "server-only";

import { webConfig } from "@/lib/config";

/**
 * Asks the worker to run the detector for one org now, so a promotion logged
 * for tomorrow is planned today rather than at 00:15.
 *
 * Best effort by design: if the worker is unreachable, the nightly run still
 * picks the change up. It never blocks or fails the HR action that called it.
 */
export async function requestDetectorRun(orgId: string): Promise<void> {
  const { baseUrl, key } = webConfig.internalApi;
  if (!key) return;
  try {
    await fetch(`${baseUrl}/detector/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-api-key": key },
      body: JSON.stringify({ orgId }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Nightly detector covers it.
  }
}
