-- 00016_rpc_task_queue.sql
-- The task queue RPCs. The correctness of the whole product rests on this file.
--
-- These exist because PostgREST cannot express FOR UPDATE SKIP LOCKED. The worker
-- calls them with the service-role client via supabase.rpc(...).
--
-- All are SECURITY DEFINER, SET search_path = '', and granted to service_role ONLY.

BEGIN;

-- --------------------------------------------------------------------------
-- claim_due_tasks -- the poller's entry point.
--
-- Note `attempts = attempts + 1` AT CLAIM TIME, not at completion. This is the
-- key design choice for poison-task handling: a task that crashes the worker
-- process still burns an attempt, so it cannot crash-loop forever.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.claim_due_tasks(
  p_lane          moments.task_lane,
  p_limit         int,
  p_lease_seconds int,
  p_worker_id     text
)
RETURNS SETOF moments.moment_tasks
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE moments.moment_tasks t
     SET status           = 'running',
         attempts         = t.attempts + 1,
         locked_by        = p_worker_id,
         locked_at        = pg_catalog.now(),
         lease_expires_at = pg_catalog.now()
                            + pg_catalog.make_interval(secs => p_lease_seconds),
         started_at       = COALESCE(t.started_at, pg_catalog.now()),
         updated_at       = pg_catalog.now()
    FROM (
      SELECT d.id
        FROM moments.moment_tasks d
       WHERE d.status = 'pending'
         AND d.lane   = p_lane
         AND d.next_attempt_at <= pg_catalog.now()
       ORDER BY d.priority, d.next_attempt_at, d.id
       LIMIT p_limit
       FOR UPDATE SKIP LOCKED
    ) due
   WHERE t.id = due.id
  RETURNING t.*;
$$;

COMMENT ON FUNCTION moments.claim_due_tasks(moments.task_lane, int, int, text) IS
  'Atomically leases up to p_limit due tasks in one lane. FOR UPDATE SKIP LOCKED '
  'makes concurrent pollers safe. ORDER BY matches moment_tasks_due_idx exactly.';

