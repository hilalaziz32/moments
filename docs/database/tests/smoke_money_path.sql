-- smoke_money_path.sql
-- The revenue path, end to end. Runs in a transaction and ROLLS BACK.
-- vendor -> product -> approval -> order -> delivery -> invoice -> payment

BEGIN;
\set QUIET on
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------- fixtures
INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
  ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hr@acme.pk', now(), now()),
  ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ops@moments.pk', now(), now());

INSERT INTO moments.staff_users (user_id, role) VALUES ('a0000000-0000-0000-0000-000000000002','ops');

INSERT INTO moments.organizations (id, slug, name, status, tax_jurisdiction)
VALUES ('b0000000-0000-0000-0000-000000000001','acme-money','Acme Money Test','active','SRB');
INSERT INTO moments.org_members (org_id, user_id, role)
VALUES ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','owner');
INSERT INTO moments.subscriptions (org_id, plan_id, status, period)
SELECT 'b0000000-0000-0000-0000-000000000001', p.id, 'active', daterange('2026-09-01','2026-10-01')
  FROM moments.plans p WHERE p.code='starter';

INSERT INTO moments.employees (id, org_id, full_name, work_email, date_of_birth, needs_eggless)
VALUES ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
        'Bilal Ahmed','bilal@acme-money.pk','1994-09-28', true);
INSERT INTO moments.addresses (org_id, employee_id, line1, area, landmark, city_id, is_primary, recipient_phone)
SELECT 'b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
       'House 12, Street 4','DHA Phase 6','near Ittehad Park', c.id, true, '+923001234567'
  FROM moments.cities c WHERE c.name='Karachi';

INSERT INTO moments.vendors (id, name, contact_phone, default_lead_days)
VALUES ('d0000000-0000-0000-0000-000000000001','Karachi Bakes','+922134567890', 2);
INSERT INTO moments.vendor_city_coverage (vendor_id, city_id, lead_time_days, delivery_fee_paisa)
SELECT 'd0000000-0000-0000-0000-000000000001', c.id, 1, 25000 FROM moments.cities c WHERE c.name='Karachi';

-- Cost PKR 1,800, sold at PKR 2,200 -> PKR 400 margin.
INSERT INTO moments.gift_products (id, vendor_id, name, category, cost_paisa, list_price_paisa,
                                   is_food, is_halal_certified, is_eggless, suitable_moment_keys)
VALUES ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',
        'Eggless chocolate cake, 1 lb','cake', 180000, 220000, true, true, true, ARRAY['birthday']);
INSERT INTO moments.gift_products (id, vendor_id, name, category, cost_paisa, list_price_paisa, is_digital)
VALUES ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001',
        'Daraz e-voucher PKR 2,000','voucher', 190000, 200000, true);

INSERT INTO moments.moment_events (id, org_id, employee_id, moment_type_id, occurrence_key, occurs_on, status, budget_paisa, approval_required)
SELECT 'f0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000001', mt.id, '2026-09-28', DATE '2026-09-28',
       'awaiting_approval', 250000, true
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='birthday';

INSERT INTO moments.approval_requests (id, org_id, moment_event_id, requested_amount_paisa, budget_paisa,
                                       approver_kind, approver_email, expires_at)
VALUES ('a1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000001', 245000, 250000, 'hr', 'hr@acme.pk',
        now() + interval '2 days');

\set QUIET off

-- ================================================================ 1
\echo ''
\echo '== 0. a tenant still cannot jump a status by editing the row =='
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  UPDATE moments.moment_events SET status = 'approved' WHERE id = 'f0000000-0000-0000-0000-000000000001';
  RAISE WARNING 'FAIL - tenant approved their own moment by editing the row';
EXCEPTION WHEN check_violation THEN RAISE NOTICE '   PASS - direct status edit refused; only the RPC may approve';
END $$;
RESET ROLE;

\echo ''
\echo '== 1. HR approves from the dashboard =='
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT moments.respond_to_approval('a1000000-0000-0000-0000-000000000001','approved','looks good')::text AS result;
RESET ROLE;
SELECT '   moment status = ' || status FROM moments.moment_events WHERE id='f0000000-0000-0000-0000-000000000001';

