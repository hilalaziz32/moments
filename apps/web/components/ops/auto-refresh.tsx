"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The queue changes under ops' feet; refetch the server component on a timer. */
export function AutoRefresh({ intervalMs = 15_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
