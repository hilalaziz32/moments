import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { Button } from "@/components/ui/button";
import { DateMark } from "@/components/moments/date-mark";
import { Pipeline } from "@/components/moments/pipeline";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-sm font-semibold tracking-tight text-ink">Moments</span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="max-w-xl text-pretty text-2xl leading-snug text-ink sm:text-3xl">
          Nobody remembered Bilal&rsquo;s birthday.
          <br />
          <span className="text-ink-muted">Your company did.</span>
        </p>

        {/*
          The hero is the product's actual mechanism, not a stat tile: one real
          moment moving through the pipeline on real dates.
        */}
        <div className="mt-12 max-w-lg rounded-lg border border-rule bg-card">
          <div className="flex items-center gap-5 px-5 py-4">
            <DateMark iso="2026-09-28" size="lg" className="w-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">Bilal Ahmed</p>
              <p className="text-sm text-ink-muted">Birthday · Engineering</p>
            </div>
            <span data-numeric className="text-sm font-medium text-ink">PKR 2,500</span>
          </div>
          <div className="border-t border-rule px-5 py-4">
            <Pipeline
              showLabels
              steps={[
                { key: "verify",  label: "Details",   state: "done",   when: "21 Sep" },
                { key: "select",  label: "Gift",      state: "done",   when: "24 Sep" },
                { key: "approve", label: "Approval",  state: "done",   when: "26 Sep" },
                { key: "deliver", label: "Delivered", state: "active", when: "28 Sep" },
              ]}
            />
          </div>
        </div>

        <p className="mt-10 max-w-md text-sm leading-relaxed text-ink-muted">
          Upload your team once and set a budget for each kind of moment. Moments
          checks the address, picks the gift, asks for approval if you want it,
          delivers on the day, and posts the message at 9 AM.
        </p>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/signup">Set up your team</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-rule py-6 text-xs text-ink-faint">
        Built for teams in Pakistan. Prices in PKR.
      </footer>
    </main>
  );
}
