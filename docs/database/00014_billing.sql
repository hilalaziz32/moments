-- 00014_billing.sql
-- Plans, subscriptions, invoices, payments, wallet.
--
-- THERE IS NO STRIPE IN PAKISTAN. Bank transfer / IBFT is the happy path, not the
-- fallback. Card-on-file recurring is unreliable, so the model is: monthly invoice
-- + manually verified payment, with an optional prepaid wallet for orgs that
-- prefer to pre-fund against a single approved PO.

BEGIN;

CREATE TABLE moments.plans (
  id                  uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  code                text NOT NULL UNIQUE,
  name                text NOT NULL,
  base_price_paisa    bigint NOT NULL CHECK (base_price_paisa >= 0),
  included_employees  int NOT NULL DEFAULT 0 CHECK (included_employees >= 0),
  per_employee_paisa  bigint NOT NULL DEFAULT 0 CHECK (per_employee_paisa >= 0),
  gift_margin_bps     int NOT NULL DEFAULT 2000 CHECK (gift_margin_bps BETWEEN 0 AND 10000),
  min_margin_paisa    bigint NOT NULL DEFAULT 0 CHECK (min_margin_paisa >= 0),
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moments.subscriptions (
  id                   uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  plan_id              uuid NOT NULL REFERENCES moments.plans(id) ON DELETE RESTRICT,
  status               moments.subscription_status NOT NULL DEFAULT 'trialing',
  period               daterange NOT NULL,
  billing_day          smallint NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  committed_employees  int CHECK (committed_employees IS NULL OR committed_employees >= 0),
  trial_ends_on        date,
  cancelled_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  -- btree_gist: an org cannot have two live subscriptions covering the same day.
  CONSTRAINT subscriptions_no_overlap EXCLUDE USING gist (
    org_id WITH =, period WITH &&
  ) WHERE (status IN ('trialing','active','past_due'))
);
CREATE INDEX subscriptions_org_idx ON moments.subscriptions (org_id, status);

CREATE TABLE moments.invoices (
  id                        uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id                    uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE RESTRICT,
  number                    text NOT NULL UNIQUE,
  kind                      moments.invoice_kind NOT NULL DEFAULT 'combined',
  status                    moments.invoice_status NOT NULL DEFAULT 'draft',
  period_start              date NOT NULL,
  period_end                date NOT NULL,

  currency                  text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  subtotal_subscription_paisa bigint NOT NULL DEFAULT 0 CHECK (subtotal_subscription_paisa >= 0),
  subtotal_gifts_paisa      bigint NOT NULL DEFAULT 0 CHECK (subtotal_gifts_paisa    >= 0),
  subtotal_delivery_paisa   bigint NOT NULL DEFAULT 0 CHECK (subtotal_delivery_paisa >= 0),
  adjustments_paisa         bigint NOT NULL DEFAULT 0,
  tax_rate_bps              int NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  tax_paisa                 bigint NOT NULL DEFAULT 0 CHECK (tax_paisa >= 0),
  total_paisa               bigint NOT NULL DEFAULT 0 CHECK (total_paisa >= 0),
  paid_paisa                bigint NOT NULL DEFAULT 0 CHECK (paid_paisa >= 0),
  -- Pakistani corporate customers withhold income tax under s.153 and send a
  -- certificate. Not being able to record that is an accounting dead-end you would
  -- otherwise hit in month two.
  wht_paisa                 bigint NOT NULL DEFAULT 0 CHECK (wht_paisa >= 0),
  wht_certificate_ref       text,

  employee_count_snapshot   int,
  notes                     text,
  pdf_path                  text,
  issued_at                 timestamptz,
  due_on                    date,
  paid_at                   timestamptz,
  voided_at                 timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_period_ordered CHECK (period_end >= period_start),
  -- Idempotent invoice generation by construction: re-running the monthly job
  -- is a no-op, not a duplicate bill.
  CONSTRAINT invoices_org_period_uniq UNIQUE (org_id, period_start, kind)
);
CREATE INDEX invoices_org_status_idx ON moments.invoices (org_id, status, due_on);

ALTER TABLE moments.gift_orders
  ADD CONSTRAINT gift_orders_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES moments.invoices(id) ON DELETE SET NULL;

CREATE TABLE moments.invoice_lines (
  id              uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES moments.invoices(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN
                    ('subscription','gift','delivery','adjustment','credit','wallet_topup')),
  description     text NOT NULL,
  quantity        int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_paisa bigint NOT NULL,
  amount_paisa    bigint NOT NULL,
  gift_order_id   uuid REFERENCES moments.gift_orders(id)  ON DELETE SET NULL,
  moment_event_id uuid REFERENCES moments.moment_events(id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_lines_invoice_idx ON moments.invoice_lines (invoice_id);

CREATE TABLE moments.payments (
  id              uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE RESTRICT,
  invoice_id      uuid REFERENCES moments.invoices(id) ON DELETE SET NULL,
  method          moments.payment_method NOT NULL DEFAULT 'bank_transfer',
  status          moments.payment_status NOT NULL DEFAULT 'reported',
  amount_paisa    bigint NOT NULL CHECK (amount_paisa > 0),
  wht_paisa       bigint NOT NULL DEFAULT 0 CHECK (wht_paisa >= 0),
  paid_on         date,
  bank_reference  text,          -- the field that makes reconciliation possible
  proof_path      text,          -- everyone pays from a banking app and screenshots it
  submitted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  verified_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_verified_has_ts
    CHECK (status <> 'verified' OR (verified_at IS NOT NULL AND verified_by IS NOT NULL))
);
CREATE INDEX payments_org_status_idx ON moments.payments (org_id, status, submitted_at DESC);
CREATE INDEX payments_pending_idx    ON moments.payments (submitted_at)
  WHERE status IN ('reported','under_review');

CREATE TABLE moments.wallet_accounts (
  org_id                     uuid PRIMARY KEY REFERENCES moments.organizations(id) ON DELETE CASCADE,
  balance_paisa              bigint NOT NULL DEFAULT 0,
  held_paisa                 bigint NOT NULL DEFAULT 0 CHECK (held_paisa >= 0),
  low_balance_threshold_paisa bigint NOT NULL DEFAULT 0 CHECK (low_balance_threshold_paisa >= 0),
  -- Default 'invoice', NOT 'pause'. Never let a payment edge case cause a missed
  -- birthday; that trade is always worth the credit risk at these amounts.
  on_insufficient            text NOT NULL DEFAULT 'invoice'
                               CHECK (on_insufficient IN ('pause','invoice')),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- Append-only. Never UPDATE or DELETE a ledger row; reverse it instead.
CREATE TABLE moments.wallet_ledger (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id              uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  direction           moments.wallet_direction NOT NULL,
  reason              moments.wallet_reason NOT NULL,
  amount_paisa        bigint NOT NULL CHECK (amount_paisa > 0),
  balance_after_paisa bigint NOT NULL,
  ref_type            text,
  ref_id              uuid,
  description         text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_ledger_org_idx ON moments.wallet_ledger (org_id, created_at DESC);

CREATE TRIGGER trg_plans_updated_at           BEFORE UPDATE ON moments.plans
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at   BEFORE UPDATE ON moments.subscriptions
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_invoices_updated_at        BEFORE UPDATE ON moments.invoices
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_payments_updated_at        BEFORE UPDATE ON moments.payments
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_wallet_accounts_updated_at BEFORE UPDATE ON moments.wallet_accounts
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
