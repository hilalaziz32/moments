import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { webConfig } from "@/lib/config";
import type { Database } from "./types";

/**
 * Server client bound to the request's cookies. Subject to RLS -- this is what
 * every tenant-facing read and write should use.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "moments">(
    webConfig.supabase.url,
    webConfig.supabase.anonKey,
    {
      db: { schema: "moments" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled by middleware, so this is safe to ignore.
          }
        },
      },
    },
  );
}
