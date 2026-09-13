import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-muted">We&rsquo;ll email you a link to choose a new one.</p>

      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        successMessage="If that email has an account, a reset link is on its way. It works once and expires within the hour."
        fields={[{ name: "email", label: "Work email", type: "email", autoComplete: "email" }]}
      />

      <p className="mt-6 text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  );
}
