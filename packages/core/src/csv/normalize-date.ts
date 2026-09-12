/**
 * Date normalisation for CSV import.
 *
 * This module exists because `28/09/1994` is ambiguous and guessing wrong shifts
 * a birthday by months. The rule is therefore:
 *
 *   WE NEVER GUESS SILENTLY. We detect candidate formats, report how many rows
 *   each one parses, flag ambiguity, and make the human confirm with a live
 *   preview. parseDateStrict() then parses in exactly one declared format.
 *
 * Second rule: IMPOSSIBLE DATES ARE REJECTED, NEVER CLAMPED. `31/02/1994` is a
 * data-entry error; JavaScript's Date would happily roll it to 3 March, which is
 * how you end up celebrating on the wrong day forever.
 */

export type DateFormat =
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "DD-MMM-YYYY"
  | "MMM-DD-YYYY"
  | "EXCEL_SERIAL";

export const DATE_FORMATS: readonly DateFormat[] = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MMM-YYYY",
  "MMM-DD-YYYY",
  "EXCEL_SERIAL",
];

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Excel's day 0. Excel's 1900 leap-year bug means the epoch is 30 Dec 1899. */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

export type ParsedDate = { ok: true; iso: string } | { ok: false; reason: string };

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function build(year: number, month: number, day: number): ParsedDate {
  if (month < 1 || month > 12) return { ok: false, reason: `month ${month} out of range` };
  if (day < 1) return { ok: false, reason: `day ${day} out of range` };
  const max = daysInMonth(year, month);
  if (day > max) {
    // The whole point of this module: reject, never roll over.
    return { ok: false, reason: `${day}/${month}/${year} does not exist (${month} has ${max} days)` };
  }
  if (year < 1900 || year > 2100) return { ok: false, reason: `year ${year} out of range` };
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { ok: true, iso };
}

/** Two-digit years: 00-30 -> 2000s, 31-99 -> 1900s. Fits birth and hire dates. */
function expandYear(raw: string): number {
  const n = Number(raw);
  if (raw.length === 4) return n;
  if (raw.length === 2) return n <= 30 ? 2000 + n : 1900 + n;
  return NaN;
}

export function parseDateStrict(value: unknown, format: DateFormat): ParsedDate {
  if (value === null || value === undefined) return { ok: false, reason: "empty" };
  const raw = String(value).trim();
  if (raw === "") return { ok: false, reason: "empty" };

  if (format === "EXCEL_SERIAL") {
    if (!/^\d{1,6}(\.\d+)?$/.test(raw)) return { ok: false, reason: "not an Excel serial number" };
    const serial = Math.floor(Number(raw));
    if (serial < 1 || serial > 80_000) return { ok: false, reason: `serial ${serial} out of range` };
    const d = new Date(EXCEL_EPOCH_UTC + serial * 86_400_000);
    return build(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  if (format === "YYYY-MM-DD") {
    const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(raw);
    if (!m) return { ok: false, reason: "does not match YYYY-MM-DD" };
    return build(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  if (format === "DD-MMM-YYYY") {
    const m = /^(\d{1,2})[-/ ]([A-Za-z]{3,4})[-/ ,]*(\d{2,4})$/.exec(raw);
    if (!m) return { ok: false, reason: "does not match DD-MMM-YYYY" };
    const month = MONTH_NAMES[m[2]!.toLowerCase()];
    if (!month) return { ok: false, reason: `unknown month "${m[2]}"` };
    return build(expandYear(m[3]!), month, Number(m[1]));
  }

  if (format === "MMM-DD-YYYY") {
    const m = /^([A-Za-z]{3,4})[-/ ]+(\d{1,2})[-/ ,]+(\d{2,4})$/.exec(raw);
    if (!m) return { ok: false, reason: "does not match MMM-DD-YYYY" };
    const month = MONTH_NAMES[m[1]!.toLowerCase()];
    if (!month) return { ok: false, reason: `unknown month "${m[1]}"` };
    return build(expandYear(m[3]!), month, Number(m[2]));
  }

  // DD/MM/YYYY and MM/DD/YYYY share a shape and differ only in field order.
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(raw);
  if (!m) return { ok: false, reason: `does not match ${format}` };
  const year = expandYear(m[3]!);
  if (!Number.isFinite(year)) return { ok: false, reason: "unparseable year" };
  return format === "DD/MM/YYYY"
    ? build(year, Number(m[2]), Number(m[1]))
    : build(year, Number(m[1]), Number(m[2]));
}

export interface FormatCandidate {
  format: DateFormat;
  parsed: number;
  failed: number;
  /** Sample rows rendered back as "28 Sep 1994", for the confirmation preview. */
  preview: string[];
}

export interface DateFormatDetection {
  candidates: FormatCandidate[];
  best: FormatCandidate | null;
  /**
   * True when more than one format parses every value AND they disagree about
   * what at least one value means. The UI must force an explicit choice.
   */
  ambiguous: boolean;
  ambiguityExample?: { value: string; readings: { format: DateFormat; iso: string }[] };
}

export function formatPreview(iso: string): string {
  const [y, m, d] = iso.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(d)} ${names[Number(m) - 1]} ${y}`;
}

/**
 * Scores every candidate format against real sample values.
 *
 * Ambiguity detection is the load-bearing part: `01/02/1994` parses cleanly as
 * both DD/MM and MM/DD, and they mean different months. If any value reads
 * differently under two fully-parsing formats, we say so and refuse to pick.
 */
export function detectDateFormat(values: readonly unknown[]): DateFormatDetection {
  const samples = values
    .map((v) => (v === null || v === undefined ? "" : String(v).trim()))
    .filter((v) => v !== "");

  const candidates: FormatCandidate[] = DATE_FORMATS.map((format) => {
    let parsed = 0;
    let failed = 0;
    const preview: string[] = [];
    for (const v of samples) {
      const r = parseDateStrict(v, format);
      if (r.ok) {
        parsed++;
        if (preview.length < 3) preview.push(`${v} -> ${formatPreview(r.iso)}`);
      } else {
        failed++;
      }
    }
    return { format, parsed, failed, preview };
  })
    .filter((c) => c.parsed > 0)
    .sort((a, b) => b.parsed - a.parsed || a.failed - b.failed);

  const best = candidates[0] ?? null;
  if (!best || samples.length === 0) return { candidates, best, ambiguous: false };

  const perfect = candidates.filter((c) => c.parsed === samples.length && c.failed === 0);
  if (perfect.length < 2) return { candidates, best, ambiguous: false };

  for (const value of samples) {
    const readings = perfect
      .map((c) => ({ format: c.format, iso: (parseDateStrict(value, c.format) as { ok: true; iso: string }).iso }));
    const distinct = new Set(readings.map((r) => r.iso));
    if (distinct.size > 1) {
      return { candidates, best, ambiguous: true, ambiguityExample: { value, readings } };
    }
  }
  return { candidates, best, ambiguous: false };
}
