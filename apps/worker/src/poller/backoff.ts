/**
 * Retry backoff.
 *
 * The announce lane is deliberately different. A 09:00 announcement that fails
 * must be retried aggressively and escalated within minutes -- backing it off
 * for an hour means the birthday is simply missed, which is the one failure this
 * product cannot have.
 */
const JITTER = 0.2;

export function backoffSeconds(attempt: number, lane: "announce" | "default" | "slow"): number {
  const base =
    lane === "announce"
      ? [10, 30, 60, 120, 120, 120][Math.min(attempt - 1, 5)]!
      : Math.min(60 * 3 ** Math.max(attempt - 1, 0), 14_400);

  const spread = base * JITTER;
  return Math.round(base + (Math.random() * 2 - 1) * spread);
}

export function nextAttemptAt(attempt: number, lane: "announce" | "default" | "slow"): string {
  return new Date(Date.now() + backoffSeconds(attempt, lane) * 1000).toISOString();
}
