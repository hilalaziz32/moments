import { IMPORT_FIELDS, type FieldSpec } from "./fields";
import { detectDateFormat, normalizePhone } from "@moments/core/csv";

/**
 * Suggests a header -> field mapping.
 *
 * Two signals, because header names alone are unreliable -- real exports use
 * "DOB", "Emp. Joining", "Contact #":
 *   1. header text similarity against known aliases
 *   2. VALUE SNIFFING: what the column actually contains
 *
 * The suggestion is always shown for confirmation. We never apply it silently.
 */

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
}

function headerScore(header: string, field: FieldSpec): number {
  const h = normalizeHeader(header);
  if (!h) return 0;
  let best = 0;
  for (const alias of field.aliases) {
    if (h === alias) best = Math.max(best, 1);
    else if (h.startsWith(alias) || h.endsWith(alias)) best = Math.max(best, 0.85);
    else if (h.includes(alias)) best = Math.max(best, 0.7);
  }
  return best;
}

function valueScore(values: string[], field: FieldSpec): number {
  const sample = values.filter((v) => v && v.trim() !== "").slice(0, 40);
  if (sample.length === 0) return 0;
  const hit = (fn: (v: string) => boolean) =>
    sample.filter(fn).length / sample.length;

  switch (field.kind) {
    case "email":
      return hit((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()));
    case "phone":
      return hit((v) => normalizePhone(v).ok);
    case "date": {
      const d = detectDateFormat(sample);
      return d.best ? d.best.parsed / sample.length : 0;
    }
    case "enum":
      if (field.key === "gender") {
        return hit((v) => /^(m|f|male|female|other|undisclosed)$/i.test(v.trim()));
      }
      return hit((v) => /^(xs|s|m|l|xl|xxl|xxxl|2xl|3xl|small|medium|large)$/i.test(v.trim()));
    default:
      return 0;
  }
}

export interface Suggestion {
  header: string;
  fieldKey: string | null;
  confidence: number;
  /** Why we think so -- shown as a quiet hint next to the select. */
  because: string | null;
}

export function suggestMapping(
  headers: string[],
  rows: Record<string, unknown>[],
): Suggestion[] {
  const used = new Set<string>();
  const scored: { header: string; fieldKey: string; score: number; because: string }[] = [];

  for (const header of headers) {
    const values = rows.map((r) => String(r[header] ?? ""));
    for (const field of IMPORT_FIELDS) {
      const hs = headerScore(header, field);
      const vs = valueScore(values, field);
      // Header match dominates; values break ties and rescue odd header names.
      const score = hs * 0.65 + vs * 0.35;
      if (score < 0.3) continue;
      const because =
        vs >= 0.8 && hs < 0.5 ? `values look like ${field.label.toLowerCase()}`
        : hs >= 0.85 ? "column name matches"
        : "column name is close";
      scored.push({ header, fieldKey: field.key, score, because });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const chosen = new Map<string, { fieldKey: string; score: number; because: string }>();
  for (const s of scored) {
    if (chosen.has(s.header) || used.has(s.fieldKey)) continue;
    chosen.set(s.header, s);
    used.add(s.fieldKey);
  }

  return headers.map((header) => {
    const c = chosen.get(header);
    return {
      header,
      fieldKey: c?.fieldKey ?? null,
      confidence: c?.score ?? 0,
      because: c?.because ?? null,
    };
  });
}
