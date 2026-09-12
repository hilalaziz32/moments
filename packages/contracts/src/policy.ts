import { z } from "zod";
import { CHANNELS, LOCALES, MOMENT_KEYS } from "./enums.js";

/**
 * Budgets, in PAISA. The DB floor is PKR 100 (10_000 paisa) precisely to catch
 * someone typing 2500 where 250000 belongs; we mirror it here so the UI can say
 * so before the request is made.
 */
export const budgetPaisa = z
  .number()
  .int("must be a whole number of paisa")
  .refine((v) => v === 0 || (v >= 10_000 && v <= 100_000_000), {
    message: "budget must be 0 or between PKR 100 and PKR 1,000,000",
  });

export const momentPolicySchema = z
  .object({
    momentKey: z.enum(MOMENT_KEYS),
    momentTypeId: z.string().uuid(),
    isEnabled: z.boolean().default(true),
    budgetPaisa,
    budgetIncludesDelivery: z.boolean().default(true),
    verifyOffsetDays: z.number().int().min(0).max(60),
    selectOffsetDays: z.number().int().min(0).max(60),
    approvalOffsetDays: z.number().int().min(0).max(60),
    approvalRequired: z.boolean().default(false),
    approvalThresholdPaisa: budgetPaisa.optional().nullable(),
    approverKind: z.enum(["hr", "manager", "finance", "owner"]).default("hr"),
    approvalChannel: z.enum(CHANNELS).default("email"),
    autoApproveAfterHours: z.number().int().min(0).max(168).default(24),
    giftEnabled: z.boolean().default(true),
    cardEnabled: z.boolean().default(true),
    deliveryTarget: z.enum(["home", "office", "none", "employee_choice"]).default("home"),
    announcementEnabled: z.boolean().default(true),
    announcementChannels: z.array(z.enum(CHANNELS)).min(1),
    announcementLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
    announcementLocale: z.enum(LOCALES).default("en"),
    announcePublicly: z.boolean().default(true),
    managerNudgeEnabled: z.boolean().default(true),
    managerNudgeChannel: z.enum(CHANNELS).default("email"),
  })
  // Mirrors moment_policies_offsets_ordered. Catching it client-side turns a
  // 400 from PostgREST into an inline form error.
  .refine((p) => p.verifyOffsetDays >= p.selectOffsetDays, {
    message: "verify must happen on or before gift selection",
    path: ["verifyOffsetDays"],
  })
  .refine((p) => p.selectOffsetDays >= p.approvalOffsetDays, {
    message: "gift selection must happen on or before approval",
    path: ["selectOffsetDays"],
  })
  .refine((p) => !p.announcementEnabled || p.announcementChannels.length > 0, {
    message: "pick at least one announcement channel",
    path: ["announcementChannels"],
  });

export type MomentPolicyInput = z.infer<typeof momentPolicySchema>;

export const orgSettingsSchema = z.object({
  name: z.string().trim().min(2).max(200),
  timezone: z.string().default("Asia/Karachi"),
  feb29ObservedOn: z.enum(["feb_28", "mar_01"]).default("feb_28"),
  lateAnnouncementPolicy: z
    .enum(["fire_immediately_if_before_15", "next_day", "skip"])
    .default("fire_immediately_if_before_15"),
  announcementDigestThreshold: z.number().int().min(1).max(50).default(3),
  celebrateOnTerminatedExit: z.boolean().default(false),
  ntn: z.string().regex(/^[0-9]{7}-?[0-9]?$|^[0-9]{13}$/).optional().nullable(),
  strn: z.string().regex(/^[0-9]{13}$/).optional().nullable(),
  taxJurisdiction: z.enum(["FBR","SRB","PRA","KPRA","BRA","ICT"]).optional().nullable(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;
