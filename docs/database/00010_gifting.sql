-- 00010_gifting.sql
-- Our supply side: vendors, per-city coverage, products (cost vs price), bundles.
--
-- MARGIN LIVES HERE AND ON THE ORDER. cost_* is what WE pay the vendor; list/price_*
-- is what the ORG pays us. Customers must never see either the cost or the vendor --
-- enforced by COLUMN-LEVEL GRANTS in 00017, because RLS hides rows, never columns.

BEGIN;

CREATE TABLE moments.vendors (
  id                uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name              text NOT NULL UNIQUE,
  legal_name        text,
  category          text,
  contact_name      text,
  contact_phone     text CHECK (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  contact_email     text,
  whatsapp_e164     text CHECK (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  ntn               text,
  payment_terms     text CHECK (payment_terms IN ('prepaid','cod','net7','net15','net30')),
  ordering_method   text CHECK (ordering_method IN ('whatsapp','phone','email','portal')),
  default_lead_days smallint NOT NULL DEFAULT 2 CHECK (default_lead_days BETWEEN 0 AND 30),
  reliability_score smallint CHECK (reliability_score BETWEEN 0 AND 100),
  is_active         boolean NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Per-city variance is huge in Pakistan: lead times, fees and cutoffs all differ.
CREATE TABLE moments.vendor_city_coverage (
  vendor_id          uuid NOT NULL REFERENCES moments.vendors(id) ON DELETE CASCADE,
  city_id            uuid NOT NULL REFERENCES moments.cities(id)  ON DELETE CASCADE,
  lead_time_days     smallint NOT NULL DEFAULT 2 CHECK (lead_time_days BETWEEN 0 AND 30),
  delivery_fee_paisa bigint NOT NULL DEFAULT 0 CHECK (delivery_fee_paisa BETWEEN 0 AND 10000000),
  min_order_paisa    bigint NOT NULL DEFAULT 0 CHECK (min_order_paisa >= 0),
  order_cutoff_local time,                      -- order after 16:00 -> +1 day
  covered_areas      text[] NOT NULL DEFAULT '{}',
  same_day_available boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, city_id)
);
CREATE INDEX vendor_coverage_city_idx
  ON moments.vendor_city_coverage (city_id, lead_time_days) WHERE is_active;

CREATE TABLE moments.gift_products (
  id                 uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  vendor_id          uuid NOT NULL REFERENCES moments.vendors(id) ON DELETE RESTRICT,
  sku                text,
  name               text NOT NULL,
  name_ur            text,
  description        text,
  category           moments.product_category NOT NULL,

  cost_paisa         bigint NOT NULL CHECK (cost_paisa BETWEEN 0 AND 100000000),
  list_price_paisa   bigint NOT NULL CHECK (list_price_paisa BETWEEN 10000 AND 100000000),
  margin_paisa       bigint GENERATED ALWAYS AS (list_price_paisa - cost_paisa) STORED,
  margin_bps         int    GENERATED ALWAYS AS
    (CASE WHEN list_price_paisa > 0
          THEN ((list_price_paisa - cost_paisa) * 10000) / list_price_paisa END) STORED,

  -- Dietary / religious. The gift selector filters on these against the employee.
  is_food            boolean NOT NULL DEFAULT false,
  is_halal_certified boolean NOT NULL DEFAULT false,
  is_eggless         boolean NOT NULL DEFAULT false,
  is_vegetarian      boolean NOT NULL DEFAULT false,
  contains_nuts      boolean NOT NULL DEFAULT false,
  contains_gelatin   boolean NOT NULL DEFAULT false,
  allergen_notes     text,

  suitable_moment_keys   text[] NOT NULL DEFAULT '{}',
  gender_suitability     text NOT NULL DEFAULT 'any'
                           CHECK (gender_suitability IN ('any','male','female')),
  personalisation_fields text[] NOT NULL DEFAULT '{}',  -- {'cake_message','name_on_card'}
  min_lead_days      smallint NOT NULL DEFAULT 1 CHECK (min_lead_days BETWEEN 0 AND 30),
  is_digital         boolean NOT NULL DEFAULT false,    -- e-voucher: the order_fallback path
  image_url          text,
  tags               text[] NOT NULL DEFAULT '{}',
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gift_products_vendor_sku_uniq UNIQUE (vendor_id, sku),
  CONSTRAINT gift_products_margin_nonneg   CHECK (list_price_paisa >= cost_paisa)
);
-- The gift-selection index: "active products in a category, under budget".
CREATE INDEX gift_products_budget_idx ON moments.gift_products (category, list_price_paisa)
  WHERE is_active;
CREATE INDEX gift_products_moment_keys_idx
  ON moments.gift_products USING gin (suitable_moment_keys);
CREATE INDEX gift_products_tags_idx   ON moments.gift_products USING gin (tags);
CREATE INDEX gift_products_vendor_idx ON moments.gift_products (vendor_id) WHERE is_active;
CREATE INDEX gift_products_digital_idx ON moments.gift_products (list_price_paisa)
  WHERE is_active AND is_digital;

COMMENT ON COLUMN moments.gift_products.is_digital IS
  'Digital gifts back the order_fallback handler: at T-0 08:00, if the physical gift '
  'is not confirmed in transit, substitute one of these so the employee gets something '
  'on the day. The physical item arrives later as a bonus.';

CREATE TABLE moments.gift_bundles (
  id                  uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id              uuid REFERENCES moments.organizations(id) ON DELETE CASCADE, -- NULL = platform
  name                text NOT NULL,
  description         text,
  target_budget_paisa bigint NOT NULL CHECK (target_budget_paisa BETWEEN 10000 AND 100000000),
  suitable_moment_keys text[] NOT NULL DEFAULT '{}',
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moments.gift_bundle_items (
  bundle_id   uuid NOT NULL REFERENCES moments.gift_bundles(id)  ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES moments.gift_products(id) ON DELETE RESTRICT,
  quantity    smallint NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 50),
  is_optional boolean NOT NULL DEFAULT false,
  PRIMARY KEY (bundle_id, product_id)
);

-- Deferred FKs from 00008.
ALTER TABLE moments.moment_policies
  ADD CONSTRAINT moment_policies_default_bundle_id_fkey
  FOREIGN KEY (default_bundle_id) REFERENCES moments.gift_bundles(id) ON DELETE SET NULL;
ALTER TABLE moments.milestone_tiers
  ADD CONSTRAINT milestone_tiers_bundle_id_fkey
  FOREIGN KEY (bundle_id) REFERENCES moments.gift_bundles(id) ON DELETE SET NULL;

CREATE TRIGGER trg_vendors_updated_at          BEFORE UPDATE ON moments.vendors
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_vendor_coverage_updated_at  BEFORE UPDATE ON moments.vendor_city_coverage
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_gift_products_updated_at    BEFORE UPDATE ON moments.gift_products
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_gift_bundles_updated_at     BEFORE UPDATE ON moments.gift_bundles
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
