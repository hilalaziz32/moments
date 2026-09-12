import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Create an account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Set up your team once. We&rsquo;ll take it from there.
      </p>

      <AuthForm
        action={signup}
        submitLabel="Create account"
        fields={[
          { name: "fullName", label: "Your name", type: "text", autoComplete: "name" },
          { name: "email", label: "Work email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password",
            hint: "At least 8 characters." },
        ]}
      />

      <p className="mt-6 text-sm text-ink-muted">
        Already set up?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
