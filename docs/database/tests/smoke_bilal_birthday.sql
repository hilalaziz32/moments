-- smoke_bilal_birthday.sql
-- End-to-end engine smoke test. Runs in a transaction and ROLLS BACK.
-- Models the worked example: Bilal's birthday is 28 September.

BEGIN;

\set QUIET on
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------- fixtures
INSERT INTO moments.organizations (id, slug, name, status, timezone)
VALUES ('11111111-1111-1111-1111-111111111111','acme-pk','Acme Pakistan','active','Asia/Karachi');

INSERT INTO moments.employees
  (id, org_id, full_name, work_email, phone_e164, date_of_birth, hire_date, department, status)
VALUES ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'Bilal Ahmed','bilal@acme.pk','+923001234567',
        DATE '1994-09-28', DATE '2023-04-01','Engineering','active');

INSERT INTO moments.addresses
  (org_id, employee_id, line1, area, landmark, city_id, is_primary)
SELECT '11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222',
       'House 12, Street 4','DHA Phase 6','near Ittehad Park',
       c.id, true
  FROM moments.cities c WHERE c.name='Karachi';

INSERT INTO moments.moment_policies
  (org_id, moment_type_id, budget_paisa, approval_required, announcement_channels)
SELECT '11111111-1111-1111-1111-111111111111', mt.id, mt.default_budget_paisa, true,
       ARRAY['email','slack']::moments.channel[]
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='birthday';

\set QUIET off

-- ================================================================ TEST 1
\echo ''
\echo '== TEST 1: detector materialises the moment, announce_at = 09:00 PKT =='
INSERT INTO moments.moment_events
  (org_id, employee_id, moment_type_id, occurrence_key, occurs_on, timezone,
   announce_local_time, status, budget_paisa, approval_required, policy_snapshot)
SELECT '11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222',
       mt.id, '2026-09-28', DATE '2026-09-28','Asia/Karachi','09:00',
       'scheduled', 250000, true,
       jsonb_build_object('budget_paisa',250000,'source','test')
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='birthday'
ON CONFLICT DO NOTHING;

SELECT occurs_on,
       announce_at,
       announce_at AT TIME ZONE 'Asia/Karachi' AS local_wall_clock,
       (budget_paisa/100) || ' PKR' AS budget,
       CASE WHEN announce_at = TIMESTAMPTZ '2026-09-28 04:00:00+00'
            THEN 'PASS' ELSE 'FAIL' END AS announce_at_correct
  FROM moments.moment_events;

-- ================================================================ TEST 2
\echo ''
\echo '== TEST 2: IDEMPOTENCY -- detector re-run must NOT duplicate =='
INSERT INTO moments.moment_events
  (org_id, employee_id, moment_type_id, occurrence_key, occurs_on, timezone,
   announce_local_time, status, budget_paisa)
SELECT '11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222',
       mt.id, '2026-09-28', DATE '2026-09-28','Asia/Karachi','09:00','scheduled',250000
  FROM moments.moment_types mt WHERE mt.org_id IS NULL AND mt.key='birthday'
ON CONFLICT DO NOTHING;

SELECT count(*) AS event_count,
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL - DUPLICATE' END AS verdict
  FROM moments.moment_events;

-- ================================================================ TEST 3
\echo ''
\echo '== TEST 3: fan out the T-7 / T-4 / T-2 / T-0 pipeline =='
INSERT INTO moments.moment_tasks
  (org_id, moment_event_id, task_type, lane, scheduled_for, next_attempt_at,
   late_threshold_seconds)
SELECT e.org_id, e.id, x.task_type, x.lane,
       moments.local_instant(e.occurs_on - x.offset_days, x.at_time, e.timezone),
       moments.local_instant(e.occurs_on - x.offset_days, x.at_time, e.timezone),
       x.late_secs
  FROM moments.moment_events e
 CROSS JOIN (VALUES
   ('verify_details_send'::moments.task_type,  7, TIME '10:00','default'::moments.task_lane,3600),
   ('select_gift',                             4, TIME '10:00','default',3600),
   ('request_approval',                        2, TIME '10:00','default',3600),
   ('place_order',                             2, TIME '14:00','default',3600),
   ('prepare_announcement',                    1, TIME '18:00','default',3600),
   ('announce',                                0, TIME '09:00','announce', 300),
   ('nudge_manager',                           0, TIME '09:05','announce', 300),
   ('close_moment',                           -2, TIME '10:00','slow',   86400)
 ) AS x(task_type, offset_days, at_time, lane, late_secs)
ON CONFLICT (moment_event_id, task_type) DO UPDATE SET scheduled_for = EXCLUDED.scheduled_for;

SELECT task_type, lane,
       (scheduled_for AT TIME ZONE 'Asia/Karachi')::text AS fires_at_pkt
  FROM moments.moment_tasks ORDER BY scheduled_for;

-- ================================================================ TEST 4
\echo ''
\echo '== TEST 4: re-running the fan-out must NOT duplicate tasks =='
INSERT INTO moments.moment_tasks
  (org_id, moment_event_id, task_type, lane, scheduled_for, next_attempt_at)
SELECT e.org_id, e.id, 'announce', 'announce',
       moments.local_instant(e.occurs_on, TIME '09:00', e.timezone),
       moments.local_instant(e.occurs_on, TIME '09:00', e.timezone)
  FROM moments.moment_events e
ON CONFLICT (moment_event_id, task_type) DO NOTHING;

SELECT count(*) AS task_count,
       CASE WHEN count(*) = 8 THEN 'PASS' ELSE 'FAIL' END AS verdict
  FROM moments.moment_tasks;