\echo ''
\echo '== 2. a second click reports the standing decision, not an error =='
SET LOCAL ROLE authenticated;
SELECT moments.respond_to_approval('a1000000-0000-0000-0000-000000000001','rejected')::text AS result;
RESET ROLE;

-- ================================================================ 3
\echo ''
\echo '== 3. place_order creates a snapshotted order in the ops queue =='
SELECT moments.create_gift_order('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001') AS order_id \gset
SELECT '   ' || order_number || ' | ' || status ||
       ' | price PKR ' || (total_price_paisa/100) || ' | cost PKR ' || (total_cost_paisa/100) ||
       ' | MARGIN PKR ' || (margin_paisa/100) ||
       ' | over budget: ' || is_over_budget
  FROM moments.gift_orders WHERE id = :'order_id';
SELECT '   address snapshot: ' || (address_snapshot->>'line1') || ', ' || (address_snapshot->>'area') ||
       ' (' || (address_snapshot->>'landmark') || ')'
  FROM moments.gift_orders WHERE id = :'order_id';
SELECT '   dietary snapshot: eggless=' || (dietary_snapshot->>'eggless')
  FROM moments.gift_orders WHERE id = :'order_id';

-- ================================================================ 4
\echo ''
\echo '== 4. the SNAPSHOT survives the employee moving house =='
UPDATE moments.addresses SET line1 = 'Flat 9, Clifton Block 5'
 WHERE employee_id='c0000000-0000-0000-0000-000000000001';
SELECT CASE WHEN address_snapshot->>'line1' = 'House 12, Street 4'
            THEN '   PASS - order still shows where the cake actually went'
            ELSE '   FAIL - snapshot followed the live address' END
  FROM moments.gift_orders WHERE id = :'order_id';

-- ================================================================ 5
\echo ''
\echo '== 5. a CUSTOMER cannot read our margin, even on their own order =='
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT '   customer sees price PKR ' || (total_price_paisa/100) FROM moments.gift_orders WHERE id = :'order_id';
DO $$ BEGIN
  PERFORM margin_paisa FROM moments.gift_orders LIMIT 1;
  RAISE WARNING 'FAIL - customer read margin_paisa';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '   PASS - margin_paisa is not readable by the customer';
END $$;
DO $$ BEGIN
  PERFORM * FROM moments.ops_order_queue(5);
  RAISE WARNING 'FAIL - customer read the ops queue';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '   PASS - customer cannot open the ops queue';
END $$;
RESET ROLE;

-- ================================================================ 6
\echo ''
\echo '== 6. OPS sees the queue with margin, and must give a reason to cancel =='
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT '   ops queue: ' || order_number || ' for ' || recipient_name || ' in ' || city ||
       ' | margin PKR ' || (margin_paisa/100) || ' | due in ' || days_until_delivery || ' days'
  FROM moments.ops_order_queue(5);
DO $$ BEGIN
  PERFORM moments.ops_update_order((SELECT id FROM moments.gift_orders LIMIT 1), 'cancelled');
  RAISE WARNING 'FAIL - cancelled without a reason';
EXCEPTION WHEN check_violation THEN RAISE NOTICE '   PASS - cancelling without a reason is refused';
END $$;

\echo ''
\echo '== 7. ops places it with the vendor, then marks it delivered =='
SELECT moments.ops_update_order(:'order_id', 'placed_with_vendor', 'KB-4471')::text AS placed;
SELECT moments.ops_update_order(:'order_id', 'delivered')::text AS delivered;
RESET ROLE;
SELECT '   order = ' || o.status || ', moment = ' || m.status
  FROM moments.gift_orders o JOIN moments.moment_events m ON m.id = o.moment_event_id
 WHERE o.id = :'order_id';
SELECT '   audit trail: ' || string_agg(action, ' -> ' ORDER BY id) FROM moments.audit_log
 WHERE entity_id IN (:'order_id'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid);

