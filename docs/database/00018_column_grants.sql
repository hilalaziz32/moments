-- 00018_column_grants.sql
-- COLUMN-LEVEL GRANTS. RLS hides rows; it cannot hide columns. These are the
-- three places where that distinction is load-bearing, plus the write locks on
-- engine tables.
--
-- PostgREST honours column privileges, so a revoked column simply is not
-- selectable through the API.

BEGIN;

-- ==========================================================================
-- 1. gift_products -- customers must NEVER see our cost, margin, or supplier.
-- ==========================================================================
REVOKE SELECT, INSERT, UPDATE, DELETE ON moments.gift_products FROM authenticated;
GRANT SELECT (
  id, sku, name, name_ur, description, category, list_price_paisa,
  is_food, is_halal_certified, is_eggless, is_vegetarian, contains_nuts,
  contains_gelatin, allergen_notes, suitable_moment_keys, gender_suitability,
  personalisation_fields, min_lead_days, is_digital, image_url, tags, is_active,
  created_at, updated_at
) ON moments.gift_products TO authenticated;

-- ==========================================================================
-- 2. gift_orders -- same reasoning. The customer sees what they pay, never
--    what we pay, never the vendor, never our internal notes.
-- ==========================================================================
REVOKE SELECT, INSERT, UPDATE, DELETE ON moments.gift_orders FROM authenticated;
GRANT SELECT (
  id, org_id, moment_event_id, employee_id, order_number, status,
  address_id, address_snapshot, recipient_name, recipient_phone, city_id,
  deliver_on, delivery_slot, delivery_instructions, dietary_snapshot,
  currency, items_price_paisa, delivery_price_paisa, total_price_paisa,
  budget_paisa, is_over_budget, over_budget_approved_by,
  is_fallback, placed_at, delivered_at, failure_reason, cancelled_at,
  invoice_id, invoiced_at, created_at, updated_at
) ON moments.gift_orders TO authenticated;

REVOKE SELECT ON moments.gift_order_items FROM authenticated;
GRANT SELECT (
  id, order_id, org_id, product_id, name_snapshot, category, quantity,
  unit_price_paisa, line_price_paisa, personalisation, dietary_snapshot, created_at
) ON moments.gift_order_items TO authenticated;

-- ==========================================================================
-- 3. org_integrations -- the Vault pointers. Even an org OWNER cannot read them.
-- ==========================================================================
REVOKE SELECT, INSERT, UPDATE, DELETE ON moments.org_integrations FROM authenticated;
GRANT SELECT (
  id, org_id, provider, status, display_name, external_team_id,
  external_account_id, default_channel_ref, config_public, scopes,
  token_expires_at, installed_by, last_verified_at, last_error, last_error_at,
  created_at, updated_at
) ON moments.org_integrations TO authenticated;
GRANT UPDATE (display_name, default_channel_ref, config_public, status)
  ON moments.org_integrations TO authenticated;

-- ==========================================================================
-- 4. Engine tables: tenants read, tenants do not write.
-- ==========================================================================
REVOKE INSERT, UPDATE, DELETE ON moments.moment_tasks FROM authenticated;
REVOKE INSERT, DELETE ON moments.moment_events FROM authenticated;
REVOKE UPDATE ON moments.moment_events FROM authenticated;
-- A narrow write surface: skip/cancel a moment, adjust its budget, retitle it.
GRANT UPDATE (status, cancel_reason, cancelled_at, budget_paisa, metadata,
              title, announce_publicly)
  ON moments.moment_events TO authenticated;

-- action_tokens: no table privileges at all. RPC-only access.
REVOKE ALL ON moments.action_tokens       FROM authenticated, anon;
REVOKE ALL ON moments.rate_limit_buckets  FROM authenticated, anon;

-- Append-only tables: read only, never written from a browser.
REVOKE INSERT, UPDATE, DELETE ON
  moments.audit_log, moments.job_runs, moments.task_attempts,
  moments.dead_letters, moments.token_events,
  moments.gift_order_status_history, moments.outbound_message_events,
  moments.wallet_ledger
FROM authenticated;

-- Platform-owned reference and supply data: read only for tenants.
REVOKE INSERT, UPDATE, DELETE ON
  moments.vendors, moments.vendor_city_coverage, moments.gift_bundles,
  moments.gift_bundle_items, moments.plans, moments.cities,
  moments.observance_dates, moments.feature_flags, moments.suppressions,
  moments.whatsapp_templates, moments.whatsapp_sessions,
  moments.subscriptions, moments.invoices, moments.invoice_lines,
  moments.wallet_accounts, moments.approval_requests, moments.outbound_messages,
  moments.alerts
FROM authenticated;

-- Customers report their own bank transfer; only staff may verify it.
REVOKE DELETE ON moments.payments FROM authenticated;

-- ==========================================================================
-- 5. Guard the narrow moment_events write surface with a transition trigger.
--    A column grant stops the wrong COLUMN being written; this stops the wrong
--    VALUE being written into an allowed column.
-- ==========================================================================
CREATE OR REPLACE FUNCTION moments.guard_moment_event_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- service_role and our own staff bypass this guard; it exists to constrain
  -- tenant-initiated edits arriving through PostgREST.
  IF (SELECT auth.uid()) IS NULL OR moments.is_platform_staff() THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'scheduled' AND NEW.status = 'skipped')
      OR NEW.status = 'cancelled'
    ) THEN
      RAISE EXCEPTION
        'moment_events: tenants may only skip a scheduled moment or cancel one (tried % -> %)',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_moment_events_guard_status
  BEFORE UPDATE ON moments.moment_events
  FOR EACH ROW EXECUTE FUNCTION moments.guard_moment_event_status();

COMMIT;

-- --------------------------------------------------------------------------
-- Follow-up sweep: revoking SELECT alone leaves INSERT/UPDATE column privileges
-- behind from the schema-wide grant in 00001. RLS would block those writes
-- anyway (no INSERT/UPDATE policy exists for these tables), but the grant is
-- removed too so the privilege audit is clean.
-- --------------------------------------------------------------------------
BEGIN;

REVOKE INSERT, UPDATE, DELETE ON moments.gift_order_items FROM authenticated;
REVOKE SELECT ON moments.vendor_city_coverage FROM authenticated;

COMMIT;

-- approval_requests.otp_hash must not be selectable. It is only a hash, but the
-- OTP exists precisely because high-value approvals should not be reachable from
-- a forwardable link -- so nothing about it belongs in the API surface.
BEGIN;

REVOKE SELECT, INSERT, UPDATE, DELETE ON moments.approval_requests FROM authenticated;
GRANT SELECT (
  id, org_id, moment_event_id, gift_order_id, task_id,
  requested_amount_paisa, budget_paisa, summary,
  approver_kind, approver_user_id, approver_employee_id, approver_email,
  channel, requires_otp, status, sent_at, expires_at, auto_approve_at,
  auto_approve_on_timeout, reminder_count, last_reminded_at,
  responded_at, responded_via, responder_user_id, responder_label,
  decision_note, counter_amount_paisa, created_at, updated_at
) ON moments.approval_requests TO authenticated;

COMMIT;

-- plans.gift_margin_bps / min_margin_paisa describe OUR take rate. A customer
-- browsing plans has no business reading the margin we apply to their gifts.
BEGIN;

REVOKE SELECT, INSERT, UPDATE, DELETE ON moments.plans FROM authenticated;
GRANT SELECT (id, code, name, base_price_paisa, included_employees,
              per_employee_paisa, is_active, created_at, updated_at)
  ON moments.plans TO authenticated;

COMMIT;
