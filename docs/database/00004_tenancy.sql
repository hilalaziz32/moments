-- 00004_tenancy.sql
-- Organizations, membership, platform staff, invitations -- plus `cities`, which
-- organizations references for billing address.
--
-- Two structural decisions worth knowing before reading:
--   * org_id is denormalized onto every tenant-owned table so RLS policies never
--     join. This single choice decides whether RLS is fast at 10k employees.
--   * Our own ops staff live in `staff_users`, NOT in org_members. Putting them in
--     org_members would show strangers in every tenant's member list, force special
--     cases into RLS, and conflate "customer did this" with "we did this" in audit.

BEGIN;

-- --------------------------------------------------------------------------
-- Cities. Drives vendor coverage, delivery lead times and fees. Pakistan first.
-- --------------------------------------------------------------------------
CREATE TABLE moments.cities (
  id             uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name           text NOT NULL,
  name_ur        text,
  province       text NOT NULL
                   CHECK (province IN ('Sindh','Punjab','KPK','Balochistan','ICT','GB','AJK')),
  country_code   text NOT NULL DEFAULT 'PK' CHECK (country_code ~ '^[A-Z]{2}$'),
  is_serviceable boolean NOT NULL DEFAULT false,
  tier           smallint CHECK (tier BETWEEN 1 AND 3),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cities_name_province_uniq UNIQUE (country_code, province, name)
);
CREATE INDEX cities_serviceable_idx ON moments.cities (is_serviceable, name);
CREATE INDEX cities_name_trgm_idx   ON moments.cities USING gin (name extensions.gin_trgm_ops);

COMMENT ON TABLE moments.cities IS 'Serviceable cities. tier 1 = Karachi/Lahore/Islamabad.';

-- --------------------------------------------------------------------------
-- Profiles: app-visible mirror of auth.users (auth schema is not exposed to PostgREST).
-- --------------------------------------------------------------------------
CREATE TABLE moments.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text NOT NULL DEFAULT '' CHECK (length(full_name) <= 200),
  email        text,
  phone_e164   text CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  avatar_url   text,
  locale       text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ur','ur-Latn')),
  timezone     text NOT NULL DEFAULT 'Asia/Karachi',
  default_org_id uuid,                       -- FK added after organizations exists
  last_seen_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_idx ON moments.profiles (email) WHERE email IS NOT NULL;

-- --------------------------------------------------------------------------
-- Organizations: the tenant. One customer company.
-- --------------------------------------------------------------------------
CREATE TABLE moments.organizations (
  id                  uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  slug                text NOT NULL UNIQUE
                        CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  name                text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 200),
  legal_name          text,
  status              moments.org_status NOT NULL DEFAULT 'trial',

  -- IANA name, never a '+05:00' offset. Pakistan ran DST in 2002 and 2008-09; an
  -- offset literal would silently fire announcements an hour off if it ever returns.
  timezone            text NOT NULL DEFAULT 'Asia/Karachi',
  currency            text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  default_locale      text NOT NULL DEFAULT 'en' CHECK (default_locale IN ('en','ur','ur-Latn')),

  -- Pakistan tax identity, needed for B2B invoicing from day one.
  ntn                 text CHECK (ntn ~ '^[0-9]{7}-?[0-9]?$' OR ntn ~ '^[0-9]{13}$'),
  strn                text CHECK (strn ~ '^[0-9]{13}$'),
  tax_jurisdiction    text CHECK (tax_jurisdiction IN ('FBR','SRB','PRA','KPRA','BRA','ICT')),
  billing_email       text,
  billing_address     jsonb NOT NULL DEFAULT '{}'::jsonb,
  billing_city_id     uuid REFERENCES moments.cities(id) ON DELETE SET NULL,

  -- Behaviour switches the engine reads.
  feb29_observed_on   text NOT NULL DEFAULT 'feb_28' CHECK (feb29_observed_on IN ('feb_28','mar_01')),
  late_announcement_policy text NOT NULL DEFAULT 'fire_immediately_if_before_15'
                        CHECK (late_announcement_policy IN ('fire_immediately_if_before_15','next_day','skip')),
  announcement_digest_threshold smallint NOT NULL DEFAULT 3
                        CHECK (announcement_digest_threshold BETWEEN 1 AND 50),
  celebrate_on_terminated_exit boolean NOT NULL DEFAULT false,
  dry_run_until       timestamptz,            -- messages go only to HR while set

  employee_count_hint int CHECK (employee_count_hint >= 0),
  logo_url            text,
  brand_color         text CHECK (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  onboarding_state    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);
CREATE INDEX organizations_status_idx ON moments.organizations (status) WHERE deleted_at IS NULL;

COMMENT ON COLUMN moments.organizations.dry_run_until IS
  'While in the future, every message renders and every task runs, but sends go only '
  'to the HR admin with a [PREVIEW] banner. Default ON for the first 7 days of an org.';

ALTER TABLE moments.profiles
  ADD CONSTRAINT profiles_default_org_id_fkey
  FOREIGN KEY (default_org_id) REFERENCES moments.organizations(id) ON DELETE SET NULL;

-- --------------------------------------------------------------------------
-- Membership.
-- --------------------------------------------------------------------------
CREATE TABLE moments.org_members (
  id          uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        moments.org_role NOT NULL DEFAULT 'viewer',
  status      moments.membership_status NOT NULL DEFAULT 'active',
  employee_id uuid,                          -- FK added in 00008 (employees)
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_members_org_user_uniq UNIQUE (org_id, user_id)
);
CREATE INDEX org_members_user_active_idx ON moments.org_members (user_id) WHERE status = 'active';
CREATE INDEX org_members_org_idx         ON moments.org_members (org_id, role);

-- --------------------------------------------------------------------------
-- Our staff. Cross-tenant ops access, granted by explicit policies on precisely
-- the tables ops needs -- never by membership in a customer's org.
-- --------------------------------------------------------------------------
CREATE TABLE moments.staff_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       moments.staff_role NOT NULL DEFAULT 'ops',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Invitations. token_id FK is added in 00010 once action_tokens exists.
-- --------------------------------------------------------------------------
CREATE TABLE moments.invitations (
  id          uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  email       text NOT NULL CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%'),
  role        moments.org_role NOT NULL DEFAULT 'viewer',
  token_id    uuid,
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invitations_pending_uniq
  ON moments.invitations (org_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- --------------------------------------------------------------------------
-- updated_at triggers
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_cities_updated_at        BEFORE UPDATE ON moments.cities
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at      BEFORE UPDATE ON moments.profiles
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON moments.organizations
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_org_members_updated_at   BEFORE UPDATE ON moments.org_members
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_staff_users_updated_at   BEFORE UPDATE ON moments.staff_users
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_invitations_updated_at   BEFORE UPDATE ON moments.invitations
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

-- --------------------------------------------------------------------------
-- Profile bootstrap on signup.
--
-- THE EXCEPTION HANDLER IS THE WHOLE POINT. This database is shared with an
-- unrelated tours application. A raise inside an auth.users trigger makes Supabase
-- Auth signup return 500 -- for THAT app as well as ours. This trigger must never
-- be able to fail a signup.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO moments.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    moments.normalize_email(NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'moments.handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created_moments
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION moments.handle_new_auth_user();

COMMIT;
