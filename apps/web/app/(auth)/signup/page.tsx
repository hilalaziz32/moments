import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const joining = next?.startsWith("/join/");
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ""}` : "/login";

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">{joining ? "Create your account" : "Start with Moments"}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {joining
          ? "Then you'll join your team straight away."
          : "Set up in about ten minutes. Nothing is sent to your team until you say so."}
      </p>

      <AuthForm
        action={signup}
        submitLabel="Create account"
        hidden={next ? { next } : undefined}
        defaults={email ? { email } : undefined}
        fields={[
          { name: "fullName", label: "Your name", type: "text", autoComplete: "name" },
          { name: "email", label: "Work email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
        ]}
      />

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-ink underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  );
}
