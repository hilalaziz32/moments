import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your inbox" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Check your inbox</h1>
      <p className="mt-2 text-sm text-ink-muted">
        We sent a confirmation link to{" "}
        <span className="font-medium text-ink">{email ?? "your email"}</span>. Open it on this device to finish
        signing up.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-ink-muted">
        <li>Not there after a minute? Look in spam or promotions.</li>
        <li>Wrong address? <Link href="/signup" className="text-ink underline underline-offset-4">Sign up again</Link>.</li>
        <li>Already confirmed? <Link href="/login" className="text-ink underline underline-offset-4">Sign in</Link>.</li>
      </ul>
    </div>
  );
}