-- --------------------------------------------------------------------------
-- complete_task / fail_task / skip_task
--
-- Each asserts locked_by = p_worker_id, so a ZOMBIE WORKER whose lease already
-- expired and whose task was re-claimed by someone else cannot overwrite the
-- successful re-run.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.complete_task(
  p_task_id uuid, p_worker_id text, p_result jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_rows int;
BEGIN
  UPDATE moments.moment_tasks
     SET status = 'succeeded', result = p_result,
         finished_at = pg_catalog.now(),
         locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
         updated_at = pg_catalog.now()
   WHERE id = p_task_id AND status = 'running' AND locked_by = p_worker_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END $$;

CREATE OR REPLACE FUNCTION moments.fail_task(
  p_task_id         uuid,
  p_worker_id       text,
  p_error_class     text,
  p_error           text,
  p_next_attempt_at timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task   moments.moment_tasks;
  v_is_dead boolean;
BEGIN
  SELECT * INTO v_task
    FROM moments.moment_tasks
   WHERE id = p_task_id AND status = 'running' AND locked_by = p_worker_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;   -- lease lost; someone else owns this task now
  END IF;

  -- Permanent errors and exhausted budgets go straight to dead. No retry.
  v_is_dead := (p_error_class = 'permanent')
               OR (v_task.attempts >= v_task.max_attempts)
               OR (p_next_attempt_at IS NULL);

  UPDATE moments.moment_tasks
     SET status          = (CASE WHEN v_is_dead THEN 'dead' ELSE 'pending' END)::moments.task_status,
         next_attempt_at = CASE WHEN v_is_dead THEN next_attempt_at
                                ELSE p_next_attempt_at END,
         last_error      = p_error,
         error_class     = p_error_class,
         last_error_at   = pg_catalog.now(),
         finished_at     = CASE WHEN v_is_dead THEN pg_catalog.now() ELSE NULL END,
         locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
         updated_at = pg_catalog.now()
   WHERE id = p_task_id;

  IF v_is_dead THEN
    INSERT INTO moments.dead_letters
      (task_id, org_id, task_type, moment_event_id, payload, errors)
    VALUES (v_task.id, v_task.org_id, v_task.task_type, v_task.moment_event_id,
            v_task.payload,
            pg_catalog.jsonb_build_array(
              pg_catalog.jsonb_build_object('class', p_error_class, 'error', p_error,
                                            'attempt', v_task.attempts)));
  END IF;

  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION moments.skip_task(
  p_task_id uuid, p_worker_id text, p_reason text
)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_rows int;
BEGIN
  UPDATE moments.moment_tasks
     SET status = 'skipped',
         result = pg_catalog.jsonb_build_object('reason', p_reason),
         finished_at = pg_catalog.now(),
         locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
         updated_at = pg_catalog.now()
   WHERE id = p_task_id AND status = 'running' AND locked_by = p_worker_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END $$;

-- --------------------------------------------------------------------------
-- reap_expired_leases -- recovers tasks whose worker died mid-flight.
--
-- Tasks that have already exhausted max_attempts go STRAIGHT TO DEAD, never back
-- to pending. That is the quarantine that stops a process-killing task from
-- looping forever.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.reap_expired_leases(p_grace_seconds int DEFAULT 30)
RETURNS TABLE (requeued int, quarantined int)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requeued    int := 0;
  v_quarantined int := 0;
BEGIN
  WITH expired AS (
    SELECT id, attempts, max_attempts
      FROM moments.moment_tasks
     WHERE status = 'running'
       AND lease_expires_at < pg_catalog.now()
                              - pg_catalog.make_interval(secs => p_grace_seconds)
     FOR UPDATE SKIP LOCKED
  ),
  dead AS (
    UPDATE moments.moment_tasks t
       SET status = 'dead', finished_at = pg_catalog.now(),
           last_error = 'lease expired; attempts exhausted',
           error_class = 'lease_expired',
           locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
           updated_at = pg_catalog.now()
      FROM expired e
     WHERE t.id = e.id AND e.attempts >= e.max_attempts
    RETURNING t.id
  ),
  requeue AS (
    UPDATE moments.moment_tasks t
       SET status = 'pending',
           -- Exponential backoff with the attempt already burned at claim time.
           next_attempt_at = pg_catalog.now()
             + pg_catalog.make_interval(
                 secs => LEAST(60 * POWER(3, GREATEST(t.attempts - 1, 0)), 14400)),
           last_error = 'lease expired; worker presumed dead',
           error_class = 'lease_expired',
           locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
           updated_at = pg_catalog.now()
      FROM expired e
     WHERE t.id = e.id AND e.attempts < e.max_attempts
    RETURNING t.id
  )
  SELECT (SELECT pg_catalog.count(*) FROM requeue),
         (SELECT pg_catalog.count(*) FROM dead)
    INTO v_requeued, v_quarantined;

  RETURN QUERY SELECT v_requeued, v_quarantined;
END $$;

-- --------------------------------------------------------------------------
-- requeue_task -- the one-button replay from /ops.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.requeue_task(p_task_id uuid, p_actor uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_rows int;
BEGIN
  UPDATE moments.moment_tasks
     SET status = 'pending', attempts = 0,
         next_attempt_at = pg_catalog.now(),
         last_error = NULL, error_class = NULL, finished_at = NULL,
         locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
         updated_at = pg_catalog.now()
   WHERE id = p_task_id AND status IN ('failed','dead','skipped');
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 1 THEN
    UPDATE moments.dead_letters
       SET replayed_at = pg_catalog.now(), replayed_by = p_actor
     WHERE task_id = p_task_id AND replayed_at IS NULL;
  END IF;
  RETURN v_rows = 1;
END $$;

-- --------------------------------------------------------------------------
-- Grants: service_role only. Never anon, never authenticated.
-- --------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  moments.claim_due_tasks(moments.task_lane, int, int, text),
  moments.complete_task(uuid, text, jsonb),
  moments.fail_task(uuid, text, text, text, timestamptz),
  moments.skip_task(uuid, text, text),
  moments.reap_expired_leases(int),
  moments.requeue_task(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  moments.claim_due_tasks(moments.task_lane, int, int, text),
  moments.complete_task(uuid, text, jsonb),
  moments.fail_task(uuid, text, text, text, timestamptz),
  moments.skip_task(uuid, text, text),
  moments.reap_expired_leases(int),
  moments.requeue_task(uuid, uuid)
TO service_role;

COMMIT;
