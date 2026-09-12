/**
 * PKR money handling.
 *
 * EVERY amount in this system is an integer number of PAISA held in a bigint
 * column. Never a float, never "rupees". 1 rupee = 100 paisa, so PKR 2,500 is
 * 250_000 paisa.
 *
 * The database enforces a PKR 100 floor on budgets and prices precisely to catch
 * the one bug this module exists to prevent: someone writing 2500 where 250000
 * belongs.
 */

/** Smallest amount the DB will accept for a non-zero budget or price: PKR 100. */
export const MIN_MONEY_PAISA = 10_000;
/** Largest amount the DB will accept: PKR 1,000,000. */
export const MAX_MONEY_PAISA = 100_000_000;

export function rupeesToPaisa(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new RangeError(`Not a finite amount: ${rupees}`);
  return Math.round(rupees * 100);
}

export function paisaToRupees(paisa: number): number {
  return paisa / 100;
}

/**
 * Parses user input that may contain grouping separators, a currency prefix, or
 * decimals. Returns paisa.
 *
 * Deliberately strict: an unparseable value throws rather than silently becoming
 * 0, because a silent 0 budget means a celebration that quietly ships nothing.
 */
export function parseRupeesToPaisa(input: string | number): number {
  if (typeof input === "number") return rupeesToPaisa(input);
  const cleaned = input.replace(/[\s,]/g, "").replace(/^(PKR|Rs\.?|₨)/i, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new RangeError(`Not a valid PKR amount: ${JSON.stringify(input)}`);
  }
  return rupeesToPaisa(Number(cleaned));
}

/** "PKR 2,500" — the canonical display form. */
export function formatPKR(paisa: number, opts: { decimals?: boolean } = {}): string {
  const rupees = paisaToRupees(paisa);
  const showDecimals = opts.decimals ?? !Number.isInteger(rupees);
  return `PKR ${rupees.toLocaleString("en-PK", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

/** "2,500" — for use next to a separate currency label, e.g. in a budget stepper. */
export function formatPaisaCompact(paisa: number): string {
  return paisaToRupees(paisa).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export function isWithinDbMoneyBounds(paisa: number): boolean {
  return paisa === 0 || (paisa >= MIN_MONEY_PAISA && paisa <= MAX_MONEY_PAISA);
}

/**
 * Our take on one fulfilled gift. Mirrors the generated columns on gift_orders,
 * so the UI estimate and the invoice agree.
 */
export function marginPaisa(pricePaisa: number, costPaisa: number): number {
  return pricePaisa - costPaisa;
}

export function marginBps(pricePaisa: number, costPaisa: number): number {
  if (pricePaisa <= 0) return 0;
  return Math.trunc(((pricePaisa - costPaisa) * 10_000) / pricePaisa);
}
