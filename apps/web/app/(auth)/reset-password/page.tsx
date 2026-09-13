import type { Metadata } from "next";
import Link from "next/link";
import { updatePassword } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/guard";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The reset link signs the person in via /auth/callback, then lands here.
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-ink">That link has expired</h1>
        <p className="mt-1 text-sm text-ink-muted">Reset links work once and only for a short while.</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-ink underline underline-offset-4">
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Choose a new password</h1>
      <p className="mt-1 text-sm text-ink-muted">For {user.email}.</p>
      <AuthForm
        action={updatePassword}
        submitLabel="Save password"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
          { name: "confirm", label: "Type it again", type: "password", autoComplete: "new-password" },
        ]}
      />
    </div>
  );
}
