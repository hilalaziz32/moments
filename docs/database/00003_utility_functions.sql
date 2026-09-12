-- 00003_utility_functions.sql
-- Shared helper functions.
--
-- Every function in this schema carries `SET search_path = ''` and fully qualifies
-- every object. This satisfies Supabase's `function_search_path_mutable` advisory and
-- eliminates search_path injection against SECURITY DEFINER functions.
--
-- Note: with search_path = '', pg_catalog is STILL searched implicitly, so now(),
-- coalesce(), || and = on builtin types resolve fine. What breaks is unqualified
-- references to our own objects and to extension objects -- hence moments.x,
-- auth.uid(), extensions.digest(...).

BEGIN;

-- --------------------------------------------------------------------------
-- updated_at stamping. Attached to every table carrying an updated_at column.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END $$;

COMMENT ON FUNCTION moments.set_updated_at() IS
  'BEFORE UPDATE trigger: stamps updated_at. Attach to every table with that column.';

-- --------------------------------------------------------------------------
-- Email normalisation.
-- We use text + normalising trigger + unique index rather than citext, because
-- citext's = operator lives in the `extensions` schema and would not resolve
-- inside functions hardened with SET search_path = ''.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.normalize_email(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT NULLIF(pg_catalog.lower(pg_catalog.btrim(p)), '');
$$;

-- --------------------------------------------------------------------------
-- Token hashing.
-- Plain SHA-256, deliberately NOT bcrypt/argon2: these tokens are 256 bits from
-- gen_random_bytes(32), not user-chosen passwords. There is no dictionary to
-- attack, so a slow KDF buys nothing and costs latency on every click of an
-- emailed link. The justification is entropy, not laziness.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.hash_token(p_token text)
RETURNS bytea
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT extensions.digest(p_token, 'sha256');
$$;

-- --------------------------------------------------------------------------
-- Local-time -> instant. Used by the detector when computing task schedules.
-- Always: date arithmetic in the org timezone, THEN convert. Never add an
-- INTERVAL to a timestamptz -- Pakistan has no DST but a Dubai or London office
-- in the same org does.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.local_instant(p_on date, p_at time, p_tz text)
RETURNS timestamptz
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT (p_on + p_at) AT TIME ZONE p_tz;
$$;

COMMENT ON FUNCTION moments.local_instant(date, time, text) IS
  'Converts a local calendar date + wall-clock time in an IANA timezone to an instant.';

COMMIT;
