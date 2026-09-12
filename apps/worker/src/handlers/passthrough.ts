import type { TaskHandler } from "../poller/types.js";

/**
 * A handler that is not built yet.
 *
 * It SKIPS rather than succeeds, so the dashboard timeline tells the truth: the
 * step did not run. A stub that reported success would make a half-built
 * pipeline look complete, which is precisely the lie this product cannot afford.
 */
export function passthrough(type: string): TaskHandler {
  return {
    type,
    lane: "default",
    leaseSeconds: 60,
    async handle(ctx) {
      ctx.log.info({ type }, "handler not implemented yet");
      return { status: "skipped", reason: `${type}_not_implemented` };
    },
  };
}
