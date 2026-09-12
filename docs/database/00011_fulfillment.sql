-- 00011_fulfillment.sql
-- Orders, line items, status timeline, proof of delivery.
--
-- THE RULE THROUGHOUT: snapshot everything that affects a physical action or an
-- invoice. If an employee moves house in October, the September order must still
-- show where the cake actually went. If a price book changes, a delivered order's
-- margin must not move.
--
-- invoice_id FK is added in 00013_billing.sql.

BEGIN;

CREATE TABLE moments.gift_orders (
  id                 uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE RESTRICT,
  moment_event_id    uuid NOT NULL REFERENCES moments.moment_events(id) ON DELETE RESTRICT,
  employee_id        uuid REFERENCES moments.employees(id) ON DELETE SET NULL,
  vendor_id          uuid REFERENCES moments.vendors(id)   ON DELETE RESTRICT,
  order_number       text NOT NULL UNIQUE,
  status             moments.order_status NOT NULL DEFAULT 'draft',

  -- Delivery target: SNAPSHOT, never a live join.
  address_id         uuid REFERENCES moments.addresses(id) ON DELETE SET NULL,
  address_snapshot   jsonb NOT NULL,
  recipient_name     text NOT NULL,
  recipient_phone    text CHECK (recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  city_id            uuid REFERENCES moments.cities(id) ON DELETE SET NULL,
  deliver_on         date NOT NULL,
  delivery_slot      text,
  delivery_instructions text,
  dietary_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- MONEY. cost_* = what WE pay the vendor. price_* = what the ORG pays us.
  currency             text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  items_cost_paisa     bigint NOT NULL DEFAULT 0 CHECK (items_cost_paisa    >= 0),
  delivery_cost_paisa  bigint NOT NULL DEFAULT 0 CHECK (delivery_cost_paisa >= 0),
  total_cost_paisa     bigint GENERATED ALWAYS AS (items_cost_paisa + delivery_cost_paisa) STORED,
  items_price_paisa    bigint NOT NULL DEFAULT 0 CHECK (items_price_paisa    >= 0),
  delivery_price_paisa bigint NOT NULL DEFAULT 0 CHECK (delivery_price_paisa >= 0),
  total_price_paisa    bigint GENERATED ALWAYS AS (items_price_paisa + delivery_price_paisa) STORED,
  margin_paisa         bigint GENERATED ALWAYS AS
    ((items_price_paisa + delivery_price_paisa) - (items_cost_paisa + delivery_cost_paisa)) STORED,
  budget_paisa       bigint NOT NULL DEFAULT 0,
  is_over_budget     boolean GENERATED ALWAYS AS
    ((items_price_paisa + delivery_price_paisa) > budget_paisa) STORED,
  over_budget_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ops-assisted fulfillment: a human places this with the vendor.
  assigned_staff_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ops_sla_due_at     timestamptz,
  is_fallback        boolean NOT NULL DEFAULT false,   -- substituted digital gift
  vendor_order_ref   text,
  vendor_invoice_ref text,
  vendor_paid_at     timestamptz,
  placed_at          timestamptz,
  placed_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delivered_at       timestamptz,
  failure_reason     text,
  cancelled_at       timestamptz,
  invoice_id         uuid,
  invoiced_at        timestamptz,
  internal_notes     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gift_orders_delivered_ts
    CHECK (status <> 'delivered' OR delivered_at IS NOT NULL),
  CONSTRAINT gift_orders_placed_ts
    CHECK (status NOT IN ('placed_with_vendor','in_transit','delivered') OR placed_at IS NOT NULL)
);

-- One live order per moment. A cancelled order frees the slot for a replacement.
CREATE UNIQUE INDEX gift_orders_event_active_uniq
  ON moments.gift_orders (moment_event_id) WHERE status <> 'cancelled';
CREATE INDEX gift_orders_org_status_idx ON moments.gift_orders (org_id, status, deliver_on);
-- *** THE OPS QUEUE INDEX ***
CREATE INDEX gift_orders_ops_queue_idx  ON moments.gift_orders (deliver_on, ops_sla_due_at)
  WHERE status IN ('queued_for_ops','approved','placed_with_vendor','in_transit');
-- Billing: delivered but not yet invoiced. We never bill for a gift that did not arrive.
CREATE INDEX gift_orders_uninvoiced_idx ON moments.gift_orders (org_id, delivered_at)
  WHERE status = 'delivered' AND invoice_id IS NULL;
CREATE INDEX gift_orders_city_idx       ON moments.gift_orders (city_id, deliver_on);

ALTER TABLE moments.moment_events
  ADD CONSTRAINT moment_events_gift_order_id_fkey
  FOREIGN KEY (gift_order_id) REFERENCES moments.gift_orders(id) ON DELETE SET NULL;

CREATE TABLE moments.gift_order_items (
  id               uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES moments.gift_orders(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES moments.gift_products(id) ON DELETE SET NULL,
  name_snapshot    text NOT NULL,
  category         moments.product_category NOT NULL,
  quantity         smallint NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 500),
  unit_cost_paisa  bigint NOT NULL CHECK (unit_cost_paisa  >= 0),
  unit_price_paisa bigint NOT NULL CHECK (unit_price_paisa >= 0),
  line_cost_paisa  bigint GENERATED ALWAYS AS (unit_cost_paisa  * quantity) STORED,
  line_price_paisa bigint GENERATED ALWAYS AS (unit_price_paisa * quantity) STORED,
  personalisation  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {cake_message_en, cake_message_ur}
  dietary_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gift_order_items_order_idx ON moments.gift_order_items (order_id);

-- The tracking timeline the customer sees. Distinct from audit_log, which is security.
CREATE TABLE moments.gift_order_status_history (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES moments.gift_orders(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  from_status moments.order_status,
  to_status   moments.order_status NOT NULL,
  actor_kind  moments.actor_kind NOT NULL DEFAULT 'system',
  actor_id    uuid,
  reason      text,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx
  ON moments.gift_order_status_history (order_id, occurred_at);

CREATE TABLE moments.delivery_proofs (
  id           uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES moments.gift_orders(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  kind         moments.proof_kind NOT NULL,
  storage_path text,                        -- Supabase Storage object key
  reference    text,                        -- courier tracking no / OTP
  received_by  text,
  captured_at  timestamptz NOT NULL DEFAULT now(),
  uploaded_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes        text
);
CREATE INDEX delivery_proofs_order_idx ON moments.delivery_proofs (order_id);

-- Records every status transition automatically, so the customer timeline can
-- never drift from the order row.
CREATE OR REPLACE FUNCTION moments.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO moments.gift_order_status_history (order_id, org_id, from_status, to_status)
    VALUES (NEW.id, NEW.org_id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
            NEW.status);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_gift_orders_status_history
  AFTER INSERT OR UPDATE OF status ON moments.gift_orders
  FOR EACH ROW EXECUTE FUNCTION moments.log_order_status_change();

CREATE TRIGGER trg_gift_orders_updated_at BEFORE UPDATE ON moments.gift_orders
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
