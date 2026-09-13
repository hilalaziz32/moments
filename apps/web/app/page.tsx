import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarHeart, MessageSquareText, Upload, Wallet } from "lucide-react";
import { smsText } from "@moments/core/messages";
import { getCurrentUser } from "@/lib/auth/guard";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { DateMark } from "@/components/moments/date-mark";
import { Pipeline, type PipelineStep } from "@/components/moments/pipeline";

const HERO_MOMENTS: {
  iso: string; name: string; what: string; amount: string; note: string; steps: PipelineStep[];
}[] = [
  {
    iso: "2026-09-28", name: "Bilal Ahmed", what: "Birthday · Engineering", amount: "PKR 2,500", note: "Cake on its way",
    steps: [
      { key: "v", label: "Details", state: "done" }, { key: "s", label: "Gift", state: "done" },
      { key: "a", label: "Approval", state: "done" }, { key: "d", label: "Delivery", state: "active" },
    ],
  },
  {
    iso: "2026-10-07", name: "Fatima Zahid", what: "5 year anniversary · QA", amount: "PKR 3,500", note: "Waiting for your OK",
    steps: [
      { key: "v", label: "Details", state: "done" }, { key: "s", label: "Gift", state: "done" },
      { key: "a", label: "Approval", state: "waiting" }, { key: "d", label: "Delivery", state: "idle" },
    ],
  },
  {
    iso: "2026-10-18", name: "Hira Noor", what: "New baby · Design", amount: "PKR 5,000", note: "Address confirmed",
    steps: [
      { key: "v", label: "Details", state: "done" }, { key: "s", label: "Gift", state: "idle" },
      { key: "a", label: "Approval", state: "idle" }, { key: "d", label: "Delivery", state: "idle" },
    ],
  },
];

const STEPS = [
  {
    icon: Upload,
    title: "Upload your team once",
    body: "Drop in the spreadsheet you already have. Excel dates, Pakistani phone numbers and managers are sorted out for you.",
  },
  {
    icon: Wallet,
    title: "Say what each moment is worth",
    body: "A budget per occasion in rupees. See what it buys and what the next 90 days will cost before you commit.",
  },
  {
    icon: MessageSquareText,
    title: "It runs itself",
    body: "We text people for their address, pick and deliver the gift, hand the manager a note, and tell you on Monday what's coming.",
  },
];

const COVERED = [
  "Birthdays", "Work anniversaries", "New joiners", "Promotions",
  "Weddings", "New babies", "Farewells", "Eid",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // A confirmation email lands here with ?code= when Supabase falls back to its
  // Site URL instead of our /auth/callback. Finish the sign-in rather than
  // dropping the person on the marketing page, still signed out.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/setup`);

  // The landing page must render even if auth is unreachable or unconfigured:
  // it is the one page that explains what Moments is.
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(user.isSuperAdmin ? "/admin" : "/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">For HR teams in Pakistan</p>
            <h1 className="mt-4 max-w-xl text-pretty text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Nobody remembered Bilal&rsquo;s birthday.{" "}
              <span className="text-ink-muted">Your company did.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-muted">
              Upload your team once and set a budget for each kind of moment. Moments checks the address,
              picks the gift, delivers it on the day and gives the manager the right words. You don&rsquo;t
              have to remember a thing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Set up your team</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-ink-faint">30-day free trial · No card needed · Nothing is sent until you say so</p>
          </div>

          {/* The product's actual mechanism, not a stat tile: real moments moving through the pipeline. */}
          <div className="relative">
            <div className="space-y-3">
              {HERO_MOMENTS.map((m, i) => (
                <div
                  key={m.name}
                  className="rounded-xl border border-rule bg-card p-4 shadow-sm"
                  style={{ marginLeft: `${i * 1.25}rem`, marginRight: `${(2 - i) * 1.25}rem` }}
                >
                  <div className="flex items-center gap-4">
                    <DateMark iso={m.iso} size="md" className="w-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{m.name}</p>
                      <p className="truncate text-sm text-ink-muted">{m.what}</p>
                    </div>
                    <div className="text-right">
                      <p data-numeric className="text-sm font-medium text-ink">{m.amount}</p>
                      <p className="text-xs text-ink-faint">{m.note}</p>
                    </div>
                  </div>
                  <Pipeline steps={m.steps} className="mt-4" />
                </div>
              ))}
            </div>
            <div className="mt-5 ml-auto max-w-xs rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-sm leading-relaxed text-[var(--paper)] shadow-md">
              {smsText.addressRequest("Bilal", "UNITZERO", "moments.pk/c/…")}
            </div>
          </div>
        </section>

        <section id="how" className="border-y border-rule bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Ten minutes to set up. Then it just happens.</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="rounded-xl border border-rule bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-surface-sunk text-ink">
                      <s.icon className="size-4" aria-hidden />
                    </span>
                    <span className="text-xs font-medium text-ink-faint">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-ink-muted">
                <CalendarHeart className="size-4" aria-hidden />
                <span className="text-xs font-medium uppercase tracking-[0.14em]">Every moment, covered</span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                Not just birthdays. The moments no spreadsheet has, too.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
                Log a promotion or a wedding in twenty seconds, set someone&rsquo;s last day for a proper farewell,
                and we&rsquo;ll ask you once a month if there&rsquo;s anything we&rsquo;ve missed.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {COVERED.map((c) => (
                <li key={c} className="rounded-full border border-rule bg-card px-4 py-2 text-sm text-ink">{c}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-ink px-8 py-10 text-[var(--paper)] sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Start with your own team this week.</h2>
              <p className="mt-1 text-sm opacity-75">For the first seven days every message comes to you first.</p>
            </div>
            <Button asChild size="lg" variant="outline" className="border-transparent bg-[var(--paper)] text-ink hover:bg-white">
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-ink-faint">
          <span>Built for teams in Pakistan. Prices in PKR.</span>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
