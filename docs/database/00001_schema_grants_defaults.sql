-- 00001_schema_grants_defaults.sql
-- Moments — Employee Celebration Autopilot
-- Creates the `moments` schema, installs required extensions, sets baseline grants
-- and default privileges.
--
-- IMPORTANT: this database's `public` schema belongs to an unrelated tours/bookings
-- application. Nothing in these migrations may touch `public`.

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
-- Supabase convention: extensions live in the `extensions` schema, not public.
CREATE EXTENSION IF NOT EXISTS pgcrypto   WITH SCHEMA extensions;  -- gen_random_uuid, digest, gen_random_bytes
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;  -- EXCLUDE constraints on ranges
CREATE EXTENSION IF NOT EXISTS pg_trgm    WITH SCHEMA extensions;  -- employee name search (unicode/Urdu)

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS moments AUTHORIZATION postgres;

COMMENT ON SCHEMA moments IS
  'Moments — Employee Celebration Autopilot. Tenant-isolated via RLS. '
  'Do not place objects in public; public belongs to an unrelated application.';

GRANT USAGE ON SCHEMA moments TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Baseline object privileges
-- RLS is the security boundary; grants are the outer gate.
-- `anon` deliberately receives NO table privileges. Anonymous (tokenised link)
-- access happens exclusively through SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA moments TO authenticated;
GRANT ALL                            ON ALL TABLES    IN SCHEMA moments TO service_role;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA moments TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Default privileges for future objects.
-- MUST be `FOR ROLE postgres`: default privileges only apply to objects created
-- by the role named here. Migrations run as `postgres`.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA moments
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA moments
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA moments
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- THE IMPORTANT ONE.
-- Postgres grants EXECUTE on newly created functions to PUBLIC by default.
-- Without this revoke, `anon` could call moments.claim_due_tasks() over the internet.
-- Every function is granted explicitly, per function, after it is defined.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA moments
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA moments FROM PUBLIC;

COMMIT;
