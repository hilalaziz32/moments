import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Routes reachable without a session.
 *
 * `/c/`, `/a/` and `/f/` are the tokenised, login-free flows: address
 * confirmation, approval, feedback. They must bypass the auth redirect entirely.
 */
const PUBLIC_PREFIXES = [
  "/login", "/signup", "/forgot-password", "/reset-password", "/set-password",
  "/accept-invite", "/auth/callback", "/auth/confirm",
  "/c/", "/a/", "/f/", "/i/",
  "/api/slack", "/api/whatsapp", "/api/email", "/api/twilio", "/api/health",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/**
 * THIS FUNCTION MUST NEVER THROW.
 *
 * A throwing middleware takes down every route on the site -- the landing page
 * included -- as Vercel's MIDDLEWARE_INVOCATION_FAILED, with nothing useful on
 * screen. Missing configuration or an unreachable Supabase must degrade to a
 * clear message and a log line, not a blank 500 for everyone.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
      "Add them to the deployment's environment variables and REDEPLOY: NEXT_PUBLIC_* values " +
      "are baked in at build time, so setting them alone changes nothing.",
    );
    if (isPublic(pathname)) return response;
    return new NextResponse(
      "Moments isn't configured yet: the Supabase environment variables are missing.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  let user: { id: string } | null = null;
  try {
    const supabase = createServerClient<Database, "moments">(url, anonKey, {
      db: { schema: "moments" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Do not remove: this refreshes the session cookie. Without it, a user is
    // silently logged out mid-session.
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // Supabase unreachable or misconfigured. Treat as signed out: public pages
    // still render, protected ones send the person to sign in.
    console.error("[middleware] could not check the session:", err instanceof Error ? err.message : err);
  }

  if (!user && !isPublic(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
