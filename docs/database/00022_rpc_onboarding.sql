-- 00022_rpc_onboarding.sql
-- RPCs backing the onboarding wizard.
--
-- organizations has no client INSERT policy on purpose: creating an org must
-- atomically create the owner membership, the default per-moment policies, the
-- wallet and the trial subscription. A browser doing that in five round trips
-- can leave a half-built tenant behind.

BEGIN;

-- --------------------------------------------------------------------------
-- create_organization -- step 0 of the wizard.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.create_organization(
  p_name              text,
  p_timezone          text DEFAULT 'Asia/Karachi',
  p_employee_count_hint int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_org  uuid;
  v_slug text;
  v_n    int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'must be signed in to create an organisation'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF pg_catalog.length(pg_catalog.btrim(p_name)) < 2 THEN
    RAISE EXCEPTION 'organisation name is too short' USING ERRCODE = 'check_violation';
  END IF;

  -- Slugify, then de-duplicate with a counter.
  v_slug := pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(p_name)), '[^a-z0-9]+', '-', 'g');
  v_slug := pg_catalog.btrim(v_slug, '-');
  IF pg_catalog.length(v_slug) < 3 THEN v_slug := 'org-' || v_slug; END IF;
  v_slug := pg_catalog.left(v_slug, 40);

  WHILE EXISTS (SELECT 1 FROM moments.organizations o WHERE o.slug = v_slug) LOOP
    v_n := v_n + 1;
    v_slug := pg_catalog.left(v_slug, 40 - pg_catalog.length(v_n::text) - 1) || '-' || v_n::text;
  END LOOP;

  INSERT INTO moments.organizations
    (slug, name, status, timezone, employee_count_hint, created_by,
     -- Dry run is ON for the first 7 days. Every message renders and every task
     -- runs, but sends go only to the HR admin. This is what makes "hand your
     -- employee data to a startup" a survivable decision.
     dry_run_until)
  VALUES (v_slug, pg_catalog.btrim(p_name), 'trial', p_timezone, p_employee_count_hint, v_user,
          pg_catalog.now() + INTERVAL '7 days')
  RETURNING id INTO v_org;

  INSERT INTO moments.org_members (org_id, user_id, role, status)
  VALUES (v_org, v_user, 'owner', 'active');

  -- Seed a policy per system moment type, using its documented default budget.
  INSERT INTO moments.moment_policies (
    org_id, moment_type_id, is_enabled, budget_paisa,
    verify_offset_days, select_offset_days, approval_offset_days,
    announcement_enabled, announcement_channels, announcement_local_time,
    announce_publicly, approval_required
  )
  SELECT v_org, mt.id,
         mt.default_budget_paisa > 0,          -- Eid etc. start disabled: no budget set yet
         mt.default_budget_paisa,
         mt.default_verify_offset_days, mt.default_select_offset_days, mt.default_approval_offset_days,
         true, ARRAY['email']::moments.channel[], mt.default_announce_local_time,
         mt.default_announce_publicly, false
    FROM moments.moment_types mt
   WHERE mt.org_id IS NULL AND mt.is_active;

  INSERT INTO moments.wallet_accounts (org_id) VALUES (v_org);

  INSERT INTO moments.subscriptions (org_id, plan_id, status, period, trial_ends_on)
  SELECT v_org, p.id, 'trialing',
         daterange(CURRENT_DATE, CURRENT_DATE + 30, '[)'),
         CURRENT_DATE + 30
    FROM moments.plans p WHERE p.code = 'starter';

  UPDATE moments.profiles SET default_org_id = v_org WHERE id = v_user AND default_org_id IS NULL;

  INSERT INTO moments.audit_log (org_id, actor_kind, actor_user_id, action, entity, entity_id)
  VALUES (v_org, 'user', v_user, 'organization.created', 'organizations', v_org);

  RETURN v_org;
END $$;

