-- 00017_rls_policies.sql
-- Row Level Security for every table in the schema.
--
-- RULES APPLIED THROUGHOUT:
--   * RLS is ENABLED ON EVERY TABLE, including reference tables. Anything else
--     trips Supabase's rls_disabled_in_public advisor.
--   * Never FOR ALL, never TO public. Separate policies per command, TO authenticated.
--   * SELECT policies use `org_id = ANY ((SELECT moments.current_org_ids())::uuid[])` so the
--     helper is hoisted into a once-per-query InitPlan instead of once per row.
--   * Every UPDATE policy carries a WITH CHECK. Without it an admin of org A can
--     UPDATE ... SET org_id = <org B> and hand a row to another tenant.
--   * service_role needs no policies -- it carries BYPASSRLS.

BEGIN;

-- ==========================================================================
-- 1. Enable RLS everywhere.
-- ==========================================================================
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'moments'
  LOOP
    EXECUTE format('ALTER TABLE moments.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- ==========================================================================
-- 2. The standard tenant pattern, applied to every table that has an org_id
--    and is edited by HR/admins.
-- ==========================================================================
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'offices','employees','addresses','employee_events',
    'employee_import_batches','employee_import_rows',
    'moment_policies','milestone_tiers','moment_types'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format($f$
      CREATE POLICY %1$s_select_member ON moments.%1$I FOR SELECT TO authenticated
        USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
      CREATE POLICY %1$s_insert_admin ON moments.%1$I FOR INSERT TO authenticated
        WITH CHECK (moments.can_manage_people(org_id));
      CREATE POLICY %1$s_update_admin ON moments.%1$I FOR UPDATE TO authenticated
        USING (moments.can_manage_people(org_id))
        WITH CHECK (moments.can_manage_people(org_id));
      CREATE POLICY %1$s_delete_admin ON moments.%1$I FOR DELETE TO authenticated
        USING (moments.is_org_admin(org_id));
    $f$, t);
  END LOOP;
END $$;

-- ==========================================================================
-- 3. Overrides and special cases.
-- ==========================================================================

-- --- profiles -------------------------------------------------------------
CREATE POLICY profiles_select_self_or_colleague ON moments.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR moments.is_platform_staff()
    OR EXISTS (
      SELECT 1 FROM moments.org_members m
      WHERE m.user_id = moments.profiles.id
        AND m.org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
    )
  );
CREATE POLICY profiles_update_self ON moments.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- --- organizations --------------------------------------------------------
-- No client INSERT: org creation goes through moments.create_organization() so
-- owner membership, default policies, wallet and subscription are atomic.
CREATE POLICY organizations_select_member ON moments.organizations FOR SELECT TO authenticated
  USING (id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY organizations_update_admin ON moments.organizations FOR UPDATE TO authenticated
  USING (moments.is_org_admin(id)) WITH CHECK (moments.is_org_admin(id));

-- --- org_members ----------------------------------------------------------
CREATE POLICY org_members_select_member ON moments.org_members FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY org_members_insert_admin ON moments.org_members FOR INSERT TO authenticated
  WITH CHECK (moments.is_org_admin(org_id));
CREATE POLICY org_members_update_admin ON moments.org_members FOR UPDATE TO authenticated
  USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));
CREATE POLICY org_members_delete_admin ON moments.org_members FOR DELETE TO authenticated
  USING (moments.is_org_admin(org_id));

-- --- staff_users ----------------------------------------------------------
CREATE POLICY staff_users_select_self ON moments.staff_users FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR moments.is_platform_staff(ARRAY['platform_admin']::moments.staff_role[]));

-- --- invitations ----------------------------------------------------------
-- Acceptance is via RPC: the invitee is by definition not yet a member, so no
-- policy could let them see the row.
CREATE POLICY invitations_select_admin ON moments.invitations FOR SELECT TO authenticated
  USING (moments.is_org_admin(org_id) OR moments.is_platform_staff());
CREATE POLICY invitations_insert_admin ON moments.invitations FOR INSERT TO authenticated
  WITH CHECK (moments.is_org_admin(org_id));
CREATE POLICY invitations_update_admin ON moments.invitations FOR UPDATE TO authenticated
  USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));
CREATE POLICY invitations_delete_admin ON moments.invitations FOR DELETE TO authenticated
  USING (moments.is_org_admin(org_id));

-- --- employees: narrow the blanket SELECT ---------------------------------
-- Managers see their direct reports; employees see themselves; HR/admin see all.
-- `finance` deliberately sees NO employee PII -- it reads v_finance_employees.
DROP POLICY employees_select_member ON moments.employees;
CREATE POLICY employees_select_scoped ON moments.employees FOR SELECT TO authenticated
  USING (
    moments.is_platform_staff()
    OR (
      org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
      AND (
        moments.can_manage_people(org_id)
        OR user_id = (SELECT auth.uid())
        OR manager_id = moments.current_employee_id(org_id)
      )
    )
  );

