import {
  normalizeEmail, normalizeName, normalizePhone, normalizeShirtSize,
  parseDateStrict, type DateFormat,
} from "@moments/core/csv";
import { employeeImportRowSchema } from "@moments/contracts";
import { FIELD_BY_KEY } from "./fields";
import type { StagedRow } from "@/app/actions/onboarding";

/**
 * Turns one raw CSV row into the shape the DB expects, collecting a per-field
 * error list rather than throwing.
 *
 * HR fixes rows in the UI and re-commits, so every failure has to be
 * attributable to a cell and phrased as something they can act on.
 */
export function normalizeRow(
  raw: Record<string, unknown>,
  rowNumber: number,
  mapping: Record<string, string | null>,
  dateFormats: Record<string, DateFormat>,
): StagedRow {
  const normalized: Record<string, unknown> = {};
  const customFields: Record<string, unknown> = {};
  const errors: { field: string; code: string; message: string }[] = [];

  for (const [header, value] of Object.entries(raw)) {
    const fieldKey = mapping[header] ?? null;

    // Unmapped columns are KEPT, never dropped.
    if (!fieldKey) {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        customFields[header] = value;
      }
      continue;
    }

    const spec = FIELD_BY_KEY.get(fieldKey);
    if (!spec) continue;
    const rawStr = value === null || value === undefined ? "" : String(value).trim();
    if (rawStr === "") continue;

    switch (spec.kind) {
      case "date": {
        const fmt = dateFormats[header];
        if (!fmt) {
          errors.push({ field: fieldKey, code: "no_date_format",
            message: `Pick a date format for "${header}".` });
          break;
        }
        const parsed = parseDateStrict(rawStr, fmt);
        if (parsed.ok) normalized[fieldKey] = parsed.iso;
        else errors.push({ field: fieldKey, code: "bad_date",
          message: `"${rawStr}" ${parsed.reason}.` });
        break;
      }
      case "email": {
        const email = normalizeEmail(rawStr);
        if (email) normalized[fieldKey] = email;
        else errors.push({ field: fieldKey, code: "bad_email",
          message: `"${rawStr}" is not a valid email address.` });
        break;
      }
      case "phone": {
        const phone = normalizePhone(rawStr);
        if (phone.ok) normalized[fieldKey] = phone.e164;
        else errors.push({ field: fieldKey, code: "bad_phone",
          message: `"${rawStr}": ${phone.reason}.` });
        break;
      }
      case "enum": {
        if (fieldKey === "gender") {
          const g = rawStr.toLowerCase();
          const map: Record<string, string> = {
            m: "male", male: "male", f: "female", female: "female",
            other: "other", undisclosed: "undisclosed",
          };
          if (map[g]) normalized[fieldKey] = map[g];
          else errors.push({ field: fieldKey, code: "bad_gender",
            message: `"${rawStr}" is not a gender we recognise.` });
        } else {
          const size = normalizeShirtSize(rawStr);
          if (size) normalized[fieldKey] = size;
          else errors.push({ field: fieldKey, code: "bad_size",
            message: `"${rawStr}" is not a shirt size we recognise.` });
        }
        break;
      }
      default: {
        const text = normalizeName(rawStr);
        if (text) normalized[fieldKey] = text;
      }
    }
  }

  normalized.customFields = customFields;

  // Cross-field rules (needs a contact method, hire date after birth date)
  // live in the schema so the browser and the server agree.
  const parsed = employeeImportRowSchema.safeParse(normalized);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "row");
      if (errors.some((e) => e.field === field)) continue;
      errors.push({ field, code: issue.code, message: issue.message });
    }
  }

  return { rowNumber, raw, normalized, errors };
}

/**
 * Flags people who appear twice. Two colleagues named "Bilal Ahmed" is
 * legitimate; two ROWS for the same person is not -- so we key on identity,
 * never on name, and we never auto-merge.
 */
export function findDuplicates(
  rows: StagedRow[],
  matchOn: "work_email" | "employee_code",
): Map<number, string> {
  const key = matchOn === "employee_code" ? "employeeCode" : "workEmail";
  const seen = new Map<string, number>();
  const dupes = new Map<number, string>();

  for (const row of rows) {
    const v = row.normalized[key];
    if (typeof v !== "string" || v === "") continue;
    const first = seen.get(v);
    if (first !== undefined) {
      dupes.set(row.rowNumber, `Same ${key === "workEmail" ? "email" : "employee ID"} as row ${first}.`);
    } else {
      seen.set(v, row.rowNumber);
    }
  }
  return dupes;
}
