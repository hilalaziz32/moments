"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/origin";
import { isSuperAdminUser } from "@/lib/auth/super-admin";

export type ActionResult =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string> };

/** Same-site paths only, so ?next= can never send someone to another site. */
function safeNext(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : null;
}

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "Enter your work email.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length) {
    return { error: "Check the details below.", fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("not confirmed")) {
      return { error: "Confirm your email first. Check your inbox for the link we sent." };
    }
    // Deliberately does not distinguish "no such account" from "wrong password":
    // that difference is an account-enumeration oracle.
    return { error: "That email and password don't match. Try again." };
  }

  revalidatePath("/", "layout");
  redirect(next ?? (isSuperAdminUser(data.user) ? "/admin" : "/dashboard"));
}

export async function signup(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const next = safeNext(formData.get("next"));

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = "Tell us your name.";
  if (!email) fieldErrors.email = "Enter your work email.";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length) {
    return { error: "Check the details below.", fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await appOrigin()}/auth/callback?next=${encodeURIComponent(next ?? "/setup")}`,
    },
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  // With email confirmation on there is no session yet: say so, rather than
  // bouncing them to a sign-in page that will refuse them.
  if (!data.session) redirect(`/check-email?email=${encodeURIComponent(email)}`);
  redirect(next ?? "/setup");
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
