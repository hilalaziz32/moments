import { z } from "zod";
import { EMPLOYEE_STATUSES, LOCALES } from "./enums.js";

/**
 * TRUST BOUNDARY 1: CSV import.
 *
 * An HR person uploads 340 rows of mixed date formats, Excel serials, trailing
 * whitespace, CNICs in the phone column, and three people sharing an email. If
 * this parses loosely we schedule a birthday on the wrong day and the failure is
 * silent for eleven months.
 *
 * These schemas validate the NORMALISED row -- dates and phones have already been
 * through @moments/core's normalisers, which report their own errors per field.
 */

export const e164 = z.string().regex(/^\+[1-9][0-9]{7,14}$/, "must be an E.164 phone number");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)");

export const employeeImportRowSchema = z
  .object({
    employeeCode: z.string().trim().max(64).optional().nullable(),
    fullName: z.string().trim().min(1, "name is required").max(200),
    fullNameUr: z.string().trim().max(200).optional().nullable(),
    preferredName: z.string().trim().max(100).optional().nullable(),
    workEmail: z.string().email().toLowerCase().optional().nullable(),
    personalEmail: z.string().email().toLowerCase().optional().nullable(),
    phoneE164: e164.optional().nullable(),
    whatsappE164: e164.optional().nullable(),
    gender: z.enum(["male", "female", "other", "undisclosed"]).optional().nullable(),
    dateOfBirth: isoDate.optional().nullable(),
    hireDate: isoDate.optional().nullable(),
    jobTitle: z.string().trim().max(150).optional().nullable(),
    department: z.string().trim().max(150).optional().nullable(),
    managerEmail: z.string().email().toLowerCase().optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    shirtSize: z.enum(["XS","S","M","L","XL","XXL","XXXL"]).optional().nullable(),
    status: z.enum(EMPLOYEE_STATUSES).default("active"),
    locale: z.enum(LOCALES).default("en"),
    /** Unmapped CSV columns. Kept, never dropped. */
    customFields: z.record(z.string(), z.unknown()).default({}),
  })
  // The DB enforces this too; catching it here gives a per-row message the HR
  // person can actually act on.
  .refine(
    (r) => Boolean(r.workEmail || r.personalEmail || r.phoneE164),
    { message: "needs at least one of: work email, personal email, phone", path: ["workEmail"] },
  )
  .refine(
    (r) => !r.dateOfBirth || !r.hireDate || r.hireDate >= r.dateOfBirth,
    { message: "hire date cannot precede date of birth", path: ["hireDate"] },
  );

export type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;

/** How detected CSV headers map onto our fields, chosen by the human in step 2. */
export const columnMappingSchema = z.object({
  /** header name -> our field name, or null to keep it in customFields */
  mapping: z.record(z.string(), z.string().nullable()),
  dateFormats: z.record(z.string(), z.enum([
    "DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","DD-MMM-YYYY","MMM-DD-YYYY","EXCEL_SERIAL",
  ])),
  matchOn: z.enum(["employee_code", "work_email"]).default("work_email"),
  updateExisting: z.boolean().default(true),
});
export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const importRowErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});
export type ImportRowError = z.infer<typeof importRowErrorSchema>;
