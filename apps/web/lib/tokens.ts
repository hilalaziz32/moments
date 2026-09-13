import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque link tokens, the same scheme the worker uses: `mt1_` + 32 random bytes.
 * Only the sha256 is stored (as bytea), plus the first 12 characters for an
 * indexed lookup before the timing-safe compare.
 */

export const TOKEN_FORMAT = /^mt1_[A-Za-z0-9_-]{43}$/;

export function mintToken(): { token: string; hashBytea: string; lookup: string } {
  const token = `mt1_${randomBytes(32).toString("base64url")}`;
  const hex = createHash("sha256").update(token).digest("hex");
  return { token, hashBytea: `\\x${hex}`, lookup: token.slice(0, 12) };
}

/** PostgREST returns bytea as a "\x…" hex string. */
export function tokenMatches(token: string, storedBytea: string): boolean {
  const expected = createHash("sha256").update(token).digest();
  const stored = Buffer.from(storedBytea.replace(/^\\x/, ""), "hex");
  return stored.length === expected.length && timingSafeEqual(stored, expected);
}
