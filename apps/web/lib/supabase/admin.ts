import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { webConfig } from "@/lib/config";
import type { Database } from "./types";

/**
 * Service-role client. BYPASSES RLS.
 *
 * NEVER import this into a client component, and never reach for it just to make
 * a query "work" -- if a tenant-facing query returns nothing, the policy is the
 * thing to fix. Legitimate uses: the tokenised public flows (which call
 * SECURITY DEFINER RPCs), webhook handlers, and bulk import.
 */
export function createAdminClient() {
  return createSupabaseClient<Database, "moments">(
    webConfig.supabase.url,
    webConfig.supabase.serviceRoleKey,
    {
      db: { schema: "moments" },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
