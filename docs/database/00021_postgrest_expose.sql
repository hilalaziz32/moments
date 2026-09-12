-- 00021_postgrest_expose.sql
-- RUN THIS LAST.
--
-- Adds `moments` to PostgREST's exposed-schema list. Without it every
-- supabase.schema('moments') call returns PGRST106.
--
-- VERIFIED WORKING on this project as the `postgres` role, despite `authenticator`
-- appearing in supautils.reserved_roles -- the reserved list blocks DROP/RENAME,
-- not ALTER ROLE ... SET.
--
-- ############################################################################
-- TWO THINGS THAT WILL BITE YOU:
--
-- 1. KEEP `public` FIRST. The first schema in the list is the default profile for
--    unqualified PostgREST requests. This database is SHARED with an unrelated
--    tours/bookings application that calls .from('bookings') with no schema
--    header. If `moments` were first, that application breaks instantly.
--    Moments clients must always use supabase.schema('moments').
--
-- 2. DASHBOARD DRIFT. Settings -> API -> "Exposed schemas" writes the same
--    config. If someone opens that page and hits Save, it can overwrite this
--    ALTER ROLE. If the API starts returning PGRST106 after someone visited the
--    dashboard, re-run this file. Equivalent programmatic route:
--      PATCH https://api.supabase.com/v1/projects/{ref}/postgrest
--      {"db_schema": "public, graphql_public, moments"}
-- ############################################################################

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, moments';

-- `reload config` picks up db_schemas; `reload schema` rebuilds the cache.
-- Supabase's DDL event trigger usually reloads the schema cache for us, but after
-- a db_schemas change both must be issued explicitly.
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
