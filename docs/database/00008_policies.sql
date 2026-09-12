-- 00008_policies.sql
-- The autopilot's rulebook: per-org configuration of each moment type, plus
-- milestone budget tiers.
--
-- bundle FKs are added in 00010_gifting.sql once gift_bundles exists.

BEGIN;

CREATE TABLE moments.moment_policies (
  id                    uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  moment_type_id        uuid NOT NULL REFERENCES moments.moment_types(id) ON DELETE CASCADE,
  is_enabled            boolean NOT NULL DEFAULT true,

  budget_paisa          bigint NOT NULL
    CHECK (budget_paisa = 0 OR budget_paisa BETWEEN 10000 AND 100000000),
  budget_includes_delivery boolean NOT NULL DEFAULT true,

  -- Lead-day offsets, days BEFORE occurs_on. T-7 / T-4 / T-2 by default.
  verify_offset_days    smallint NOT NULL DEFAULT 7 CHECK (verify_offset_days   BETWEEN 0 AND 60),
  select_offset_days    smallint NOT NULL DEFAULT 4 CHECK (select_offset_days   BETWEEN 0 AND 60),
  approval_offset_days  smallint NOT NULL DEFAULT 2 CHECK (approval_offset_days BETWEEN 0 AND 60),

  approval_required     boolean NOT NULL DEFAULT false,
  approval_threshold_paisa bigint CHECK (approval_threshold_paisa IS NULL OR approval_threshold_paisa >= 0),
  approver_kind         moments.approver_kind NOT NULL DEFAULT 'hr',
  approval_channel      moments.channel NOT NULL DEFAULT 'email',
  auto_approve_after_hours smallint NOT NULL DEFAULT 24
    CHECK (auto_approve_after_hours BETWEEN 0 AND 168),

  gift_enabled          boolean NOT NULL DEFAULT true,
  card_enabled          boolean NOT NULL DEFAULT true,
  delivery_target       moments.delivery_target NOT NULL DEFAULT 'home',
  allowed_categories    moments.product_category[] NOT NULL DEFAULT '{}',
  default_bundle_id     uuid,

  announcement_enabled  boolean NOT NULL DEFAULT true,
  announcement_channels moments.channel[] NOT NULL DEFAULT ARRAY['email']::moments.channel[],
  announcement_local_time time NOT NULL DEFAULT '09:00',
  announcement_locale   text NOT NULL DEFAULT 'en'
    CHECK (announcement_locale IN ('en','ur','ur-Latn')),
  announce_publicly     boolean NOT NULL DEFAULT true,
  skip_on_weekend       boolean NOT NULL DEFAULT false,

  manager_nudge_enabled boolean NOT NULL DEFAULT true,
  manager_nudge_channel moments.channel NOT NULL DEFAULT 'email',

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT moment_policies_uniq UNIQUE (org_id, moment_type_id),
  CONSTRAINT moment_policies_offsets_ordered
    CHECK (verify_offset_days >= select_offset_days
       AND select_offset_days >= approval_offset_days),
  CONSTRAINT moment_policies_channels_nonempty
    CHECK (NOT announcement_enabled OR cardinality(announcement_channels) > 0)
);
CREATE INDEX moment_policies_org_enabled_idx
  ON moments.moment_policies (org_id) WHERE is_enabled;

-- --------------------------------------------------------------------------
-- Milestone tiers: 1yr vs 5yr vs 10yr anniversary budgets.
-- The EXCLUDE constraint (btree_gist) is real correctness work: without it two
-- tiers can both claim year 5 and budget resolution becomes nondeterministic.
-- --------------------------------------------------------------------------
CREATE TABLE moments.milestone_tiers (
  id             uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  moment_type_id uuid NOT NULL REFERENCES moments.moment_types(id) ON DELETE CASCADE,
  label          text NOT NULL,                       -- "5 Year Club"
  years_range    int4range NOT NULL,                  -- '[5,10)'
  budget_paisa   bigint NOT NULL CHECK (budget_paisa BETWEEN 10000 AND 100000000),
  bundle_id      uuid,
  extra_perks    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT milestone_years_valid
    CHECK (lower(years_range) >= 0 AND NOT isempty(years_range)),
  CONSTRAINT milestone_no_overlap EXCLUDE USING gist (
    org_id WITH =, moment_type_id WITH =, years_range WITH &&
  ) WHERE (is_active)
);
CREATE INDEX milestone_tiers_lookup_idx ON moments.milestone_tiers (org_id, moment_type_id);

-- --------------------------------------------------------------------------
-- Budget resolution order: active milestone tier containing `years`
--                       -> moment_policies.budget_paisa
--                       -> moment_types.default_budget_paisa
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.resolve_budget(
  p_org uuid, p_moment_type_id uuid, p_years int DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT t.budget_paisa
       FROM moments.milestone_tiers t
      WHERE t.org_id = p_org
        AND t.moment_type_id = p_moment_type_id
        AND t.is_active
        AND p_years IS NOT NULL
        AND t.years_range @> p_years
      LIMIT 1),
    (SELECT p.budget_paisa
       FROM moments.moment_policies p
      WHERE p.org_id = p_org AND p.moment_type_id = p_moment_type_id),
    (SELECT mt.default_budget_paisa
       FROM moments.moment_types mt
      WHERE mt.id = p_moment_type_id),
    0::bigint
  );
$$;
REVOKE EXECUTE ON FUNCTION moments.resolve_budget(uuid, uuid, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION moments.resolve_budget(uuid, uuid, int) TO authenticated, service_role;

CREATE TRIGGER trg_moment_policies_updated_at BEFORE UPDATE ON moments.moment_policies
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_milestone_tiers_updated_at BEFORE UPDATE ON moments.milestone_tiers
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
