import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; error?: string }>;
}) {
  const { next, email, error } = await searchParams;
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ""}` : "/signup";

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">Pick up where your team left off.</p>

      {error === "link_expired" && (
        <p role="alert" className="mt-4 rounded-lg border border-rule bg-surface-sunk px-4 py-3 text-sm text-ink">
          That link has expired or was already used. Sign in, or ask for a new one.
        </p>
      )}

      <AuthForm
        action={login}
        submitLabel="Sign in"
        hidden={next ? { next } : undefined}
        defaults={email ? { email } : undefined}
        fields={[
          { name: "email", label: "Work email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />

      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="text-ink-muted underline underline-offset-4 hover:text-ink">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-6 text-sm text-ink-muted">
        New here?{" "}
        <Link href={signupHref} className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