-- ================================================================ 8
\echo ''
\echo '== 8. month-end invoice: subscription + delivered gift + SRB tax =='
UPDATE moments.gift_orders SET delivered_at = '2026-09-28 12:00+05' WHERE id = :'order_id';
SELECT moments.generate_invoice('b0000000-0000-0000-0000-000000000001','2026-09-01','2026-09-30') AS invoice_id \gset
SELECT '   ' || number || ' | ' || status ||
       ' | subscription PKR ' || (subtotal_subscription_paisa/100) ||
       ' | gifts PKR ' || (subtotal_gifts_paisa/100) ||
       ' | delivery PKR ' || (subtotal_delivery_paisa/100) ||
       ' | tax PKR ' || (tax_paisa/100) ||
       ' | TOTAL PKR ' || (total_paisa/100)
  FROM moments.invoices WHERE id = :'invoice_id';
SELECT '   line: ' || kind || ' | ' || description || ' | PKR ' || (amount_paisa/100)
  FROM moments.invoice_lines WHERE invoice_id = :'invoice_id' ORDER BY kind DESC;

\echo ''
\echo '== 9. re-running the monthly job does NOT double-bill =='
SELECT CASE WHEN moments.generate_invoice('b0000000-0000-0000-0000-000000000001','2026-09-01','2026-09-30') = :'invoice_id'
            THEN '   PASS - same invoice returned' ELSE '   FAIL - second invoice created' END;
SELECT '   invoices for the period: ' || count(*) FROM moments.invoices
 WHERE org_id='b0000000-0000-0000-0000-000000000001' AND period_start='2026-09-01';

-- ================================================================ 10
\echo ''
\echo '== 10. customer pays by bank transfer, withholding s.153 tax =='
INSERT INTO moments.payments (id, org_id, invoice_id, method, amount_paisa, wht_paisa, bank_reference)
SELECT 'a2000000-0000-0000-0000-000000000001', org_id, id, 'bank_transfer',
       total_paisa - 50000, 50000, 'IBFT 88213377'
  FROM moments.invoices WHERE id = :'invoice_id';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SET LOCAL ROLE authenticated;
SELECT moments.verify_payment('a2000000-0000-0000-0000-000000000001', true)::text AS verified;
RESET ROLE;
SELECT '   invoice ' || status || ' | paid PKR ' || (paid_paisa/100) || ' incl. WHT PKR ' || (wht_paisa/100) ||
       CASE WHEN status='paid' THEN '  -> PASS, short-by-WHT still settles' ELSE '  -> FAIL' END
  FROM moments.invoices WHERE id = :'invoice_id';

-- ================================================================ 11
\echo ''
\echo '== 11. DIGITAL BACKUP: no order at all on the morning, so send a digital gift =='
INSERT INTO moments.moment_events (id, org_id, employee_id, moment_type_id, occurrence_key, occurs_on, status, budget_paisa)
SELECT 'f0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000001', mt.id, '2026-12-25', DATE '2026-12-25', 'fulfilling', 250000
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='work_anniversary';
SELECT moments.substitute_digital_gift('f0000000-0000-0000-0000-000000000002')::text AS fallback;
SELECT '   fallback order: ' || status || ', is_fallback=' || is_fallback
  FROM moments.gift_orders WHERE moment_event_id='f0000000-0000-0000-0000-000000000002';

-- ================================================================ 12
\echo ''
\echo '== 12. ops never placed it: the backup cancels the stale order and sends a digital gift =='
INSERT INTO moments.moment_events (id, org_id, employee_id, moment_type_id, occurrence_key, occurs_on, status, budget_paisa)
SELECT 'f0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000001', mt.id, 'test-12', DATE '2026-11-01', 'approved', 250000
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='birthday';
SELECT moments.create_gift_order('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001') IS NOT NULL AS physical_queued;
SELECT moments.substitute_digital_gift('f0000000-0000-0000-0000-000000000003')::text AS fallback;
SELECT '   orders: ' || string_agg(status::text || CASE WHEN is_fallback THEN ' (digital)' ELSE ' (physical)' END, ', ')
  FROM moments.gift_orders WHERE moment_event_id='f0000000-0000-0000-0000-000000000003';
SELECT CASE WHEN count(*) = 1 THEN '   PASS - exactly one live order' ELSE '   FAIL - ' || count(*) || ' live orders' END
  FROM moments.gift_orders WHERE moment_event_id='f0000000-0000-0000-0000-000000000003' AND status <> 'cancelled';