-- ================================================================ TEST 5
\echo ''
\echo '== TEST 5: claim_due_tasks leases only DUE tasks in the right lane =='
-- Nothing is due yet (all 2026 dates), so claiming must return zero rows.
SELECT count(*) AS claimed_when_nothing_due,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS verdict
  FROM moments.claim_due_tasks('announce', 10, 60, 'worker-test-1');

-- Backdate the announce task so it becomes due.
UPDATE moments.moment_tasks
   SET scheduled_for = now() - INTERVAL '1 minute',
       next_attempt_at = now() - INTERVAL '1 minute'
 WHERE task_type = 'announce';

SELECT task_type, status, attempts, locked_by,
       CASE WHEN status='running' AND attempts=1 AND locked_by='worker-a'
            THEN 'PASS' ELSE 'FAIL' END AS verdict
  FROM moments.claim_due_tasks('announce', 10, 60, 'worker-a');

-- ================================================================ TEST 6
\echo ''
\echo '== TEST 6: a second worker must NOT re-claim a leased task =='
SELECT count(*) AS second_worker_claimed,
       CASE WHEN count(*) = 0 THEN 'PASS - no double send' ELSE 'FAIL - DUPLICATE SEND' END AS verdict
  FROM moments.claim_due_tasks('announce', 10, 60, 'worker-b');

-- ================================================================ TEST 7
\echo ''
\echo '== TEST 7: a zombie worker cannot complete a task it no longer owns =='
SELECT moments.complete_task(
         (SELECT id FROM moments.moment_tasks WHERE task_type='announce'),
         'worker-b', '{}'::jsonb) AS zombie_accepted,
       CASE WHEN moments.complete_task(
              (SELECT id FROM moments.moment_tasks WHERE task_type='announce'),
              'worker-b','{}'::jsonb) = false
            THEN 'PASS' ELSE 'FAIL' END AS verdict;

\echo ''
\echo '== TEST 7b: the real lease holder CAN complete it =='
SELECT moments.complete_task(
         (SELECT id FROM moments.moment_tasks WHERE task_type='announce'),
         'worker-a', '{"sent": true}'::jsonb) AS accepted,
       (SELECT status::text FROM moments.moment_tasks WHERE task_type='announce') AS final_status;

-- ================================================================ TEST 8
\echo ''
\echo '== TEST 8: outbox idempotency key blocks a duplicate 09:00 announcement =='
INSERT INTO moments.outbound_messages
  (org_id, moment_event_id, channel, audience, idempotency_key, recipient_ref, rendered_body)
SELECT e.org_id, e.id, 'slack','company_announcement',
       encode(moments.hash_token(e.id::text || ':announce:slack:#general'),'hex'),
       '#general','Happy birthday Bilal!'
  FROM moments.moment_events e;

INSERT INTO moments.outbound_messages
  (org_id, moment_event_id, channel, audience, idempotency_key, recipient_ref, rendered_body)
SELECT e.org_id, e.id, 'slack','company_announcement',
       encode(moments.hash_token(e.id::text || ':announce:slack:#general'),'hex'),
       '#general','Happy birthday Bilal! (duplicate attempt)'
  FROM moments.moment_events e
ON CONFLICT (idempotency_key) DO NOTHING;

SELECT count(*) AS message_count,
       CASE WHEN count(*) = 1 THEN 'PASS - one announcement' ELSE 'FAIL - DUPLICATE' END AS verdict
  FROM moments.outbound_messages;

-- ================================================================ TEST 9
\echo ''
\echo '== TEST 9: the PKR-100 money floor catches rupees-vs-paisa =='
DO $$
BEGIN
  BEGIN
    UPDATE moments.moment_events SET budget_paisa = 2500;  -- rupees by mistake
    RAISE WARNING 'FAIL - the floor did not catch it';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS - rejected budget_paisa=2500 (would be PKR 25)';
  END;
END $$;

-- ================================================================ TEST 10
\echo ''
\echo '== TEST 10: fail_task requeues a retryable error and dead-letters a permanent one =='
UPDATE moments.moment_tasks
   SET status = 'pending', attempts = 0, locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
       next_attempt_at = now() - interval '1 minute'
 WHERE task_type = 'select_gift';
SELECT count(*) AS claimed FROM moments.claim_due_tasks('default', 1, 60, 'worker-f');
SELECT moments.fail_task((SELECT id FROM moments.moment_tasks WHERE task_type = 'select_gift'),
                         'worker-f', 'retryable', 'vendor timeout', now() + interval '1 minute') AS recorded;
SELECT status::text AS after_retryable,
       CASE WHEN status = 'pending' THEN 'PASS - back in the queue' ELSE 'FAIL' END AS verdict
  FROM moments.moment_tasks WHERE task_type = 'select_gift';

UPDATE moments.moment_tasks SET next_attempt_at = now() - interval '1 minute' WHERE task_type = 'select_gift';
SELECT count(*) AS claimed_again FROM moments.claim_due_tasks('default', 1, 60, 'worker-f');
SELECT moments.fail_task((SELECT id FROM moments.moment_tasks WHERE task_type = 'select_gift'),
                         'worker-f', 'permanent', 'employee has no email') AS recorded;
SELECT status::text AS after_permanent,
       (SELECT count(*) FROM moments.dead_letters) AS dead_letters,
       CASE WHEN status = 'dead' AND (SELECT count(*) FROM moments.dead_letters) = 1
            THEN 'PASS - dead-lettered, no retry' ELSE 'FAIL' END AS verdict
  FROM moments.moment_tasks WHERE task_type = 'select_gift';

ROLLBACK;
