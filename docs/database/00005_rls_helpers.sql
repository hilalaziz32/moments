-- 00005_rls_helpers.sql
-- The functions every RLS policy in this schema depends on.
--
-- THREE THINGS MAKE OR BREAK THIS FILE:
--
-- 1. SECURITY DEFINER is mandatory on current_org_ids(). A policy on org_members
--    that queries org_members recurses infinitely. These functions are owned by
--    `postgres`, and table owners are exempt from RLS by default, so the inner
--    query bypasses policies cleanly.
--    COROLLARY: never run ALTER TABLE moments.org_members FORCE ROW LEVEL SECURITY.
--    It would break every policy in the schema. This is in the runbook.
--
-- 2. ALWAYS call these as (SELECT ...) inside policies. Postgres hoists a scalar
--    subquery of stable functions into an InitPlan evaluated ONCE PER QUERY rather
--    than once per row:
--        USING (org_id = ANY ((SELECT moments.current_org_ids())))  -- 1 call
--        USING (moments.is_org_member(org_id))                      -- 10,000 calls
--    Use the ANY(...) form for SELECT policies. Use the per-row form only in
--    INSERT/UPDATE/DELETE policies, where the row count is 1.
--
-- 3. STABLE, not VOLATILE. Only STABLE functions get hoisted into an InitPlan.

BEGIN;

-- Every org the current user actively belongs to.
CREATE OR REPLACE FUNCTION moments.current_org_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(pg_catalog.array_agg(m.org_id), '{}'::uuid[])
  FROM moments.org_members m
  WHERE m.user_id = (SELECT auth.uid())
    AND m.status = 'active';
$$;

CREATE OR REPLACE FUNCTION moments.has_org_role(p_org uuid, p_roles moments.org_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM moments.org_members m
    WHERE m.org_id = p_org
      AND m.user_id = (SELECT auth.uid())
      AND m.status  = 'active'
      AND m.role    = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION moments.is_org_member(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_org = ANY (moments.current_org_ids());
$$;

CREATE OR REPLACE FUNCTION moments.is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT moments.has_org_role(p_org, ARRAY['owner','admin']::moments.org_role[]);
$$;

-- Who may edit the roster and run the autopilot.
CREATE OR REPLACE FUNCTION moments.can_manage_people(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT moments.has_org_role(p_org, ARRAY['owner','admin','hr_manager']::moments.org_role[]);
$$;

-- Budgets are money: owner/admin only, deliberately NOT hr_manager.
CREATE OR REPLACE FUNCTION moments.can_manage_billing(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT moments.has_org_role(p_org, ARRAY['owner','admin','finance']::moments.org_role[]);
$$;

-- Our own ops team. Cross-tenant, and gated further by per-table policies.
CREATE OR REPLACE FUNCTION moments.is_platform_staff(p_roles moments.staff_role[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM moments.staff_users s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.is_active
      AND (p_roles IS NULL OR s.role = ANY (p_roles))
  );
$$;

-- NOTE: moments.current_employee_id(uuid) is defined in 00008_employees.sql.
-- SQL-language function bodies are validated at CREATE time, so it cannot be
-- declared before moments.employees exists.

-- --------------------------------------------------------------------------
-- Grants. The schema-wide REVOKE in 00001 stripped PUBLIC; grant back explicitly.
-- --------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  moments.current_org_ids(),
  moments.has_org_role(uuid, moments.org_role[]),
  moments.is_org_member(uuid),
  moments.is_org_admin(uuid),
  moments.can_manage_people(uuid),
  moments.can_manage_billing(uuid),
  moments.is_platform_staff(moments.staff_role[])
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  moments.current_org_ids(),
  moments.has_org_role(uuid, moments.org_role[]),
  moments.is_org_member(uuid),
  moments.is_org_admin(uuid),
  moments.can_manage_people(uuid),
  moments.can_manage_billing(uuid),
  moments.is_platform_staff(moments.staff_role[])
TO authenticated, service_role;

COMMIT;
