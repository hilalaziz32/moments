import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col px-6">
      <header className="py-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
          Moments
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center pt-10 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
