import "server-only";

import { headers } from "next/headers";
import { webConfig } from "@/lib/config";

/**
 * The public origin to put in links we send (confirmation, reset, invites).
 * NEXT_PUBLIC_APP_URL when it is set to a real domain; otherwise the host this
 * request came in on. Falling back to localhost sent links from the live site
 * to a dead address.
 */
export async function appOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return webConfig.app.url;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
