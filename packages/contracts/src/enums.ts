/**
 * Enum values mirrored from the Postgres enum types in the `moments` schema.
 * These MUST stay in lockstep with 00002_types_enums_domains.sql.
 */

export const MOMENT_KEYS = [
  "birthday", "work_anniversary", "new_hire", "promotion", "marriage",
  "new_baby", "farewell", "eid_ul_fitr", "eid_ul_adha", "ramadan",
  "employee_of_the_month",
] as const;

export const ORG_ROLES = ["owner", "admin", "hr_manager", "finance", "manager", "viewer"] as const;
export const STAFF_ROLES = ["platform_admin", "ops", "support", "finance"] as const;
export const EMPLOYEE_STATUSES = ["active", "on_leave", "notice_period", "exited"] as const;
export const CHANNELS = ["email", "whatsapp", "slack", "in_app"] as const;
export const TASK_LANES = ["announce", "default", "slow"] as const;
export const TASK_STATUSES = ["pending","running","succeeded","failed","cancelled","skipped","dead"] as const;
export const ORDER_STATUSES = [
  "draft","pending_selection","awaiting_approval","approved","queued_for_ops",
  "placed_with_vendor","in_transit","delivered","failed","cancelled","returned",
] as const;
export const APPROVAL_DECISIONS = [
  "pending","approved","rejected","expired","auto_approved","cancelled",
] as const;
export const LOCALES = ["en", "ur", "ur-Latn"] as const;
export const TOKEN_PURPOSES = [
  "address_verification","approval","invitation","employee_optout","magic_view","feedback",
] as const;

export type MomentKey = (typeof MOMENT_KEYS)[number];
export type OrgRole = (typeof ORG_ROLES)[number];
export type Channel = (typeof CHANNELS)[number];
export type Locale = (typeof LOCALES)[number];
