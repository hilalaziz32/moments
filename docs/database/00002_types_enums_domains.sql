-- 00002_types_enums_domains.sql
-- Enum types for the `moments` schema.
--
-- Rule applied throughout: Postgres ENUM for closed sets the application branches
-- on in code (adding a value requires a deploy anyway). Lookup tables for anything
-- tenant-extensible or attribute-carrying. CHECK (col IN (...)) only for single-table
-- vocabularies that will churn (e.g. locale).

BEGIN;

-- --------------------------------------------------------------------- tenancy
CREATE TYPE moments.org_status        AS ENUM ('trial','active','past_due','suspended','churned');
CREATE TYPE moments.org_role          AS ENUM ('owner','admin','hr_manager','finance','manager','viewer');
CREATE TYPE moments.membership_status AS ENUM ('active','invited','suspended','removed');
CREATE TYPE moments.staff_role        AS ENUM ('platform_admin','ops','support','finance');

-- ------------------------------------------------------------------- employees
CREATE TYPE moments.employee_status   AS ENUM ('active','on_leave','notice_period','exited');
CREATE TYPE moments.address_kind      AS ENUM ('home','office','other');
CREATE TYPE moments.address_verification_status AS ENUM
  ('unverified','link_sent','employee_confirmed','hr_confirmed','employee_updated','undeliverable','stale');
CREATE TYPE moments.import_batch_status AS ENUM
  ('uploaded','validating','validated','importing','completed','completed_with_errors','failed','reverted');
CREATE TYPE moments.import_row_status AS ENUM
  ('pending','valid','invalid','imported','updated','skipped','duplicate');

-- ---------------------------------------------------------------------- policy
CREATE TYPE moments.moment_category   AS ENUM ('personal','work','religious','company','custom');
CREATE TYPE moments.moment_date_source AS ENUM
  ('employee_date_field','employee_event','observance_calendar','manual','recurring_monthly');
CREATE TYPE moments.delivery_target   AS ENUM ('home','office','none','employee_choice');

-- ---------------------------------------------------------------------- engine
CREATE TYPE moments.moment_status     AS ENUM
  ('detected','scheduled','needs_info','awaiting_approval','approved','rejected',
   'fulfilling','delivered','announced','completed','skipped','cancelled','failed');
CREATE TYPE moments.task_type         AS ENUM
  ('verify_details_send','verify_details_remind','verify_details_finalize',
   'select_gift','request_approval','approval_remind','approval_auto_decide',
   'place_order','order_chase','order_fallback',
   'prepare_announcement','announce','deliver_message','nudge_manager',
   'confirm_delivery','collect_feedback','close_moment',
   'reschedule_anchor','sync_slack_users','sync_whatsapp_templates',
   'data_hygiene_digest','billing_usage_rollup','billing_generate_invoice',
   'billing_send_invoice','billing_payment_reminder','wallet_low_balance_alert',
   'integration_health_check');
CREATE TYPE moments.task_lane         AS ENUM ('announce','default','slow');
CREATE TYPE moments.task_status       AS ENUM
  ('pending','running','succeeded','failed','cancelled','skipped','dead');

-- ----------------------------------------------------------------- fulfillment
CREATE TYPE moments.order_status      AS ENUM
  ('draft','pending_selection','awaiting_approval','approved','queued_for_ops',
   'placed_with_vendor','in_transit','delivered','failed','cancelled','returned');
CREATE TYPE moments.proof_kind        AS ENUM
  ('photo','signature','otp','courier_ref','recipient_reply');
CREATE TYPE moments.product_category  AS ENUM
  ('cake','flowers','chocolate','hamper','voucher','electronics','apparel',
   'book','toy','plant','card','custom');

-- ------------------------------------------------------------------- approvals
CREATE TYPE moments.approval_decision AS ENUM
  ('pending','approved','rejected','expired','auto_approved','cancelled');
CREATE TYPE moments.approver_kind     AS ENUM ('hr','manager','finance','owner');
CREATE TYPE moments.response_channel  AS ENUM
  ('link','dashboard','slack_action','whatsapp_reply','email_reply','auto','api');

-- ------------------------------------------------------------------- messaging
CREATE TYPE moments.channel           AS ENUM ('email','whatsapp','slack','in_app');
CREATE TYPE moments.message_audience  AS ENUM
  ('company_announcement','manager_nudge','employee_dm','hr_digest','approval_request',
   'address_verification','ops_alert');
CREATE TYPE moments.message_status    AS ENUM
  ('queued','sending','sent','delivered','read','failed','cancelled','suppressed');
CREATE TYPE moments.integration_provider AS ENUM
  ('slack','whatsapp_cloud','email_resend','email_smtp','webhook');
CREATE TYPE moments.integration_status AS ENUM
  ('pending','connected','error','revoked','disconnected');

-- --------------------------------------------------------------------- billing
CREATE TYPE moments.subscription_status AS ENUM
  ('trialing','active','past_due','paused','cancelled');
CREATE TYPE moments.invoice_kind      AS ENUM
  ('subscription','gifts','combined','credit_note','wallet_topup');
CREATE TYPE moments.invoice_status    AS ENUM
  ('draft','issued','sent','partially_paid','paid','overdue','void','written_off');
CREATE TYPE moments.payment_method    AS ENUM
  ('bank_transfer','ibft','cheque','cash','card','wallet','adjustment','write_off');
CREATE TYPE moments.payment_status    AS ENUM
  ('reported','under_review','verified','rejected','refunded');
CREATE TYPE moments.wallet_direction  AS ENUM ('credit','debit');
CREATE TYPE moments.wallet_reason     AS ENUM
  ('topup','gift_charge','delivery_fee','subscription_charge','refund','adjustment','reversal');

-- -------------------------------------------------------------------- platform
CREATE TYPE moments.token_purpose     AS ENUM
  ('address_verification','approval','invitation','employee_optout','magic_view','feedback');
CREATE TYPE moments.observance_key    AS ENUM
  ('ramadan_start','ramadan_end','eid_ul_fitr','eid_ul_adha','ashura','eid_milad_un_nabi');
CREATE TYPE moments.observance_status AS ENUM ('predicted','confirmed','cancelled');
CREATE TYPE moments.actor_kind        AS ENUM ('user','staff','system','anon_token','service');
CREATE TYPE moments.alert_severity    AS ENUM ('p1','p2','p3');
CREATE TYPE moments.alert_status      AS ENUM ('open','acknowledged','resolved');

COMMIT;
