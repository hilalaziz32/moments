import type { TaskHandler } from "../poller/types.js";
import { raiseAlert } from "../lib/alerts.js";

/**
 * The details window has closed. Carry on with the last known address rather than
 * stall the moment, and tell HR if there is no address at all -- the digital
 * backup will cover the day, but a person should know why.
 */
export const verifyDetailsFinalize: TaskHandler = {
  type: "verify_details_finalize",
  lane: "default",
  leaseSeconds: 60,

  async handle(ctx) {
    const { data: event } = await ctx.db
      .from("moment_events")
      .select("id, org_id, employee_id, status, occurs_on, employees(full_name, preferred_name)")
      .eq("id", ctx.task.moment_event_id)
      .single();

    if (!event?.employee_id) return { status: "skipped", reason: "no_employee" };
    if (event.status !== "needs_info") return { status: "skipped", reason: "details_already_confirmed" };

    const { data: address } = await ctx.db
      .from("addresses")
      .select("id")
      .eq("employee_id", event.employee_id)
      .eq("is_primary", true)
      .eq("is_active", true)
      .maybeSingle();

    await ctx.db.from("moment_events").update({ status: "scheduled" }).eq("id", event.id);

    if (!address) {
      const emp = event.employees as unknown as { full_name: string; preferred_name: string | null } | null;
      await raiseAlert("p2", `no_address:${event.id}`,
        "No delivery address for an upcoming moment",
        `${emp?.preferred_name || emp?.full_name || "An employee"} hasn't confirmed an address and there's none on file for ${event.occurs_on}. A digital gift will go out on the day unless one is added.`,
        event.org_id);
    }

    return { status: "done", result: { usedLastKnownAddress: Boolean(address) } };
  },
};
