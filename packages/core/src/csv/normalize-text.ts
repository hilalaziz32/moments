/** Email and name normalisation shared by the importer and the server actions. */

export function normalizeEmail(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const v = String(input).trim().toLowerCase();
  if (v === "") return null;
  // Deliberately permissive: real corporate addresses break strict RFC regexes,
  // and a hard bounce is a better signal than a rejected import row.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

export function normalizeName(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const v = String(input).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
}

/** "Bilal Ahmed" -> "Bilal". Used in announcement and card copy. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function normalizeShirtSize(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const v = String(input).trim().toUpperCase().replace(/\s|-/g, "");
  const map: Record<string, string> = {
    XS: "XS", S: "S", SMALL: "S", M: "M", MEDIUM: "M", L: "L", LARGE: "L",
    XL: "XL", XXL: "XXL", "2XL": "XXL", XXXL: "XXXL", "3XL": "XXXL",
  };
  return map[v] ?? null;
}
