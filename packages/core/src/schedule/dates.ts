/**
 * Pure calendar arithmetic on ISO date strings (YYYY-MM-DD).
 *
 * We deliberately do NOT use Date objects for calendar maths. A Date is an
 * instant; a birthday is a calendar day. Mixing them is how you add
 * INTERVAL '7 days' to a timestamptz and land an hour off across a DST boundary.
 * Pakistan has no DST today, but a Dubai or London office in the same org does.
 *
 * Rule enforced by lint: nothing in packages/core calls `new Date()` with no
 * argument. The current date is always injected.
 */

export type ISODate = string;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

export function toISO(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseISO(iso: ISODate): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`Not an ISO date: ${iso}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Days since 1970-01-01, computed without Date, so it is timezone-free. */
export function toEpochDay(iso: ISODate): number {
  const { year, month, day } = parseISO(iso);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function fromEpochDay(days: number): ISODate {
  const d = new Date(days * 86_400_000);
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromEpochDay(toEpochDay(iso) + days);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBetween(iso: ISODate, from: ISODate, to: ISODate): boolean {
  return iso >= from && iso <= to;
}

/** 0 = Sunday. Weekend in Pakistan is Sat/Sun for most corporates. */
export function dayOfWeek(iso: ISODate): number {
  return ((toEpochDay(iso) + 4) % 7 + 7) % 7;
}

export function isWeekend(iso: ISODate): boolean {
  const d = dayOfWeek(iso);
  return d === 0 || d === 6;
}

/** MMDD integer, matching the generated column the detector indexes on. */
export function mmdd(iso: ISODate): number {
  const { month, day } = parseISO(iso);
  return month * 100 + day;
}

/**
 * Resolves the recurrence of an anniversary date in a given year.
 *
 * FEB 29 IS THE WHOLE REASON THIS FUNCTION EXISTS. In a non-leap year there is
 * no 29 February, so we substitute per the org's policy and report that we did,
 * so the UI can say "observed 28 Feb (born 29 Feb)".
 */
export function occurrenceInYear(
  sourceDate: ISODate,
  year: number,
  feb29ObservedOn: "feb_28" | "mar_01",
): { date: ISODate; note: string | null } {
  const { month, day } = parseISO(sourceDate);
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return feb29ObservedOn === "mar_01"
      ? { date: toISO(year, 3, 1), note: "leap_day_observed_mar_01" }
      : { date: toISO(year, 2, 28), note: "leap_day_observed_feb_28" };
  }
  return { date: toISO(year, month, day), note: null };
}

/**
 * The next occurrence of an annual date on or after `from`.
 * Returns null if it would fall outside `horizonEnd`.
 */
export function nextOccurrence(
  sourceDate: ISODate,
  from: ISODate,
  horizonEnd: ISODate,
  feb29ObservedOn: "feb_28" | "mar_01",
): { date: ISODate; note: string | null } | null {
  const fromYear = parseISO(from).year;
  for (const year of [fromYear, fromYear + 1]) {
    const occ = occurrenceInYear(sourceDate, year, feb29ObservedOn);
    if (occ.date >= from && occ.date <= horizonEnd) return occ;
  }
  return null;
}

/** Completed years between two dates, by calendar (not by 365-day blocks). */
export function completedYears(from: ISODate, at: ISODate): number {
  const a = parseISO(from);
  const b = parseISO(at);
  let years = b.year - a.year;
  if (b.month < a.month || (b.month === a.month && b.day < a.day)) years--;
  return years;
}
