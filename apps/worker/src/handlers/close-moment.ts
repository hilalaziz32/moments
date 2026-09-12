import type { TaskHandler } from "../poller/types.js";

/** T+2: finalise the moment so the dashboard stops showing it as in flight. */
export const closeMoment: TaskHandler = {
  type: "close_moment",
  lane: "slow",
  leaseSeconds: 60,

  async handle(ctx) {
    const { error } = await ctx.db
      .from("moment_events")
      .update({ status: "completed", completed_at: new Date().toISOString() } as never)
      .eq("id", ctx.task.moment_event_id)
      .not("status", "in", "(cancelled,skipped,rejected)");

    if (error) throw new Error(error.message);
    return { status: "done", result: { closed: true } };
  },
};