-- ================================================================ 13
\echo ''
\echo '== 13. the vendor already has it: the backup stands down =='
INSERT INTO moments.moment_events (id, org_id, employee_id, moment_type_id, occurrence_key, occurs_on, status, budget_paisa)
SELECT 'f0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000001', mt.id, 'test-13', DATE '2026-11-02', 'approved', 250000
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='birthday';
SELECT moments.create_gift_order('f0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001') IS NOT NULL AS physical_queued;
UPDATE moments.gift_orders SET status = 'placed_with_vendor', placed_at = now()
 WHERE moment_event_id = 'f0000000-0000-0000-0000-000000000004';
SELECT moments.substitute_digital_gift('f0000000-0000-0000-0000-000000000004')::text AS fallback;
SELECT CASE WHEN count(*) = 1 AND bool_and(NOT is_fallback) THEN '   PASS - no double gift' ELSE '   FAIL - sent two gifts' END
  FROM moments.gift_orders WHERE moment_event_id='f0000000-0000-0000-0000-000000000004' AND status <> 'cancelled';

-- ================================================================ 14
\echo ''
\echo '== 14. HR cancels a moment: its pending tasks and queued order stop too =='
INSERT INTO moments.moment_events (id, org_id, employee_id, moment_type_id, occurrence_key, occurs_on, status, budget_paisa)
SELECT 'f0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000001', mt.id, 'test-14', DATE '2026-11-03', 'scheduled', 250000
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='birthday';
SELECT moments.create_gift_order('f0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000001') IS NOT NULL AS physical_queued;
INSERT INTO moments.moment_tasks (org_id, moment_event_id, task_type, lane, scheduled_for, next_attempt_at)
VALUES ('b0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000005','announce','announce',
        now() + interval '1 day', now() + interval '1 day');
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL ROLE authenticated;
UPDATE moments.moment_events SET status = 'cancelled', cancelled_at = now(), cancel_reason = 'left the company'
 WHERE id = 'f0000000-0000-0000-0000-000000000005';
RESET ROLE;
SELECT '   task = ' || (SELECT status::text FROM moments.moment_tasks WHERE moment_event_id='f0000000-0000-0000-0000-000000000005') ||
       ', order = ' || (SELECT status::text FROM moments.gift_orders WHERE moment_event_id='f0000000-0000-0000-0000-000000000005') ||
       CASE WHEN (SELECT status FROM moments.moment_tasks WHERE moment_event_id='f0000000-0000-0000-0000-000000000005') = 'cancelled'
             AND (SELECT status FROM moments.gift_orders WHERE moment_event_id='f0000000-0000-0000-0000-000000000005') = 'cancelled'
            THEN '   -> PASS' ELSE '   -> FAIL' END;

-- ================================================================ 15
\echo ''
\echo '== 15. a payment cannot point at another organisation''s invoice =='
INSERT INTO moments.organizations (id, slug, name, status)
VALUES ('b0000000-0000-0000-0000-000000000002','other-co','Other Co','active');
DO $$ BEGIN
  INSERT INTO moments.payments (org_id, invoice_id, amount_paisa, bank_reference)
  SELECT 'b0000000-0000-0000-0000-000000000002', id, 100, 'forged'
    FROM moments.invoices WHERE org_id = 'b0000000-0000-0000-0000-000000000001' LIMIT 1;
  RAISE WARNING 'FAIL - a payment was attached to another organisation''s invoice';
EXCEPTION WHEN check_violation THEN RAISE NOTICE '   PASS - cross-organisation payment refused';
END $$;

\echo ''
\echo '== 16. an address cannot be attached to another organisation''s employee =='
DO $$ BEGIN
  INSERT INTO moments.addresses (org_id, employee_id, line1, city_text, is_primary)
  VALUES ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
          'Attacker Street 1', 'Lahore', false);
  RAISE WARNING 'FAIL - address attached to another organisation''s employee';
EXCEPTION WHEN check_violation THEN RAISE NOTICE '   PASS - cross-organisation address refused';
END $$;

ROLLBACK;
