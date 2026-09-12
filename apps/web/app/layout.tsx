import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Moments",
    template: "%s · Moments",
  },
  description:
    "Never forget an employee moment again. Birthdays, anniversaries, new hires and more, handled automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${instrument.variable} font-sans antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
