import express, { type Express } from "express";
import { logger } from "./lib/logger.js";
import { requireInternalKey } from "./middleware/internal-api-key.js";
import { runDetector } from "./cron/detector.js";
import { runAnnouncementWatchdog } from "./cron/watchdog.js";
import { db } from "./lib/supabase.js";

/**
 * The worker's tiny HTTP surface.
 *
 * Web calls the worker for exactly three things: run the detector now (after an
 * import or a policy change), retry a failed task, and check health. Everything
 * else between the two processes is mediated by the database.
 */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/internal-api/health", async (_req, res) => {
    const { error } = await db.from("job_runs").select("id").limit(1);
    res.status(error ? 503 : 200).json({
      ok: !error,
      service: "moments-worker",
      db: error ? "unreachable" : "ok",
    });
  });

  app.post("/internal-api/detector/run", requireInternalKey, async (req, res) => {
    const orgId = typeof req.body?.orgId === "string" ? req.body.orgId : undefined;
    const horizonDays = Number(req.body?.horizonDays) || undefined;
    try {
      const counts = await runDetector({ orgId, horizonDays });
      res.json({ ok: true, ...counts });
    } catch (err) {
      logger.error({ err: String(err) }, "manual detector run failed");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.post("/internal-api/tasks/:id/requeue", requireInternalKey, async (req, res) => {
    const { error } = await db.rpc("requeue_task", { p_task_id: req.params.id } as never);
    if (error) { res.status(400).json({ ok: false, error: error.message }); return; }
    res.json({ ok: true });
  });

  app.post("/internal-api/watchdog/run", requireInternalKey, async (_req, res) => {
    await runAnnouncementWatchdog();
    res.json({ ok: true });
  });

  return app;
}
