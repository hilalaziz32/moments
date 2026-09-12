import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { createApiApp } from "./app.js";
import { startPoller, stopPoller } from "./poller/loop.js";
import { startCrons } from "./cron/index.js";

/**
 * Worker entrypoint.
 *
 * The poller is safe at N replicas (SKIP LOCKED guarantees it), but the CRONS
 * ARE NOT without advisory locks -- so this process must run at exactly one
 * replica in production.
 */
function main(): void {
  const app = createApiApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, role: config.role, workerId: config.workerId }, "worker listening");
  });

  startPoller();
  startCrons();

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    stopPoller();
    server.close(() => process.exit(0));
    // In-flight tasks hold a lease; if we exceed this the reaper recovers them.
    setTimeout(() => process.exit(0), 15_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