-- --- addresses: stricter than the roster ----------------------------------
-- A viewer or manager has no business reading home addresses.
DROP POLICY addresses_select_member ON moments.addresses;
CREATE POLICY addresses_select_scoped ON moments.addresses FOR SELECT TO authenticated
  USING (
    moments.is_platform_staff()
    OR (
      org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
      AND (moments.can_manage_people(org_id)
           OR employee_id = moments.current_employee_id(org_id))
    )
  );

-- --- moment_types: system types are readable by all, editable by none ------
DROP POLICY moment_types_select_member ON moments.moment_types;
CREATE POLICY moment_types_select_all ON moments.moment_types FOR SELECT TO authenticated
  USING (org_id IS NULL
         OR org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
         OR moments.is_platform_staff());
DROP POLICY moment_types_insert_admin ON moments.moment_types;
CREATE POLICY moment_types_insert_admin ON moments.moment_types FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND moments.is_org_admin(org_id));
DROP POLICY moment_types_update_admin ON moments.moment_types;
CREATE POLICY moment_types_update_admin ON moments.moment_types FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND moments.is_org_admin(org_id))
  WITH CHECK (org_id IS NOT NULL AND moments.is_org_admin(org_id));

-- --- budgets are money: owner/admin only, not hr_manager ------------------
DROP POLICY moment_policies_insert_admin ON moments.moment_policies;
DROP POLICY moment_policies_update_admin ON moments.moment_policies;
CREATE POLICY moment_policies_insert_admin ON moments.moment_policies FOR INSERT TO authenticated
  WITH CHECK (moments.is_org_admin(org_id));
CREATE POLICY moment_policies_update_admin ON moments.moment_policies FOR UPDATE TO authenticated
  USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));

DROP POLICY milestone_tiers_insert_admin ON moments.milestone_tiers;
DROP POLICY milestone_tiers_update_admin ON moments.milestone_tiers;
CREATE POLICY milestone_tiers_insert_admin ON moments.milestone_tiers FOR INSERT TO authenticated
  WITH CHECK (moments.is_org_admin(org_id));
CREATE POLICY milestone_tiers_update_admin ON moments.milestone_tiers FOR UPDATE TO authenticated
  USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));

-- ==========================================================================
-- 4. Engine tables: READ ONLY for tenants.
--    No browser has business setting a task to 'succeeded'.
-- ==========================================================================
CREATE POLICY moment_events_select_member ON moments.moment_events FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
-- Narrow UPDATE: the column list is restricted by a column GRANT in 00018, and a
-- trigger rejects status transitions outside {scheduled -> skipped, * -> cancelled}.
CREATE POLICY moment_events_update_admin ON moments.moment_events FOR UPDATE TO authenticated
  USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));

CREATE POLICY moment_tasks_select_member ON moments.moment_tasks FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());

CREATE POLICY approval_requests_select_member ON moments.approval_requests FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());

CREATE POLICY outbound_messages_select_member ON moments.outbound_messages FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY outbound_message_events_select_member ON moments.outbound_message_events
  FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());

CREATE POLICY token_events_select_member ON moments.token_events FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());

CREATE POLICY audit_log_select_member ON moments.audit_log FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());

CREATE POLICY task_attempts_select_member ON moments.task_attempts FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());

-- ==========================================================================
-- 5. action_tokens: RLS ENABLED, ZERO POLICIES.
--    Not anon, not authenticated, not even org admins. The only access path is
--    SECURITY DEFINER RPCs. A token row that is never selectable through
--    PostgREST can never leak through PostgREST.
-- ==========================================================================
-- (intentionally empty)

-- ==========================================================================
-- 6. Fulfillment: tenants read, staff writes.
--    The tenant's only mutation paths are the approve/reject and cancel RPCs.
-- ==========================================================================
CREATE POLICY gift_orders_select_member ON moments.gift_orders FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY gift_orders_write_staff ON moments.gift_orders FOR UPDATE TO authenticated
  USING (moments.is_platform_staff()) WITH CHECK (moments.is_platform_staff());
CREATE POLICY gift_orders_insert_staff ON moments.gift_orders FOR INSERT TO authenticated
  WITH CHECK (moments.is_platform_staff());

CREATE POLICY gift_order_items_select_member ON moments.gift_order_items FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY gift_order_status_history_select_member ON moments.gift_order_status_history
  FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY delivery_proofs_select_member ON moments.delivery_proofs FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());

-- ==========================================================================
-- 7. Platform-owned supply side: OPS ONLY.
--    Customers have no business knowing our suppliers.
-- ==========================================================================
CREATE POLICY vendors_staff_only ON moments.vendors FOR SELECT TO authenticated
  USING (moments.is_platform_staff());
CREATE POLICY vendor_coverage_staff_only ON moments.vendor_city_coverage FOR SELECT TO authenticated
  USING (moments.is_platform_staff());

-- Catalog is readable by tenants, but cost/margin/vendor columns are revoked in 00018.
CREATE POLICY gift_products_select_all ON moments.gift_products FOR SELECT TO authenticated
  USING (is_active OR moments.is_platform_staff());
