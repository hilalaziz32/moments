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

/** Sends a reset link. Always reports success, so it can't reveal who has an account. */
export async function requestPasswordReset(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Check the details below.", fieldErrors: { email: "Enter the email you signed up with." } };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await appOrigin()}/auth/callback?next=/reset-password`,
  });
  return { success: true };
}

/** Sets a new password for the session the reset link just created. */
export async function updatePassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (confirm !== password) fieldErrors.confirm = "The two passwords don't match.";
  if (Object.keys(fieldErrors).length) return { error: "Check the details below.", fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "That reset link has expired. Ask for a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(isSuperAdminUser(user) ? "/admin" : "/dashboard");
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
