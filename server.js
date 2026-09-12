/**
 * Mono-image entrypoint.
 *
 * Both Railway services deploy the SAME image and differ only by PROCESS_ROLE:
 *
 *   web    -> Next.js only. No crons, no poller.
 *   worker -> crons + task poller + the internal HTTP surface.
 *   all    -> both, for local development.
 *
 * WHY SPLIT: every web deploy restarts the container. If the poller lived in the
 * web container, a 09:02 hotfix would kill in-flight announcement sends. Leases
 * would recover them -- but "recovered" means "late", and late is the one
 * failure this product cannot have.
 *
 * The worker must run at EXACTLY ONE replica: the poller is safe at N thanks to
 * SKIP LOCKED, but the crons are not without advisory locks.
 */
const role = process.env.PROCESS_ROLE || "all";
const port = Number(process.env.PORT || 3000);

async function startWeb() {
  const next = (await import("next")).default;
  const { createServer } = await import("node:http");
  const app = next({ dev: false, dir: "./apps/web" });
  await app.prepare();
  const handle = app.getRequestHandler();
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(JSON.stringify({ msg: "web listening", port, role }));
  });
}

async function startWorker() {
  await import("./apps/worker/dist/index.js");
}

async function main() {
  if (role === "web" || role === "all") await startWeb();
  if (role === "worker" || role === "all") await startWorker();
  if (!["web", "worker", "all"].includes(role)) {
    console.error(`Unknown PROCESS_ROLE "${role}". Use web, worker or all.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
