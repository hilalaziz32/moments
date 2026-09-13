import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col px-6">
      <header className="py-6">
        <Logo />
      </header>
      <div className="flex flex-1 items-start justify-center pt-10 pb-16">
        <div className="w-full max-w-sm rounded-xl border border-rule bg-card p-6 shadow-sm sm:p-8">{children}</div>
      </div>
    </main>
  );
}
