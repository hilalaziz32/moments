import type { Metadata } from "next";

/**
 * The tokenised, login-free surface.
 *
 * noindex is not optional -- these urls carry a bearer token in the path.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      {children}
    </main>
  );
}
