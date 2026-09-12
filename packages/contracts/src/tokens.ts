import { z } from "zod";
import { e164 } from "./employee.js";

/**
 * TRUST BOUNDARY 3: unauthenticated POST bodies from the open internet.
 *
 * These back the tokenised, login-free pages. The server action re-validates and
 * then calls a SECURITY DEFINER RPC that whitelists columns server-side -- the
 * schema here is the first gate, not the only one.
 */

export const actionTokenSchema = z
  .string()
  .regex(/^mt1_[A-Za-z0-9_-]{43}$/, "not a valid Moments link");

/**
 * What an employee may change about themselves from the T-7 confirmation link.
 * Deliberately narrow: no email, no manager, no salary, no job title.
 */
export const employeeConfirmationSchema = z.object({
  line1: z.string().trim().min(5, "please give a full street address").max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  area: z.string().trim().max(120).optional().nullable(),
  landmark: z.string().trim().max(200).optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  cityText: z.string().trim().max(100).optional().nullable(),
  deliveryNotes: z.string().trim().max(500).optional().nullable(),
  recipientPhone: e164.optional().nullable(),
  whatsappE164: e164.optional().nullable(),
  whatsappOptIn: z.boolean().default(false),
  shirtSize: z.enum(["XS","S","M","L","XL","XXL","XXXL"]).optional().nullable(),
  halalOnly: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  needsEggless: z.boolean().optional(),
  allergies: z.array(z.string().trim().max(60)).max(20).default([]),
  dietaryNotes: z.string().trim().max(300).optional().nullable(),
  /** "I'd rather not be celebrated publicly." Always honoured. */
  celebrationOptOut: z.boolean().optional(),
  employeeNote: z.string().trim().max(500).optional().nullable(),
}).refine((v) => Boolean(v.cityId || v.cityText), {
  message: "please tell us the city", path: ["cityText"],
});
export type EmployeeConfirmation = z.infer<typeof employeeConfirmationSchema>;

export const approvalResponseSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500).optional().nullable(),
  counterAmountPaisa: z.number().int().min(0).optional().nullable(),
  /** Required above the org's high-value threshold. */
  otp: z.string().regex(/^\d{6}$/).optional().nullable(),
});
export type ApprovalResponse = z.infer<typeof approvalResponseSchema>;
