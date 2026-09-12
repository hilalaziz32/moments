import Link from "next/link";
import { SetupProgress } from "@/components/onboarding/setup-progress";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
            Moments
          </Link>
          <span className="text-xs text-ink-faint">Setting up</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <SetupProgress />
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
