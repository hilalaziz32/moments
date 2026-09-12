"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/public-env";
import type { Database } from "./types";

/**
 * Browser client. Scoped to the `moments` schema -- `public` on this project
 * belongs to an unrelated application.
 */
export function createClient() {
  return createBrowserClient<Database, "moments">(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    { db: { schema: "moments" } },
  );
}
