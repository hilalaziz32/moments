import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/**
 * Service-role client, scoped to the `moments` schema. BYPASSES RLS.
 *
 * The worker is the one place where that is correct: it acts on behalf of the
 * system across every tenant, and the queue RPCs are granted to service_role
 * alone.
 */
export const db = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  db: { schema: "moments" },
  auth: { autoRefreshToken: false, persistSession: false },
});
