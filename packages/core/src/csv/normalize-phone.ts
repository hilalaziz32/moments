/**
 * Phone normalisation to E.164, Pakistan-first.
 *
 * Why this matters beyond tidiness: WhatsApp Cloud API returns error 131026
 * ("recipient not on WhatsApp") for mistyped numbers, and a rider who cannot
 * call the recipient is a failed delivery. Normalising at import is cheaper than
 * discovering it at T-0.
 *
 * The DB constraint is ^\+[1-9][0-9]{7,14}$ -- we must produce exactly that.
 */

export const PK_COUNTRY_CODE = "92";

export type ParsedPhone =
  | { ok: true; e164: string; kind: "mobile" | "landline" | "international" }
  | { ok: false; reason: string };

/**
 * Pakistani mobile prefixes are 3XX after the country code (030x-034x locally).
 * Landline area codes are 21 (Karachi), 42 (Lahore), 51 (Islamabad/Rawalpindi),
 * 41, 61, 91, 81 and others.
 */
function classifyPk(national: string): "mobile" | "landline" {
  return national.startsWith("3") ? "mobile" : "landline";
}

export function normalizePhone(input: unknown, defaultCountry = PK_COUNTRY_CODE): ParsedPhone {
  if (input === null || input === undefined) return { ok: false, reason: "empty" };
  const raw = String(input).trim();
  if (raw === "") return { ok: false, reason: "empty" };

  // Excel loves turning 03001234567 into 3001234567 or 3.00123E+09.
  if (/e\+/i.test(raw)) {
    return { ok: false, reason: "looks like Excel scientific notation; re-export the column as text" };
  }

  let digits = raw.replace(/[^\d+]/g, "");

  // 00 92 ... -> +92 ...
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;

  if (digits.startsWith("+")) {
    const rest = digits.slice(1);
    if (!/^\d{8,15}$/.test(rest)) return { ok: false, reason: `not a valid E.164 number: ${raw}` };
    if (rest.startsWith("0")) return { ok: false, reason: "country code cannot start with 0" };
    if (rest.startsWith(PK_COUNTRY_CODE)) {
      const national = rest.slice(PK_COUNTRY_CODE.length);
      if (national.length !== 10) {
        return { ok: false, reason: `Pakistani numbers need 10 digits after +92, got ${national.length}` };
      }
      return { ok: true, e164: `+${rest}`, kind: classifyPk(national) };
    }
    return { ok: true, e164: `+${rest}`, kind: "international" };
  }

  if (!/^\d+$/.test(digits)) return { ok: false, reason: `contains unexpected characters: ${raw}` };

  // Bare national forms.
  if (digits.startsWith("0")) {
    const national = digits.slice(1);
    if (national.length !== 10) {
      return { ok: false, reason: `expected 11 digits like 03001234567, got ${digits.length}` };
    }
    return { ok: true, e164: `+${defaultCountry}${national}`, kind: classifyPk(national) };
  }

  // Already country-coded without a plus: 923001234567
  if (digits.startsWith(defaultCountry) && digits.length === defaultCountry.length + 10) {
    const national = digits.slice(defaultCountry.length);
    return { ok: true, e164: `+${digits}`, kind: classifyPk(national) };
  }

  // Leading zero dropped by a spreadsheet: 3001234567
  if (digits.length === 10) {
    return { ok: true, e164: `+${defaultCountry}${digits}`, kind: classifyPk(digits) };
  }

  return { ok: false, reason: `could not interpret "${raw}" as a phone number` };
}

/** Display form for a PK number: +92 300 1234567 */
export function formatPhoneDisplay(e164: string): string {
  const m = /^\+92(\d{3})(\d{7})$/.exec(e164);
  return m ? `+92 ${m[1]} ${m[2]}` : e164;
}
