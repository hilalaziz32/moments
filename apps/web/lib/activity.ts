import "server-only";

import { getCurrentUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The customer-facing activity log: "who changed the birthday budget?".
 *
 * Written with the service client because audit_log is append-only and has no
 * tenant INSERT grant -- so a customer can't forge or erase history. Names are
 * captured at write time: if Bilal is removed later, the log still says who.
 * Never throws; losing a log line must not fail the change itself.
 */
export async function logActivity(
  orgId: string,
  action: string,
  entity: "employees" | "org_members" | "organizations" | "moment_policies" | "org_integrations",
  entityId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const db = createAdminClient();
    const user = await getCurrentUser();
    const after: Record<string, unknown> = { ...details };

    if (entityId && entity === "employees" && !after.name) {
      const { data } = await db.from("employees").select("full_name, preferred_name").eq("id", entityId).maybeSingle();
      if (data) after.name = data.preferred_name || data.full_name;
    }
    if (entityId && entity === "org_members" && !after.name) {
      const { data: m } = await db.from("org_members").select("user_id").eq("id", entityId).maybeSingle();
      if (m) {
        const { data: p } = await db.from("profiles").select("full_name, email").eq("id", m.user_id).maybeSingle();
        after.name = p?.full_name || p?.email || "a member";
      }
    }

    await db.from("audit_log").insert({
      org_id: orgId,
      actor_kind: "user",
      actor_user_id: user?.id ?? null,
      actor_label: user?.fullName || user?.email || null,
      action,
      entity,
      entity_id: entityId,
      after: after as never,
    } as never);
  } catch (err) {
    console.error("[activity] could not log", action, err);
  }
}