REVOKE EXECUTE ON FUNCTION moments.create_organization(text, text, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION moments.create_organization(text, text, int) TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- commit_employee_import -- step 3 of the wizard.
--
-- Chunked on purpose: `authenticator` carries statement_timeout = 8s, so a
-- single-statement upsert of 5,000 rows would be killed mid-flight. The caller
-- loops until remaining = 0.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.commit_employee_import(
  p_batch_id  uuid,
  p_chunk     int DEFAULT 200
)
RETURNS TABLE (imported int, updated int, remaining int)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org      uuid;
  v_match    text;
  v_imported int := 0;
  v_updated  int := 0;
  r          record;
  v_existing uuid;
BEGIN
  SELECT b.org_id, COALESCE(b.options ->> 'match_on', 'work_email')
    INTO v_org, v_match
    FROM moments.employee_import_batches b
   WHERE b.id = p_batch_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'import batch % not found', p_batch_id USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT (moments.can_manage_people(v_org) OR moments.is_platform_staff()) THEN
    RAISE EXCEPTION 'not allowed to import employees for this organisation'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  FOR r IN
    SELECT * FROM moments.employee_import_rows
     WHERE batch_id = p_batch_id AND status = 'valid'
     ORDER BY row_number
     LIMIT p_chunk
  LOOP
    v_existing := NULL;

    IF v_match = 'employee_code' AND NULLIF(r.normalized ->> 'employeeCode', '') IS NOT NULL THEN
      SELECT e.id INTO v_existing FROM moments.employees e
       WHERE e.org_id = v_org AND e.employee_code = r.normalized ->> 'employeeCode'
         AND e.deleted_at IS NULL;
    ELSIF NULLIF(r.normalized ->> 'workEmail', '') IS NOT NULL THEN
      SELECT e.id INTO v_existing FROM moments.employees e
       WHERE e.org_id = v_org AND e.work_email = r.normalized ->> 'workEmail'
         AND e.deleted_at IS NULL;
    END IF;

    IF v_existing IS NULL THEN
      INSERT INTO moments.employees (
        org_id, employee_code, full_name, full_name_ur, preferred_name,
        work_email, personal_email, phone_e164, whatsapp_e164,
        gender, date_of_birth, hire_date, job_title, department,
        shirt_size, status, locale, custom_fields, import_batch_id
      ) VALUES (
        v_org,
        NULLIF(r.normalized ->> 'employeeCode', ''),
        r.normalized ->> 'fullName',
        NULLIF(r.normalized ->> 'fullNameUr', ''),
        NULLIF(r.normalized ->> 'preferredName', ''),
        NULLIF(r.normalized ->> 'workEmail', ''),
        NULLIF(r.normalized ->> 'personalEmail', ''),
        NULLIF(r.normalized ->> 'phoneE164', ''),
        NULLIF(r.normalized ->> 'whatsappE164', ''),
        NULLIF(r.normalized ->> 'gender', ''),
        (NULLIF(r.normalized ->> 'dateOfBirth', ''))::date,
        (NULLIF(r.normalized ->> 'hireDate', ''))::date,
        NULLIF(r.normalized ->> 'jobTitle', ''),
        NULLIF(r.normalized ->> 'department', ''),
        NULLIF(r.normalized ->> 'shirtSize', ''),
        COALESCE(NULLIF(r.normalized ->> 'status', ''), 'active')::moments.employee_status,
        COALESCE(NULLIF(r.normalized ->> 'locale', ''), 'en'),
        COALESCE(r.normalized -> 'customFields', '{}'::jsonb),
        p_batch_id
      )
      RETURNING id INTO v_existing;
      v_imported := v_imported + 1;

      UPDATE moments.employee_import_rows
         SET status = 'imported', employee_id = v_existing, updated_at = pg_catalog.now()
       WHERE id = r.id;
    ELSE
      UPDATE moments.employees e
         SET full_name      = r.normalized ->> 'fullName',
             preferred_name = COALESCE(NULLIF(r.normalized ->> 'preferredName',''), e.preferred_name),
             phone_e164     = COALESCE(NULLIF(r.normalized ->> 'phoneE164',''), e.phone_e164),
             whatsapp_e164  = COALESCE(NULLIF(r.normalized ->> 'whatsappE164',''), e.whatsapp_e164),
             date_of_birth  = COALESCE((NULLIF(r.normalized ->> 'dateOfBirth',''))::date, e.date_of_birth),
             hire_date      = COALESCE((NULLIF(r.normalized ->> 'hireDate',''))::date, e.hire_date),
             job_title      = COALESCE(NULLIF(r.normalized ->> 'jobTitle',''), e.job_title),
             department     = COALESCE(NULLIF(r.normalized ->> 'department',''), e.department),
             shirt_size     = COALESCE(NULLIF(r.normalized ->> 'shirtSize',''), e.shirt_size),
             custom_fields  = e.custom_fields || COALESCE(r.normalized -> 'customFields', '{}'::jsonb),
             updated_at     = pg_catalog.now()
       WHERE e.id = v_existing;
      v_updated := v_updated + 1;

      UPDATE moments.employee_import_rows
         SET status = 'updated', employee_id = v_existing, updated_at = pg_catalog.now()
       WHERE id = r.id;
    END IF;
  END LOOP;

  -- Second pass: link managers now that every row exists.
  UPDATE moments.employees e
     SET manager_id = mgr.id
    FROM moments.employee_import_rows r
    JOIN moments.employees mgr
      ON mgr.org_id = v_org
     AND mgr.work_email = r.normalized ->> 'managerEmail'
     AND mgr.deleted_at IS NULL
   WHERE r.batch_id = p_batch_id
     AND r.employee_id = e.id
     AND NULLIF(r.normalized ->> 'managerEmail', '') IS NOT NULL
     AND e.manager_id IS DISTINCT FROM mgr.id
     AND mgr.id <> e.id;

  SELECT COUNT(*)::int INTO remaining
    FROM moments.employee_import_rows
   WHERE batch_id = p_batch_id AND status = 'valid';

  UPDATE moments.employee_import_batches
     SET imported_rows = imported_rows + v_imported + v_updated,
         status = CASE WHEN remaining = 0
                       THEN (CASE WHEN error_rows > 0 THEN 'completed_with_errors' ELSE 'completed' END)::moments.import_batch_status
                       ELSE 'importing'::moments.import_batch_status END,
         finished_at = CASE WHEN remaining = 0 THEN pg_catalog.now() ELSE NULL END,
         updated_at = pg_catalog.now()
   WHERE id = p_batch_id;

  imported := v_imported;
  updated  := v_updated;
  RETURN NEXT;
END $$;

REVOKE EXECUTE ON FUNCTION moments.commit_employee_import(uuid, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION moments.commit_employee_import(uuid, int) TO authenticated, service_role;

COMMIT;
