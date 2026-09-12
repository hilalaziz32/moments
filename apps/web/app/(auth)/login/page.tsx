import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">Pick up where your team left off.</p>

      <AuthForm
        action={login}
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Work email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />

      <p className="mt-6 text-sm text-ink-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
