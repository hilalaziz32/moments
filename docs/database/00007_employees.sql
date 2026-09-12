-- 00007_employees.sql
-- offices, employees, addresses, employee_events, CSV import staging.

BEGIN;

CREATE TABLE moments.offices (
  id            uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  city_id       uuid REFERENCES moments.cities(id) ON DELETE SET NULL,
  address_line  text,
  area          text,
  landmark      text,
  contact_name  text,
  contact_phone text CHECK (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  timezone      text NOT NULL DEFAULT 'Asia/Karachi',
  is_default    boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offices_org_name_uniq UNIQUE (org_id, name)
);
CREATE UNIQUE INDEX offices_one_default_idx ON moments.offices (org_id) WHERE is_default;

-- --------------------------------------------------------------------------
-- CSV import batches. Declared before employees because employees references it.
-- --------------------------------------------------------------------------
CREATE TABLE moments.employee_import_batches (
  id             uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  uploaded_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  filename       text NOT NULL,
  storage_path   text,
  status         moments.import_batch_status NOT NULL DEFAULT 'uploaded',
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- e.g. {"update_existing": true, "match_on": "work_email", "date_format": "DD/MM/YYYY"}
  options        jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_rows     int NOT NULL DEFAULT 0 CHECK (total_rows    >= 0),
  valid_rows     int NOT NULL DEFAULT 0 CHECK (valid_rows    >= 0),
  error_rows     int NOT NULL DEFAULT 0 CHECK (error_rows    >= 0),
  imported_rows  int NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  error_summary  jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_batches_org_idx
  ON moments.employee_import_batches (org_id, created_at DESC);

-- --------------------------------------------------------------------------
-- The celebrated human.
-- --------------------------------------------------------------------------
CREATE TABLE moments.employees (
  id              uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code   text CHECK (length(employee_code) <= 64),

  full_name       text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 200),
  full_name_ur    text,                       -- Urdu script, for cake/card personalisation
  preferred_name  text,

  work_email      text CHECK (work_email     = lower(btrim(work_email))),
  personal_email  text CHECK (personal_email = lower(btrim(personal_email))),
  phone_e164      text CHECK (phone_e164     ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_e164   text CHECK (whatsapp_e164  ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_opt_in_at timestamptz,
  whatsapp_opted_out boolean NOT NULL DEFAULT false,
  slack_user_id   text,

  gender          text CHECK (gender IN ('male','female','other','undisclosed')),
  date_of_birth   date CHECK (date_of_birth > DATE '1930-01-01' AND date_of_birth < CURRENT_DATE),
  hire_date       date CHECK (hire_date > DATE '1970-01-01'),
  exit_date       date,
  exit_reason     text CHECK (exit_reason IN ('resigned','retired','end_of_contract','redundancy','terminated_for_cause')),
  job_title       text,
  department      text,
  office_id       uuid REFERENCES moments.offices(id) ON DELETE SET NULL,
  manager_id      uuid REFERENCES moments.employees(id) ON DELETE SET NULL,
  status          moments.employee_status NOT NULL DEFAULT 'active',
  timezone        text,                       -- overrides org tz for remote workers
  locale          text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ur','ur-Latn')),

  -- Dietary / religious constraints on food gifts. First-class columns, not jsonb:
  -- the gift selector filters on these.
  halal_only      boolean NOT NULL DEFAULT true,
  is_vegetarian   boolean NOT NULL DEFAULT false,
  needs_eggless   boolean NOT NULL DEFAULT false,
  allergies       text[] NOT NULL DEFAULT '{}',
  dietary_notes   text,
  shirt_size      text CHECK (shirt_size IN ('XS','S','M','L','XL','XXL','XXXL')),

  -- Consent. First-class, and honoured by the detector.
  celebration_opt_out boolean NOT NULL DEFAULT false,
  hide_birth_year     boolean NOT NULL DEFAULT true,

  -- *** DETECTOR SUPPORT ***
  -- Stored generated MMDD keys. Stored rather than a functional index so PostgREST
  -- can filter on them directly from supabase-js.
  --
  -- FEB 29: birth_mmdd = 229 matches NOTHING in a non-leap year. The detector MUST
  -- explicitly widen to include 229 when its scan window covers Feb 28 of a
  -- non-leap year, honouring organizations.feb29_observed_on. Two lines of code,
  -- and a guaranteed support ticket if omitted.
  birth_mmdd  int GENERATED ALWAYS AS
    (EXTRACT(MONTH FROM date_of_birth)::int * 100 + EXTRACT(DAY FROM date_of_birth)::int) STORED,
  hire_mmdd   int GENERATED ALWAYS AS
    (EXTRACT(MONTH FROM hire_date)::int * 100 + EXTRACT(DAY FROM hire_date)::int) STORED,

  custom_fields   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- unmapped CSV columns, never dropped
  import_batch_id uuid REFERENCES moments.employee_import_batches(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,

  CONSTRAINT employees_exit_after_hire
    CHECK (exit_date IS NULL OR hire_date IS NULL OR exit_date >= hire_date),
  CONSTRAINT employees_exited_has_date
    CHECK (status <> 'exited' OR exit_date IS NOT NULL),
  CONSTRAINT employees_not_own_manager
    CHECK (manager_id IS DISTINCT FROM id),
  CONSTRAINT employees_has_contact
    CHECK (work_email IS NOT NULL OR personal_email IS NOT NULL OR phone_e164 IS NOT NULL)
);

CREATE UNIQUE INDEX employees_org_code_uniq ON moments.employees (org_id, employee_code)
  WHERE employee_code IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX employees_org_wemail_uniq ON moments.employees (org_id, work_email)
  WHERE work_email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX employees_org_status_idx ON moments.employees (org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX employees_manager_idx    ON moments.employees (manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX employees_org_office_idx ON moments.employees (org_id, office_id);
CREATE INDEX employees_user_idx       ON moments.employees (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX employees_name_trgm_idx  ON moments.employees USING gin (full_name extensions.gin_trgm_ops);

-- *** THE TWO DETECTOR INDEXES ***
-- MMDD leading, because the nightly detector scans across ALL orgs for
-- "whose birthday falls in the next N days".
CREATE INDEX employees_birth_mmdd_idx ON moments.employees (birth_mmdd, org_id)
  WHERE status IN ('active','on_leave') AND celebration_opt_out = false
    AND deleted_at IS NULL AND date_of_birth IS NOT NULL;
CREATE INDEX employees_hire_mmdd_idx ON moments.employees (hire_mmdd, org_id)
  WHERE status IN ('active','on_leave') AND celebration_opt_out = false
    AND deleted_at IS NULL AND hire_date IS NOT NULL;

ALTER TABLE moments.org_members
  ADD CONSTRAINT org_members_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE SET NULL;

-- --------------------------------------------------------------------------
-- Addresses, with a real verification state machine.
-- The T-7 verify step exists because this data is unreliable; the state machine
-- IS the product. PK-shaped fields matter: `area` ("DHA Phase 6") and `landmark`
-- are load-bearing for riders in a way postal_code is not.
-- --------------------------------------------------------------------------
CREATE TABLE moments.addresses (
  id              uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES moments.employees(id) ON DELETE CASCADE,
  kind            moments.address_kind NOT NULL DEFAULT 'home',
  recipient_name  text,
  recipient_phone text CHECK (recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  line1           text NOT NULL CHECK (length(btrim(line1)) >= 5),
  line2           text,
  area            text,
  landmark        text,
  city_id         uuid REFERENCES moments.cities(id) ON DELETE SET NULL,
  city_text       text,
  postal_code     text,
  google_maps_url text,
  latitude        double precision CHECK (latitude  BETWEEN  -90 AND  90),
  longitude       double precision CHECK (longitude BETWEEN -180 AND 180),
  delivery_notes  text,

  verification_status moments.address_verification_status NOT NULL DEFAULT 'unverified',
  verified_at     timestamptz,
  verified_by_kind moments.actor_kind,
  verified_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Free "stale address" report: WHERE verification_expires_at < now().
  -- Trigger-maintained, not GENERATED: timestamptz + interval is STABLE (it depends
  -- on timezone rules), and generated columns require an IMMUTABLE expression.
  verification_expires_at timestamptz,

  last_delivery_ok_at   timestamptz,
  failed_delivery_count int NOT NULL DEFAULT 0 CHECK (failed_delivery_count >= 0),
  is_primary      boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT addresses_city_present CHECK (city_id IS NOT NULL OR city_text IS NOT NULL),
  CONSTRAINT addresses_verified_has_ts CHECK (
    verification_status NOT IN ('employee_confirmed','hr_confirmed') OR verified_at IS NOT NULL)
);
CREATE UNIQUE INDEX addresses_one_primary_idx
  ON moments.addresses (employee_id) WHERE is_primary AND is_active;
CREATE INDEX addresses_employee_idx   ON moments.addresses (employee_id, is_active);
CREATE INDEX addresses_org_status_idx ON moments.addresses (org_id, verification_status);
CREATE INDEX addresses_city_idx       ON moments.addresses (city_id) WHERE is_active;
CREATE INDEX addresses_stale_idx      ON moments.addresses (verification_expires_at)
  WHERE is_active AND verification_expires_at IS NOT NULL;

-- --------------------------------------------------------------------------
-- HR-recorded life/career events: the source for promotion / marriage /
-- new_baby / farewell moments, which are not derivable from a date field.
-- --------------------------------------------------------------------------
CREATE TABLE moments.employee_events (
  id             uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  employee_id    uuid NOT NULL REFERENCES moments.employees(id) ON DELETE CASCADE,
  moment_type_id uuid NOT NULL REFERENCES moments.moment_types(id) ON DELETE RESTRICT,
  event_date     date NOT NULL,
  details        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {new_title, baby_gender, spouse_name}
  is_celebrated  boolean NOT NULL DEFAULT true,
  recorded_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_events_detect_idx
  ON moments.employee_events (event_date, org_id) WHERE is_celebrated;
CREATE INDEX employee_events_employee_idx
  ON moments.employee_events (employee_id, event_date DESC);

-- --------------------------------------------------------------------------
-- Per-row import staging + per-row error capture. HR fixes rows in the UI and
-- re-commits; we never silently clamp a bad value.
-- --------------------------------------------------------------------------
CREATE TABLE moments.employee_import_rows (
  id          uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  batch_id    uuid NOT NULL REFERENCES moments.employee_import_batches(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  row_number  int  NOT NULL CHECK (row_number > 0),
  raw         jsonb NOT NULL,
  normalized  jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      moments.import_row_status NOT NULL DEFAULT 'pending',
  errors      jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{field, code, message}]
  employee_id uuid REFERENCES moments.employees(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_rows_batch_row_uniq UNIQUE (batch_id, row_number)
);
CREATE INDEX import_rows_batch_status_idx ON moments.employee_import_rows (batch_id, status);

-- --------------------------------------------------------------------------
-- Deferred from 00005: needs moments.employees to exist, because SQL-language
-- function bodies are validated at CREATE time.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.current_employee_id(p_org uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id
  FROM moments.employees e
  WHERE e.org_id = p_org
    AND e.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION moments.current_employee_id(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION moments.current_employee_id(uuid) TO authenticated, service_role;

-- Keeps verification_expires_at in lockstep with verified_at.
CREATE OR REPLACE FUNCTION moments.set_address_verification_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.verification_expires_at :=
    CASE WHEN NEW.verified_at IS NULL THEN NULL
         ELSE NEW.verified_at + INTERVAL '180 days' END;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_addresses_verification_expiry
  BEFORE INSERT OR UPDATE OF verified_at ON moments.addresses
  FOR EACH ROW EXECUTE FUNCTION moments.set_address_verification_expiry();

CREATE TRIGGER trg_offices_updated_at         BEFORE UPDATE ON moments.offices
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_employees_updated_at       BEFORE UPDATE ON moments.employees
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_addresses_updated_at       BEFORE UPDATE ON moments.addresses
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_employee_events_updated_at BEFORE UPDATE ON moments.employee_events
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_import_batches_updated_at  BEFORE UPDATE ON moments.employee_import_batches
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_import_rows_updated_at     BEFORE UPDATE ON moments.employee_import_rows
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
