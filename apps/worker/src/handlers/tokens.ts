import { createHash, randomBytes, randomInt } from "node:crypto";

/**
 * Opaque link tokens -- NOT JWTs. JWTs cannot be revoked, cannot be single-use,
 * and need a database lookup anyway.
 *
 * The plaintext leaves this process exactly once, inside the email. We store a
 * sha256 plus a 12-character prefix for O(1) lookup before the comparison.
 * The sha256 matches moments.hash_token() in Postgres byte for byte.
 */
export function mintToken(): { token: string; hashHex: string; lookup: string } {
  const token = `mt1_${randomBytes(32).toString("base64url")}`;
  return { token, hashHex: hashSecret(token), lookup: token.slice(0, 12) };
}

/** bytea literal PostgREST accepts: "\x" followed by hex. */
export function hashSecret(value: string): string {
  return `\\x${createHash("sha256").update(value).digest("hex")}`;
}

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