CREATE POLICY gift_bundles_select_all ON moments.gift_bundles FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
         OR moments.is_platform_staff());
CREATE POLICY gift_bundle_items_select_all ON moments.gift_bundle_items FOR SELECT TO authenticated
  USING (true);

-- ==========================================================================
-- 8. Reference data: readable by all authenticated, writable by staff only.
-- ==========================================================================
CREATE POLICY cities_select_all ON moments.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY observance_select_all ON moments.observance_dates FOR SELECT TO authenticated USING (true);
CREATE POLICY observance_write_staff ON moments.observance_dates FOR UPDATE TO authenticated
  USING (moments.is_platform_staff(ARRAY['platform_admin','ops']::moments.staff_role[]))
  WITH CHECK (moments.is_platform_staff(ARRAY['platform_admin','ops']::moments.staff_role[]));
CREATE POLICY plans_select_all ON moments.plans FOR SELECT TO authenticated USING (is_active);
CREATE POLICY feature_flags_select_all ON moments.feature_flags FOR SELECT TO authenticated USING (true);

-- ==========================================================================
-- 9. Messaging config.
-- ==========================================================================
CREATE POLICY org_integrations_select_member ON moments.org_integrations FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY org_integrations_update_admin ON moments.org_integrations FOR UPDATE TO authenticated
  USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));
CREATE POLICY org_integrations_delete_admin ON moments.org_integrations FOR DELETE TO authenticated
  USING (moments.is_org_admin(org_id));

CREATE POLICY message_templates_select ON moments.message_templates FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
         OR moments.is_platform_staff());
CREATE POLICY message_templates_insert_admin ON moments.message_templates FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND moments.can_manage_people(org_id));
CREATE POLICY message_templates_update_admin ON moments.message_templates FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND moments.can_manage_people(org_id))
  WITH CHECK (org_id IS NOT NULL AND moments.can_manage_people(org_id));
CREATE POLICY message_templates_delete_admin ON moments.message_templates FOR DELETE TO authenticated
  USING (org_id IS NOT NULL AND moments.is_org_admin(org_id));

CREATE POLICY whatsapp_templates_select ON moments.whatsapp_templates FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
         OR moments.is_platform_staff());
CREATE POLICY whatsapp_sessions_select ON moments.whatsapp_sessions FOR SELECT TO authenticated
  USING (org_id = ANY ((SELECT moments.current_org_ids())::uuid[]) OR moments.is_platform_staff());
CREATE POLICY suppressions_select ON moments.suppressions FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id = ANY ((SELECT moments.current_org_ids())::uuid[])
         OR moments.is_platform_staff());

-- ==========================================================================
-- 10. Billing: finance/owner/admin read; writes via RPC or staff.
-- ==========================================================================
CREATE POLICY subscriptions_select_billing ON moments.subscriptions FOR SELECT TO authenticated
  USING (moments.can_manage_billing(org_id) OR moments.is_platform_staff());
CREATE POLICY invoices_select_billing ON moments.invoices FOR SELECT TO authenticated
  USING (moments.can_manage_billing(org_id) OR moments.is_platform_staff());
CREATE POLICY invoice_lines_select_billing ON moments.invoice_lines FOR SELECT TO authenticated
  USING (moments.can_manage_billing(org_id) OR moments.is_platform_staff());
CREATE POLICY payments_select_billing ON moments.payments FOR SELECT TO authenticated
  USING (moments.can_manage_billing(org_id) OR moments.is_platform_staff());
-- Customers report a bank transfer themselves; only staff may verify it.
CREATE POLICY payments_insert_billing ON moments.payments FOR INSERT TO authenticated
  WITH CHECK (moments.can_manage_billing(org_id) AND status = 'reported');
CREATE POLICY payments_update_staff ON moments.payments FOR UPDATE TO authenticated
  USING (moments.is_platform_staff()) WITH CHECK (moments.is_platform_staff());
CREATE POLICY wallet_accounts_select_billing ON moments.wallet_accounts FOR SELECT TO authenticated
  USING (moments.can_manage_billing(org_id) OR moments.is_platform_staff());
CREATE POLICY wallet_ledger_select_billing ON moments.wallet_ledger FOR SELECT TO authenticated
  USING (moments.can_manage_billing(org_id) OR moments.is_platform_staff());

-- ==========================================================================
-- 11. Ops-only observability.
-- ==========================================================================
CREATE POLICY job_runs_staff_only     ON moments.job_runs     FOR SELECT TO authenticated
  USING (moments.is_platform_staff());
CREATE POLICY dead_letters_staff_only ON moments.dead_letters FOR SELECT TO authenticated
  USING (moments.is_platform_staff() OR org_id = ANY ((SELECT moments.current_org_ids())::uuid[]));
CREATE POLICY alerts_staff_only       ON moments.alerts       FOR SELECT TO authenticated
  USING (moments.is_platform_staff());

-- rate_limit_buckets: RLS enabled, zero policies. service_role only.

COMMIT;
