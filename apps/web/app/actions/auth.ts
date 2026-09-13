"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { webConfig } from "@/lib/config";
import { isSuperAdminUser } from "@/lib/auth/super-admin";

export type ActionResult =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string> };


/**
 * Where links in auth emails should point. NEXT_PUBLIC_APP_URL when it is set;
 * otherwise the host this request came in on. Falling back to localhost sent
 * every confirmation email from the live site to a dead localhost link.
 */
async function appOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return webConfig.app.url;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "Enter your work email.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length) {
    return { error: "Check the details below.", fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately does not distinguish "no such account" from "wrong password":
    // that difference is an account-enumeration oracle.
    return { error: "That email and password don't match. Try again." };
  }

  revalidatePath("/", "layout");
  redirect(isSuperAdminUser(data.user) ? "/admin" : "/dashboard");
}

export async function signup(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = "Tell us your name.";
  if (!email) fieldErrors.email = "Enter your work email.";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length) {
    return { error: "Check the details below.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await appOrigin()}/auth/callback?next=/setup`,
    },
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/setup");
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
