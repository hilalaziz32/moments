-- 00006_reference_data.sql
-- moment_types (the celebration catalogue) and observance_dates (the lunar calendar).

BEGIN;

-- --------------------------------------------------------------------------
-- Lunar / officially-announced dates. NOT derivable from a formula.
--
-- THE OPERATIONAL RULE: the detector may create moment_events from `predicted`
-- rows so HR sees Eid on the calendar and budgets for it -- but it must not
-- schedule purchase or announcement tasks earlier than predicted_date - 10 days,
-- and every event sourced from a predicted row is flagged is_provisional.
-- When ops flips a row to `confirmed` (typically 1-2 days out, after the
-- Ruet-e-Hilal Committee announcement), moments.confirm_observance() shifts
-- occurs_on on every dependent event and re-derives scheduled_for on every
-- non-terminal task.
-- Getting this wrong means 40 companies wish each other Eid Mubarak a day early.
-- --------------------------------------------------------------------------
CREATE TABLE moments.observance_dates (
  id             uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  country_code   text NOT NULL DEFAULT 'PK' CHECK (country_code ~ '^[A-Z]{2}$'),
  observance     moments.observance_key NOT NULL,
  hijri_year     int  NOT NULL CHECK (hijri_year BETWEEN 1400 AND 1600),
  gregorian_date date NOT NULL,
  end_date       date,                       -- Ramadan / multi-day Eid holidays
  status         moments.observance_status NOT NULL DEFAULT 'predicted',
  source         text,                       -- 'Ruet-e-Hilal Committee announcement 2026-03-19'
  source_url     text,
  confirmed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at   timestamptz,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT observance_uniq UNIQUE (country_code, observance, hijri_year),
  CONSTRAINT observance_end_after_start
    CHECK (end_date IS NULL OR end_date >= gregorian_date),
  CONSTRAINT observance_confirmed_has_confirmer
    CHECK (status <> 'confirmed' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL))
);
CREATE INDEX observance_lookup_idx
  ON moments.observance_dates (country_code, observance, gregorian_date);

-- --------------------------------------------------------------------------
-- Moment types. A lookup table, NOT an enum, because orgs define custom types.
-- org_id IS NULL means a system type shared by every tenant.
-- --------------------------------------------------------------------------
CREATE TABLE moments.moment_types (
  id                  uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id              uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  key                 text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{1,48}$'),
  label               text NOT NULL,
  label_ur            text,
  description         text,
  category            moments.moment_category NOT NULL,
  date_source         moments.moment_date_source NOT NULL,
  source_field        text CHECK (source_field IN ('date_of_birth','hire_date')),
  source_observance   moments.observance_key,
  is_recurring_annual boolean NOT NULL DEFAULT true,
  supports_milestones boolean NOT NULL DEFAULT false,

  -- Money is bigint paisa, always. The PKR 100 floor catches the #1 bug you will
  -- ship: someone writing 2500 (rupees) where 250000 (paisa) belongs.
  default_budget_paisa bigint NOT NULL DEFAULT 0
    CHECK (default_budget_paisa = 0 OR default_budget_paisa BETWEEN 10000 AND 100000000),

  default_verify_offset_days   smallint NOT NULL DEFAULT 7 CHECK (default_verify_offset_days BETWEEN 0 AND 60),
  default_select_offset_days   smallint NOT NULL DEFAULT 4 CHECK (default_select_offset_days BETWEEN 0 AND 60),
  default_approval_offset_days smallint NOT NULL DEFAULT 2 CHECK (default_approval_offset_days BETWEEN 0 AND 60),
  default_announce_local_time  time NOT NULL DEFAULT '09:00',
  default_announce_publicly    boolean NOT NULL DEFAULT true,
  default_gift_categories moments.product_category[] NOT NULL DEFAULT '{}',

  is_system           boolean NOT NULL DEFAULT false,
  is_active           boolean NOT NULL DEFAULT true,
  sort_order          smallint NOT NULL DEFAULT 100,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT moment_types_source_coherent CHECK (
    (date_source = 'employee_date_field' AND source_field IS NOT NULL) OR
    (date_source = 'observance_calendar'  AND source_observance IS NOT NULL) OR
    (date_source IN ('employee_event','manual','recurring_monthly'))
  ),
  CONSTRAINT moment_types_offsets_ordered CHECK (
    default_verify_offset_days >= default_select_offset_days
    AND default_select_offset_days >= default_approval_offset_days
  )
);

-- PG15+ NULLS NOT DISTINCT: exactly one system 'birthday', and one per org.
CREATE UNIQUE INDEX moment_types_org_key_uniq
  ON moments.moment_types (org_id, key) NULLS NOT DISTINCT;
CREATE INDEX moment_types_active_idx
  ON moments.moment_types (is_active, category, sort_order);

COMMENT ON COLUMN moments.moment_types.default_announce_publicly IS
  'false for new_baby: announcing someone''s baby company-wide before they are ready '
  'is recoverable only by apology. The employee opts in at the verify step.';

CREATE TRIGGER trg_observance_dates_updated_at BEFORE UPDATE ON moments.observance_dates
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_moment_types_updated_at     BEFORE UPDATE ON moments.moment_types
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
