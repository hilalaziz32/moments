--
-- PostgreSQL database dump
--

\restrict dJFr1haR9r0tnS1Tp3BIsCkteycGrWXfdLGRRYva3pS9DBXt96Gm24ddD1oTGca

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: moments; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA moments;


--
-- Name: SCHEMA moments; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA moments IS 'Moments — Employee Celebration Autopilot. Tenant-isolated via RLS. Do not place objects in public; public belongs to an unrelated application.';


--
-- Name: actor_kind; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.actor_kind AS ENUM (
    'user',
    'staff',
    'system',
    'anon_token',
    'service'
);


--
-- Name: address_kind; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.address_kind AS ENUM (
    'home',
    'office',
    'other'
);


--
-- Name: address_verification_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.address_verification_status AS ENUM (
    'unverified',
    'link_sent',
    'employee_confirmed',
    'hr_confirmed',
    'employee_updated',
    'undeliverable',
    'stale'
);


--
-- Name: alert_severity; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.alert_severity AS ENUM (
    'p1',
    'p2',
    'p3'
);


--
-- Name: alert_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.alert_status AS ENUM (
    'open',
    'acknowledged',
    'resolved'
);


--
-- Name: approval_decision; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.approval_decision AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired',
    'auto_approved',
    'cancelled'
);


--
-- Name: approver_kind; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.approver_kind AS ENUM (
    'hr',
    'manager',
    'finance',
    'owner'
);


--
-- Name: channel; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.channel AS ENUM (
    'email',
    'whatsapp',
    'slack',
    'in_app'
);


--
-- Name: delivery_target; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.delivery_target AS ENUM (
    'home',
    'office',
    'none',
    'employee_choice'
);


--
-- Name: employee_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.employee_status AS ENUM (
    'active',
    'on_leave',
    'notice_period',
    'exited'
);


--
-- Name: import_batch_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.import_batch_status AS ENUM (
    'uploaded',
    'validating',
    'validated',
    'importing',
    'completed',
    'completed_with_errors',
    'failed',
    'reverted'
);


--
-- Name: import_row_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.import_row_status AS ENUM (
    'pending',
    'valid',
    'invalid',
    'imported',
    'updated',
    'skipped',
    'duplicate'
);


--
-- Name: integration_provider; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.integration_provider AS ENUM (
    'slack',
    'whatsapp_cloud',
    'email_resend',
    'email_smtp',
    'webhook'
);


--
-- Name: integration_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.integration_status AS ENUM (
    'pending',
    'connected',
    'error',
    'revoked',
    'disconnected'
);


--
-- Name: invoice_kind; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.invoice_kind AS ENUM (
    'subscription',
    'gifts',
    'combined',
    'credit_note',
    'wallet_topup'
);


--
-- Name: invoice_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.invoice_status AS ENUM (
    'draft',
    'issued',
    'sent',
    'partially_paid',
    'paid',
    'overdue',
    'void',
    'written_off'
);


--
-- Name: membership_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.membership_status AS ENUM (
    'active',
    'invited',
    'suspended',
    'removed'
);


--
-- Name: message_audience; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.message_audience AS ENUM (
    'company_announcement',
    'manager_nudge',
    'employee_dm',
    'hr_digest',
    'approval_request',
    'address_verification',
    'ops_alert'
);


--
-- Name: message_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.message_status AS ENUM (
    'queued',
    'sending',
    'sent',
    'delivered',
    'read',
    'failed',
    'cancelled',
    'suppressed'
);


--
-- Name: moment_category; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.moment_category AS ENUM (
    'personal',
    'work',
    'religious',
    'company',
    'custom'
);


--
-- Name: moment_date_source; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.moment_date_source AS ENUM (
    'employee_date_field',
    'employee_event',
    'observance_calendar',
    'manual',
    'recurring_monthly'
);


--
-- Name: moment_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.moment_status AS ENUM (
    'detected',
    'scheduled',
    'needs_info',
    'awaiting_approval',
    'approved',
    'rejected',
    'fulfilling',
    'delivered',
    'announced',
    'completed',
    'skipped',
    'cancelled',
    'failed'
);


--
-- Name: observance_key; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.observance_key AS ENUM (
    'ramadan_start',
    'ramadan_end',
    'eid_ul_fitr',
    'eid_ul_adha',
    'ashura',
    'eid_milad_un_nabi'
);


--
-- Name: observance_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.observance_status AS ENUM (
    'predicted',
    'confirmed',
    'cancelled'
);


--
-- Name: order_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.order_status AS ENUM (
    'draft',
    'pending_selection',
    'awaiting_approval',
    'approved',
    'queued_for_ops',
    'placed_with_vendor',
    'in_transit',
    'delivered',
    'failed',
    'cancelled',
    'returned'
);


--
-- Name: org_role; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.org_role AS ENUM (
    'owner',
    'admin',
    'hr_manager',
    'finance',
    'manager',
    'viewer'
);


--
-- Name: org_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.org_status AS ENUM (
    'trial',
    'active',
    'past_due',
    'suspended',
    'churned'
);


--
-- Name: payment_method; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.payment_method AS ENUM (
    'bank_transfer',
    'ibft',
    'cheque',
    'cash',
    'card',
    'wallet',
    'adjustment',
    'write_off'
);


--
-- Name: payment_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.payment_status AS ENUM (
    'reported',
    'under_review',
    'verified',
    'rejected',
    'refunded'
);


--
-- Name: product_category; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.product_category AS ENUM (
    'cake',
    'flowers',
    'chocolate',
    'hamper',
    'voucher',
    'electronics',
    'apparel',
    'book',
    'toy',
    'plant',
    'card',
    'custom'
);


--
-- Name: proof_kind; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.proof_kind AS ENUM (
    'photo',
    'signature',
    'otp',
    'courier_ref',
    'recipient_reply'
);


--
-- Name: response_channel; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.response_channel AS ENUM (
    'link',
    'dashboard',
    'slack_action',
    'whatsapp_reply',
    'email_reply',
    'auto',
    'api'
);


--
-- Name: staff_role; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.staff_role AS ENUM (
    'platform_admin',
    'ops',
    'support',
    'finance'
);


--
-- Name: subscription_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'paused',
    'cancelled'
);


--
-- Name: task_lane; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.task_lane AS ENUM (
    'announce',
    'default',
    'slow'
);


--
-- Name: task_status; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.task_status AS ENUM (
    'pending',
    'running',
    'succeeded',
    'failed',
    'cancelled',
    'skipped',
    'dead'
);


--
-- Name: task_type; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.task_type AS ENUM (
    'verify_details_send',
    'verify_details_remind',
    'verify_details_finalize',
    'select_gift',
    'request_approval',
    'approval_remind',
    'approval_auto_decide',
    'place_order',
    'order_chase',
    'order_fallback',
    'prepare_announcement',
    'announce',
    'deliver_message',
    'nudge_manager',
    'confirm_delivery',
    'collect_feedback',
    'close_moment',
    'reschedule_anchor',
    'sync_slack_users',
    'sync_whatsapp_templates',
    'data_hygiene_digest',
    'billing_usage_rollup',
    'billing_generate_invoice',
    'billing_send_invoice',
    'billing_payment_reminder',
    'wallet_low_balance_alert',
    'integration_health_check'
);


--
-- Name: token_purpose; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.token_purpose AS ENUM (
    'address_verification',
    'approval',
    'invitation',
    'employee_optout',
    'magic_view',
    'feedback'
);


--
-- Name: wallet_direction; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.wallet_direction AS ENUM (
    'credit',
    'debit'
);


--
-- Name: wallet_reason; Type: TYPE; Schema: moments; Owner: -
--

CREATE TYPE moments.wallet_reason AS ENUM (
    'topup',
    'gift_charge',
    'delivery_fee',
    'subscription_charge',
    'refund',
    'adjustment',
    'reversal'
);


--
-- Name: can_manage_billing(uuid); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.can_manage_billing(p_org uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT moments.has_org_role(p_org, ARRAY['owner','admin','finance']::moments.org_role[]);
$$;


--
-- Name: can_manage_people(uuid); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.can_manage_people(p_org uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT moments.has_org_role(p_org, ARRAY['owner','admin','hr_manager']::moments.org_role[]);
$$;


--
-- Name: check_rate_limit(text, integer, integer); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_window timestamptz;
  v_count  int;
BEGIN
  -- date_part, not EXTRACT(x FROM y): the latter is SQL syntax and cannot be
  -- schema-qualified, which SET search_path = '' requires.
  v_window := pg_catalog.to_timestamp(
    pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.now()) / p_window_seconds)
      * p_window_seconds);

  INSERT INTO moments.rate_limit_buckets (bucket_key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET count = moments.rate_limit_buckets.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END $$;


--
-- Name: FUNCTION check_rate_limit(p_key text, p_limit integer, p_window_seconds integer); Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON FUNCTION moments.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer) IS 'Sliding-window rate limit. Returns true if the call is allowed. Callers: tok:ip 30/5min, tok:miss:<ip> 10/10min, tok:sub:<tokenId> 20/hour, tok:org:<id> 500/hour.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: moment_tasks; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.moment_tasks (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    moment_event_id uuid NOT NULL,
    task_type moments.task_type NOT NULL,
    lane moments.task_lane DEFAULT 'default'::moments.task_lane NOT NULL,
    status moments.task_status DEFAULT 'pending'::moments.task_status NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    next_attempt_at timestamp with time zone NOT NULL,
    priority smallint DEFAULT 100 NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    late_threshold_seconds integer DEFAULT 3600 NOT NULL,
    locked_by text,
    locked_at timestamp with time zone,
    lease_expires_at timestamp with time zone,
    last_error text,
    error_class text,
    last_error_at timestamp with time zone,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    result jsonb,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moment_tasks_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT moment_tasks_late_threshold_seconds_check CHECK ((late_threshold_seconds > 0)),
    CONSTRAINT moment_tasks_max_attempts_check CHECK (((max_attempts >= 1) AND (max_attempts <= 50))),
    CONSTRAINT moment_tasks_priority_check CHECK (((priority >= 0) AND (priority <= 1000))),
    CONSTRAINT moment_tasks_running_has_lease CHECK (((status <> 'running'::moments.task_status) OR ((locked_by IS NOT NULL) AND (lease_expires_at IS NOT NULL))))
)
WITH (fillfactor='80', autovacuum_vacuum_scale_factor='0.02', autovacuum_analyze_scale_factor='0.01');


--
-- Name: claim_due_tasks(moments.task_lane, integer, integer, text); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.claim_due_tasks(p_lane moments.task_lane, p_limit integer, p_lease_seconds integer, p_worker_id text) RETURNS SETOF moments.moment_tasks
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION claim_due_tasks(p_lane moments.task_lane, p_limit integer, p_lease_seconds integer, p_worker_id text); Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON FUNCTION moments.claim_due_tasks(p_lane moments.task_lane, p_limit integer, p_lease_seconds integer, p_worker_id text) IS 'Atomically leases up to p_limit due tasks in one lane. FOR UPDATE SKIP LOCKED makes concurrent pollers safe. ORDER BY matches moment_tasks_due_idx exactly.';


--
-- Name: complete_task(uuid, text, jsonb); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.complete_task(p_task_id uuid, p_worker_id text, p_result jsonb DEFAULT '{}'::jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: current_employee_id(uuid); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.current_employee_id(p_org uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT e.id
  FROM moments.employees e
  WHERE e.org_id = p_org
    AND e.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;


--
-- Name: current_org_ids(); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.current_org_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT COALESCE(pg_catalog.array_agg(m.org_id), '{}'::uuid[])
  FROM moments.org_members m
  WHERE m.user_id = (SELECT auth.uid())
    AND m.status = 'active';
$$;


--
-- Name: fail_task(uuid, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.fail_task(p_task_id uuid, p_worker_id text, p_error_class text, p_error text, p_next_attempt_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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
     SET status          = CASE WHEN v_is_dead THEN 'dead' ELSE 'pending' END,
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


--
-- Name: guard_moment_event_status(); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.guard_moment_event_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  -- service_role and our own staff bypass this guard; it exists to constrain
  -- tenant-initiated edits arriving through PostgREST.
  IF (SELECT auth.uid()) IS NULL OR moments.is_platform_staff() THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'scheduled' AND NEW.status = 'skipped')
      OR NEW.status = 'cancelled'
    ) THEN
      RAISE EXCEPTION
        'moment_events: tenants may only skip a scheduled moment or cancel one (tried % -> %)',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: handle_new_auth_user(); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.handle_new_auth_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: has_org_role(uuid, moments.org_role[]); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.has_org_role(p_org uuid, p_roles moments.org_role[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM moments.org_members m
    WHERE m.org_id = p_org
      AND m.user_id = (SELECT auth.uid())
      AND m.status  = 'active'
      AND m.role    = ANY (p_roles)
  );
$$;


--
-- Name: hash_token(text); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.hash_token(p_token text) RETURNS bytea
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT extensions.digest(p_token, 'sha256');
$$;


--
-- Name: is_org_admin(uuid); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.is_org_admin(p_org uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT moments.has_org_role(p_org, ARRAY['owner','admin']::moments.org_role[]);
$$;


--
-- Name: is_org_member(uuid); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.is_org_member(p_org uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT p_org = ANY (moments.current_org_ids());
$$;


--
-- Name: is_platform_staff(moments.staff_role[]); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.is_platform_staff(p_roles moments.staff_role[] DEFAULT NULL::moments.staff_role[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM moments.staff_users s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.is_active
      AND (p_roles IS NULL OR s.role = ANY (p_roles))
  );
$$;


--
-- Name: local_instant(date, time without time zone, text); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.local_instant(p_on date, p_at time without time zone, p_tz text) RETURNS timestamp with time zone
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT (p_on + p_at) AT TIME ZONE p_tz;
$$;


--
-- Name: FUNCTION local_instant(p_on date, p_at time without time zone, p_tz text); Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON FUNCTION moments.local_instant(p_on date, p_at time without time zone, p_tz text) IS 'Converts a local calendar date + wall-clock time in an IANA timezone to an instant.';


--
-- Name: log_order_status_change(); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.log_order_status_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO moments.gift_order_status_history (order_id, org_id, from_status, to_status)
    VALUES (NEW.id, NEW.org_id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
            NEW.status);
  END IF;
  RETURN NEW;
END $$;


--
-- Name: normalize_email(text); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.normalize_email(p text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT NULLIF(pg_catalog.lower(pg_catalog.btrim(p)), '');
$$;


--
-- Name: reap_expired_leases(integer); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.reap_expired_leases(p_grace_seconds integer DEFAULT 30) RETURNS TABLE(requeued integer, quarantined integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: requeue_task(uuid, uuid); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.requeue_task(p_task_id uuid, p_actor uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: resolve_budget(uuid, uuid, integer); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.resolve_budget(p_org uuid, p_moment_type_id uuid, p_years integer DEFAULT NULL::integer) RETURNS bigint
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT COALESCE(
    (SELECT t.budget_paisa
       FROM moments.milestone_tiers t
      WHERE t.org_id = p_org
        AND t.moment_type_id = p_moment_type_id
        AND t.is_active
        AND p_years IS NOT NULL
        AND t.years_range @> p_years
      LIMIT 1),
    (SELECT p.budget_paisa
       FROM moments.moment_policies p
      WHERE p.org_id = p_org AND p.moment_type_id = p_moment_type_id),
    (SELECT mt.default_budget_paisa
       FROM moments.moment_types mt
      WHERE mt.id = p_moment_type_id),
    0::bigint
  );
$$;


--
-- Name: set_address_verification_expiry(); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.set_address_verification_expiry() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.verification_expires_at :=
    CASE WHEN NEW.verified_at IS NULL THEN NULL
         ELSE NEW.verified_at + INTERVAL '180 days' END;
  RETURN NEW;
END $$;


--
-- Name: set_moment_announce_at(); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.set_moment_announce_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.announce_at := (NEW.occurs_on + NEW.announce_local_time) AT TIME ZONE NEW.timezone;
  RETURN NEW;
END $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END $$;


--
-- Name: FUNCTION set_updated_at(); Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON FUNCTION moments.set_updated_at() IS 'BEFORE UPDATE trigger: stamps updated_at. Attach to every table with that column.';


--
-- Name: skip_task(uuid, text, text); Type: FUNCTION; Schema: moments; Owner: -
--

CREATE FUNCTION moments.skip_task(p_task_id uuid, p_worker_id text, p_reason text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: action_tokens; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.action_tokens (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid,
    purpose moments.token_purpose NOT NULL,
    token_hash bytea NOT NULL,
    token_lookup text NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    moment_event_id uuid,
    issued_to_email text,
    issued_to_phone text,
    expires_at timestamp with time zone NOT NULL,
    max_uses smallint DEFAULT 5 NOT NULL,
    use_count smallint DEFAULT 0 NOT NULL,
    first_used_at timestamp with time zone,
    last_used_at timestamp with time zone,
    consumed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoked_reason text,
    last_ip inet,
    last_user_agent text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT action_tokens_max_uses_check CHECK (((max_uses >= 1) AND (max_uses <= 100))),
    CONSTRAINT action_tokens_subject_type_check CHECK ((subject_type = ANY (ARRAY['employee'::text, 'moment_event'::text, 'approval_request'::text, 'invitation'::text, 'address'::text]))),
    CONSTRAINT action_tokens_use_count_check CHECK ((use_count >= 0)),
    CONSTRAINT action_tokens_uses_bounded CHECK ((use_count <= max_uses))
);


--
-- Name: addresses; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.addresses (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    kind moments.address_kind DEFAULT 'home'::moments.address_kind NOT NULL,
    recipient_name text,
    recipient_phone text,
    line1 text NOT NULL,
    line2 text,
    area text,
    landmark text,
    city_id uuid,
    city_text text,
    postal_code text,
    google_maps_url text,
    latitude double precision,
    longitude double precision,
    delivery_notes text,
    verification_status moments.address_verification_status DEFAULT 'unverified'::moments.address_verification_status NOT NULL,
    verified_at timestamp with time zone,
    verified_by_kind moments.actor_kind,
    verified_by uuid,
    verification_expires_at timestamp with time zone,
    last_delivery_ok_at timestamp with time zone,
    failed_delivery_count integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT addresses_city_present CHECK (((city_id IS NOT NULL) OR (city_text IS NOT NULL))),
    CONSTRAINT addresses_failed_delivery_count_check CHECK ((failed_delivery_count >= 0)),
    CONSTRAINT addresses_latitude_check CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision))),
    CONSTRAINT addresses_line1_check CHECK ((length(btrim(line1)) >= 5)),
    CONSTRAINT addresses_longitude_check CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))),
    CONSTRAINT addresses_recipient_phone_check CHECK ((recipient_phone ~ '^\+[1-9][0-9]{7,14}$'::text)),
    CONSTRAINT addresses_verified_has_ts CHECK (((verification_status <> ALL (ARRAY['employee_confirmed'::moments.address_verification_status, 'hr_confirmed'::moments.address_verification_status])) OR (verified_at IS NOT NULL)))
);


--
-- Name: alerts; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.alerts (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    severity moments.alert_severity NOT NULL,
    status moments.alert_status DEFAULT 'open'::moments.alert_status NOT NULL,
    kind text NOT NULL,
    org_id uuid,
    entity text,
    entity_id uuid,
    title text NOT NULL,
    body text,
    dedupe_key text NOT NULL,
    acked_by uuid,
    acked_at timestamp with time zone,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_requests; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.approval_requests (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    moment_event_id uuid NOT NULL,
    gift_order_id uuid,
    task_id uuid,
    requested_amount_paisa bigint NOT NULL,
    budget_paisa bigint DEFAULT 0 NOT NULL,
    summary text,
    approver_kind moments.approver_kind NOT NULL,
    approver_user_id uuid,
    approver_employee_id uuid,
    approver_email text,
    approver_phone text,
    channel moments.channel DEFAULT 'email'::moments.channel NOT NULL,
    token_id uuid,
    requires_otp boolean DEFAULT false NOT NULL,
    otp_hash bytea,
    otp_expires_at timestamp with time zone,
    status moments.approval_decision DEFAULT 'pending'::moments.approval_decision NOT NULL,
    sent_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    auto_approve_at timestamp with time zone,
    auto_approve_on_timeout boolean DEFAULT true NOT NULL,
    reminder_count smallint DEFAULT 0 NOT NULL,
    last_reminded_at timestamp with time zone,
    responded_at timestamp with time zone,
    responded_via moments.response_channel,
    responder_user_id uuid,
    responder_label text,
    responder_ip inet,
    responder_user_agent text,
    decision_note text,
    counter_amount_paisa bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approval_autoapprove_before_expiry CHECK (((auto_approve_at IS NULL) OR (auto_approve_at <= expires_at))),
    CONSTRAINT approval_decided_has_ts CHECK (((status = ANY (ARRAY['pending'::moments.approval_decision, 'cancelled'::moments.approval_decision])) OR (responded_at IS NOT NULL))),
    CONSTRAINT approval_has_recipient CHECK (((approver_user_id IS NOT NULL) OR (approver_email IS NOT NULL) OR (approver_phone IS NOT NULL))),
    CONSTRAINT approval_requests_counter_amount_paisa_check CHECK (((counter_amount_paisa IS NULL) OR (counter_amount_paisa >= 0))),
    CONSTRAINT approval_requests_reminder_count_check CHECK (((reminder_count >= 0) AND (reminder_count <= 10))),
    CONSTRAINT approval_requests_requested_amount_paisa_check CHECK ((requested_amount_paisa >= 0))
);


--
-- Name: COLUMN approval_requests.status; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON COLUMN moments.approval_requests.status IS 'auto_approved is a DISTINCT status, never folded into approved. When a customer disputes a PKR 7,500 marriage gift you must be able to say "nobody clicked; your policy auto-approved after 24h" and prove it.';


--
-- Name: COLUMN approval_requests.auto_approve_at; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON COLUMN moments.approval_requests.auto_approve_at IS 'A real column, not computed: HR will ask for per-request extensions.';


--
-- Name: audit_log; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.audit_log (
    id bigint NOT NULL,
    org_id uuid,
    actor_kind moments.actor_kind DEFAULT 'user'::moments.actor_kind NOT NULL,
    actor_user_id uuid,
    actor_label text,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    before jsonb,
    after jsonb,
    reason text,
    ip inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: moments; Owner: -
--

ALTER TABLE moments.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME moments.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cities; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.cities (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ur text,
    province text NOT NULL,
    country_code text DEFAULT 'PK'::text NOT NULL,
    is_serviceable boolean DEFAULT false NOT NULL,
    tier smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cities_country_code_check CHECK ((country_code ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT cities_province_check CHECK ((province = ANY (ARRAY['Sindh'::text, 'Punjab'::text, 'KPK'::text, 'Balochistan'::text, 'ICT'::text, 'GB'::text, 'AJK'::text]))),
    CONSTRAINT cities_tier_check CHECK (((tier >= 1) AND (tier <= 3)))
);


--
-- Name: TABLE cities; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON TABLE moments.cities IS 'Serviceable cities. tier 1 = Karachi/Lahore/Islamabad.';


--
-- Name: dead_letters; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.dead_letters (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    task_id uuid,
    org_id uuid,
    task_type moments.task_type NOT NULL,
    moment_event_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    replayed_at timestamp with time zone,
    replayed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: delivery_proofs; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.delivery_proofs (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    org_id uuid NOT NULL,
    kind moments.proof_kind NOT NULL,
    storage_path text,
    reference text,
    received_by text,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by uuid,
    notes text
);


--
-- Name: employee_events; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.employee_events (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    moment_type_id uuid NOT NULL,
    event_date date NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_celebrated boolean DEFAULT true NOT NULL,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_import_batches; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.employee_import_batches (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    uploaded_by uuid,
    filename text NOT NULL,
    storage_path text,
    status moments.import_batch_status DEFAULT 'uploaded'::moments.import_batch_status NOT NULL,
    column_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    options jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    valid_rows integer DEFAULT 0 NOT NULL,
    error_rows integer DEFAULT 0 NOT NULL,
    imported_rows integer DEFAULT 0 NOT NULL,
    error_summary jsonb DEFAULT '[]'::jsonb NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_import_batches_error_rows_check CHECK ((error_rows >= 0)),
    CONSTRAINT employee_import_batches_imported_rows_check CHECK ((imported_rows >= 0)),
    CONSTRAINT employee_import_batches_total_rows_check CHECK ((total_rows >= 0)),
    CONSTRAINT employee_import_batches_valid_rows_check CHECK ((valid_rows >= 0))
);


--
-- Name: employee_import_rows; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.employee_import_rows (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    org_id uuid NOT NULL,
    row_number integer NOT NULL,
    raw jsonb NOT NULL,
    normalized jsonb DEFAULT '{}'::jsonb NOT NULL,
    status moments.import_row_status DEFAULT 'pending'::moments.import_row_status NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    employee_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_import_rows_row_number_check CHECK ((row_number > 0))
);


--
-- Name: employees; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.employees (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    user_id uuid,
    employee_code text,
    full_name text NOT NULL,
    full_name_ur text,
    preferred_name text,
    work_email text,
    personal_email text,
    phone_e164 text,
    whatsapp_e164 text,
    whatsapp_opt_in_at timestamp with time zone,
    whatsapp_opted_out boolean DEFAULT false NOT NULL,
    slack_user_id text,
    gender text,
    date_of_birth date,
    hire_date date,
    exit_date date,
    exit_reason text,
    job_title text,
    department text,
    office_id uuid,
    manager_id uuid,
    status moments.employee_status DEFAULT 'active'::moments.employee_status NOT NULL,
    timezone text,
    locale text DEFAULT 'en'::text NOT NULL,
    halal_only boolean DEFAULT true NOT NULL,
    is_vegetarian boolean DEFAULT false NOT NULL,
    needs_eggless boolean DEFAULT false NOT NULL,
    allergies text[] DEFAULT '{}'::text[] NOT NULL,
    dietary_notes text,
    shirt_size text,
    celebration_opt_out boolean DEFAULT false NOT NULL,
    hide_birth_year boolean DEFAULT true NOT NULL,
    birth_mmdd integer GENERATED ALWAYS AS ((((EXTRACT(month FROM date_of_birth))::integer * 100) + (EXTRACT(day FROM date_of_birth))::integer)) STORED,
    hire_mmdd integer GENERATED ALWAYS AS ((((EXTRACT(month FROM hire_date))::integer * 100) + (EXTRACT(day FROM hire_date))::integer)) STORED,
    custom_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    import_batch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT employees_date_of_birth_check CHECK (((date_of_birth > '1930-01-01'::date) AND (date_of_birth < CURRENT_DATE))),
    CONSTRAINT employees_employee_code_check CHECK ((length(employee_code) <= 64)),
    CONSTRAINT employees_exit_after_hire CHECK (((exit_date IS NULL) OR (hire_date IS NULL) OR (exit_date >= hire_date))),
    CONSTRAINT employees_exit_reason_check CHECK ((exit_reason = ANY (ARRAY['resigned'::text, 'retired'::text, 'end_of_contract'::text, 'redundancy'::text, 'terminated_for_cause'::text]))),
    CONSTRAINT employees_exited_has_date CHECK (((status <> 'exited'::moments.employee_status) OR (exit_date IS NOT NULL))),
    CONSTRAINT employees_full_name_check CHECK (((length(btrim(full_name)) >= 1) AND (length(btrim(full_name)) <= 200))),
    CONSTRAINT employees_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, 'undisclosed'::text]))),
    CONSTRAINT employees_has_contact CHECK (((work_email IS NOT NULL) OR (personal_email IS NOT NULL) OR (phone_e164 IS NOT NULL))),
    CONSTRAINT employees_hire_date_check CHECK ((hire_date > '1970-01-01'::date)),
    CONSTRAINT employees_locale_check CHECK ((locale = ANY (ARRAY['en'::text, 'ur'::text, 'ur-Latn'::text]))),
    CONSTRAINT employees_not_own_manager CHECK ((manager_id IS DISTINCT FROM id)),
    CONSTRAINT employees_personal_email_check CHECK ((personal_email = lower(btrim(personal_email)))),
    CONSTRAINT employees_phone_e164_check CHECK ((phone_e164 ~ '^\+[1-9][0-9]{7,14}$'::text)),
    CONSTRAINT employees_shirt_size_check CHECK ((shirt_size = ANY (ARRAY['XS'::text, 'S'::text, 'M'::text, 'L'::text, 'XL'::text, 'XXL'::text, 'XXXL'::text]))),
    CONSTRAINT employees_whatsapp_e164_check CHECK ((whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'::text)),
    CONSTRAINT employees_work_email_check CHECK ((work_email = lower(btrim(work_email))))
);


--
-- Name: feature_flags; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.feature_flags (
    key text NOT NULL,
    description text,
    is_enabled boolean DEFAULT false NOT NULL,
    org_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gift_bundle_items; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.gift_bundle_items (
    bundle_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity smallint DEFAULT 1 NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    CONSTRAINT gift_bundle_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 50)))
);


--
-- Name: gift_bundles; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.gift_bundles (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid,
    name text NOT NULL,
    description text,
    target_budget_paisa bigint NOT NULL,
    suitable_moment_keys text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_bundles_target_budget_paisa_check CHECK (((target_budget_paisa >= 10000) AND (target_budget_paisa <= 100000000)))
);


--
-- Name: gift_order_items; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.gift_order_items (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    org_id uuid NOT NULL,
    product_id uuid,
    name_snapshot text NOT NULL,
    category moments.product_category NOT NULL,
    quantity smallint DEFAULT 1 NOT NULL,
    unit_cost_paisa bigint NOT NULL,
    unit_price_paisa bigint NOT NULL,
    line_cost_paisa bigint GENERATED ALWAYS AS ((unit_cost_paisa * quantity)) STORED,
    line_price_paisa bigint GENERATED ALWAYS AS ((unit_price_paisa * quantity)) STORED,
    personalisation jsonb DEFAULT '{}'::jsonb NOT NULL,
    dietary_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_order_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 500))),
    CONSTRAINT gift_order_items_unit_cost_paisa_check CHECK ((unit_cost_paisa >= 0)),
    CONSTRAINT gift_order_items_unit_price_paisa_check CHECK ((unit_price_paisa >= 0))
);


--
-- Name: gift_order_status_history; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.gift_order_status_history (
    id bigint NOT NULL,
    order_id uuid NOT NULL,
    org_id uuid NOT NULL,
    from_status moments.order_status,
    to_status moments.order_status NOT NULL,
    actor_kind moments.actor_kind DEFAULT 'system'::moments.actor_kind NOT NULL,
    actor_id uuid,
    reason text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gift_order_status_history_id_seq; Type: SEQUENCE; Schema: moments; Owner: -
--

ALTER TABLE moments.gift_order_status_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME moments.gift_order_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: gift_orders; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.gift_orders (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    moment_event_id uuid NOT NULL,
    employee_id uuid,
    vendor_id uuid,
    order_number text NOT NULL,
    status moments.order_status DEFAULT 'draft'::moments.order_status NOT NULL,
    address_id uuid,
    address_snapshot jsonb NOT NULL,
    recipient_name text NOT NULL,
    recipient_phone text,
    city_id uuid,
    deliver_on date NOT NULL,
    delivery_slot text,
    delivery_instructions text,
    dietary_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    items_cost_paisa bigint DEFAULT 0 NOT NULL,
    delivery_cost_paisa bigint DEFAULT 0 NOT NULL,
    total_cost_paisa bigint GENERATED ALWAYS AS ((items_cost_paisa + delivery_cost_paisa)) STORED,
    items_price_paisa bigint DEFAULT 0 NOT NULL,
    delivery_price_paisa bigint DEFAULT 0 NOT NULL,
    total_price_paisa bigint GENERATED ALWAYS AS ((items_price_paisa + delivery_price_paisa)) STORED,
    margin_paisa bigint GENERATED ALWAYS AS (((items_price_paisa + delivery_price_paisa) - (items_cost_paisa + delivery_cost_paisa))) STORED,
    budget_paisa bigint DEFAULT 0 NOT NULL,
    is_over_budget boolean GENERATED ALWAYS AS (((items_price_paisa + delivery_price_paisa) > budget_paisa)) STORED,
    over_budget_approved_by uuid,
    assigned_staff_id uuid,
    ops_sla_due_at timestamp with time zone,
    is_fallback boolean DEFAULT false NOT NULL,
    vendor_order_ref text,
    vendor_invoice_ref text,
    vendor_paid_at timestamp with time zone,
    placed_at timestamp with time zone,
    placed_by uuid,
    delivered_at timestamp with time zone,
    failure_reason text,
    cancelled_at timestamp with time zone,
    invoice_id uuid,
    invoiced_at timestamp with time zone,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_orders_currency_check CHECK ((currency = 'PKR'::text)),
    CONSTRAINT gift_orders_delivered_ts CHECK (((status <> 'delivered'::moments.order_status) OR (delivered_at IS NOT NULL))),
    CONSTRAINT gift_orders_delivery_cost_paisa_check CHECK ((delivery_cost_paisa >= 0)),
    CONSTRAINT gift_orders_delivery_price_paisa_check CHECK ((delivery_price_paisa >= 0)),
    CONSTRAINT gift_orders_items_cost_paisa_check CHECK ((items_cost_paisa >= 0)),
    CONSTRAINT gift_orders_items_price_paisa_check CHECK ((items_price_paisa >= 0)),
    CONSTRAINT gift_orders_placed_ts CHECK (((status <> ALL (ARRAY['placed_with_vendor'::moments.order_status, 'in_transit'::moments.order_status, 'delivered'::moments.order_status])) OR (placed_at IS NOT NULL))),
    CONSTRAINT gift_orders_recipient_phone_check CHECK ((recipient_phone ~ '^\+[1-9][0-9]{7,14}$'::text))
);


--
-- Name: gift_products; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.gift_products (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    sku text,
    name text NOT NULL,
    name_ur text,
    description text,
    category moments.product_category NOT NULL,
    cost_paisa bigint NOT NULL,
    list_price_paisa bigint NOT NULL,
    margin_paisa bigint GENERATED ALWAYS AS ((list_price_paisa - cost_paisa)) STORED,
    margin_bps integer GENERATED ALWAYS AS (
CASE
    WHEN (list_price_paisa > 0) THEN (((list_price_paisa - cost_paisa) * 10000) / list_price_paisa)
    ELSE NULL::bigint
END) STORED,
    is_food boolean DEFAULT false NOT NULL,
    is_halal_certified boolean DEFAULT false NOT NULL,
    is_eggless boolean DEFAULT false NOT NULL,
    is_vegetarian boolean DEFAULT false NOT NULL,
    contains_nuts boolean DEFAULT false NOT NULL,
    contains_gelatin boolean DEFAULT false NOT NULL,
    allergen_notes text,
    suitable_moment_keys text[] DEFAULT '{}'::text[] NOT NULL,
    gender_suitability text DEFAULT 'any'::text NOT NULL,
    personalisation_fields text[] DEFAULT '{}'::text[] NOT NULL,
    min_lead_days smallint DEFAULT 1 NOT NULL,
    is_digital boolean DEFAULT false NOT NULL,
    image_url text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_products_cost_paisa_check CHECK (((cost_paisa >= 0) AND (cost_paisa <= 100000000))),
    CONSTRAINT gift_products_gender_suitability_check CHECK ((gender_suitability = ANY (ARRAY['any'::text, 'male'::text, 'female'::text]))),
    CONSTRAINT gift_products_list_price_paisa_check CHECK (((list_price_paisa >= 10000) AND (list_price_paisa <= 100000000))),
    CONSTRAINT gift_products_margin_nonneg CHECK ((list_price_paisa >= cost_paisa)),
    CONSTRAINT gift_products_min_lead_days_check CHECK (((min_lead_days >= 0) AND (min_lead_days <= 30)))
);


--
-- Name: COLUMN gift_products.is_digital; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON COLUMN moments.gift_products.is_digital IS 'Digital gifts back the order_fallback handler: at T-0 08:00, if the physical gift is not confirmed in transit, substitute one of these so the employee gets something on the day. The physical item arrives later as a bonus.';


--
-- Name: invitations; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.invitations (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    email text NOT NULL,
    role moments.org_role DEFAULT 'viewer'::moments.org_role NOT NULL,
    token_id uuid,
    invited_by uuid,
    accepted_at timestamp with time zone,
    accepted_by uuid,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invitations_email_check CHECK (((email = lower(btrim(email))) AND (email ~~ '%_@_%'::text)))
);


--
-- Name: invoice_lines; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.invoice_lines (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    org_id uuid NOT NULL,
    kind text NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_paisa bigint NOT NULL,
    amount_paisa bigint NOT NULL,
    gift_order_id uuid,
    moment_event_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_lines_kind_check CHECK ((kind = ANY (ARRAY['subscription'::text, 'gift'::text, 'delivery'::text, 'adjustment'::text, 'credit'::text, 'wallet_topup'::text]))),
    CONSTRAINT invoice_lines_quantity_check CHECK ((quantity > 0))
);


--
-- Name: invoices; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.invoices (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    number text NOT NULL,
    kind moments.invoice_kind DEFAULT 'combined'::moments.invoice_kind NOT NULL,
    status moments.invoice_status DEFAULT 'draft'::moments.invoice_status NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    subtotal_subscription_paisa bigint DEFAULT 0 NOT NULL,
    subtotal_gifts_paisa bigint DEFAULT 0 NOT NULL,
    subtotal_delivery_paisa bigint DEFAULT 0 NOT NULL,
    adjustments_paisa bigint DEFAULT 0 NOT NULL,
    tax_rate_bps integer DEFAULT 0 NOT NULL,
    tax_paisa bigint DEFAULT 0 NOT NULL,
    total_paisa bigint DEFAULT 0 NOT NULL,
    paid_paisa bigint DEFAULT 0 NOT NULL,
    wht_paisa bigint DEFAULT 0 NOT NULL,
    wht_certificate_ref text,
    employee_count_snapshot integer,
    notes text,
    pdf_path text,
    issued_at timestamp with time zone,
    due_on date,
    paid_at timestamp with time zone,
    voided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_currency_check CHECK ((currency = 'PKR'::text)),
    CONSTRAINT invoices_paid_paisa_check CHECK ((paid_paisa >= 0)),
    CONSTRAINT invoices_period_ordered CHECK ((period_end >= period_start)),
    CONSTRAINT invoices_subtotal_delivery_paisa_check CHECK ((subtotal_delivery_paisa >= 0)),
    CONSTRAINT invoices_subtotal_gifts_paisa_check CHECK ((subtotal_gifts_paisa >= 0)),
    CONSTRAINT invoices_subtotal_subscription_paisa_check CHECK ((subtotal_subscription_paisa >= 0)),
    CONSTRAINT invoices_tax_paisa_check CHECK ((tax_paisa >= 0)),
    CONSTRAINT invoices_tax_rate_bps_check CHECK (((tax_rate_bps >= 0) AND (tax_rate_bps <= 10000))),
    CONSTRAINT invoices_total_paisa_check CHECK ((total_paisa >= 0)),
    CONSTRAINT invoices_wht_paisa_check CHECK ((wht_paisa >= 0))
);


--
-- Name: job_runs; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.job_runs (
    id bigint NOT NULL,
    kind text NOT NULL,
    org_id uuid,
    status text DEFAULT 'running'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    duration_ms integer,
    counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text,
    worker_id text,
    CONSTRAINT job_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])))
);


--
-- Name: job_runs_id_seq; Type: SEQUENCE; Schema: moments; Owner: -
--

ALTER TABLE moments.job_runs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME moments.job_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: message_templates; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.message_templates (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid,
    moment_type_id uuid,
    channel moments.channel NOT NULL,
    audience moments.message_audience NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    tone text DEFAULT 'warm'::text NOT NULL,
    subject text,
    body text NOT NULL,
    whatsapp_template_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_templates_locale_check CHECK ((locale = ANY (ARRAY['en'::text, 'ur'::text, 'ur-Latn'::text]))),
    CONSTRAINT message_templates_tone_check CHECK ((tone = ANY (ARRAY['warm'::text, 'professional'::text, 'playful'::text])))
);


--
-- Name: milestone_tiers; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.milestone_tiers (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    moment_type_id uuid NOT NULL,
    label text NOT NULL,
    years_range int4range NOT NULL,
    budget_paisa bigint NOT NULL,
    bundle_id uuid,
    extra_perks jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT milestone_tiers_budget_paisa_check CHECK (((budget_paisa >= 10000) AND (budget_paisa <= 100000000))),
    CONSTRAINT milestone_years_valid CHECK (((lower(years_range) >= 0) AND (NOT isempty(years_range))))
);


--
-- Name: moment_events; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.moment_events (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    employee_id uuid,
    moment_type_id uuid NOT NULL,
    policy_id uuid,
    occurrence_key text NOT NULL,
    occurs_on date NOT NULL,
    occurrence_year integer GENERATED ALWAYS AS ((EXTRACT(year FROM occurs_on))::integer) STORED,
    timezone text DEFAULT 'Asia/Karachi'::text NOT NULL,
    announce_local_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    announce_at timestamp with time zone,
    status moments.moment_status DEFAULT 'detected'::moments.moment_status NOT NULL,
    title text,
    milestone_years smallint,
    milestone_tier_id uuid,
    budget_paisa bigint DEFAULT 0 NOT NULL,
    approval_required boolean DEFAULT false NOT NULL,
    delivery_target moments.delivery_target DEFAULT 'home'::moments.delivery_target NOT NULL,
    gift_enabled boolean DEFAULT true NOT NULL,
    announcement_enabled boolean DEFAULT true NOT NULL,
    announce_publicly boolean DEFAULT true NOT NULL,
    policy_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    source moments.moment_date_source DEFAULT 'employee_date_field'::moments.moment_date_source NOT NULL,
    source_ref_id uuid,
    is_provisional boolean DEFAULT false NOT NULL,
    occurrence_note text,
    gift_order_id uuid,
    announcement_payload jsonb,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moment_events_budget_paisa_check CHECK (((budget_paisa = 0) OR ((budget_paisa >= 10000) AND (budget_paisa <= 100000000)))),
    CONSTRAINT moment_events_milestone_years_check CHECK (((milestone_years IS NULL) OR ((milestone_years >= 0) AND (milestone_years <= 80)))),
    CONSTRAINT moment_events_occurrence_key_check CHECK (((length(occurrence_key) >= 1) AND (length(occurrence_key) <= 120))),
    CONSTRAINT moment_events_terminal_ts CHECK ((((status <> 'completed'::moments.moment_status) OR (completed_at IS NOT NULL)) AND ((status <> 'cancelled'::moments.moment_status) OR (cancelled_at IS NOT NULL))))
);


--
-- Name: moment_policies; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.moment_policies (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    moment_type_id uuid NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    budget_paisa bigint NOT NULL,
    budget_includes_delivery boolean DEFAULT true NOT NULL,
    verify_offset_days smallint DEFAULT 7 NOT NULL,
    select_offset_days smallint DEFAULT 4 NOT NULL,
    approval_offset_days smallint DEFAULT 2 NOT NULL,
    approval_required boolean DEFAULT false NOT NULL,
    approval_threshold_paisa bigint,
    approver_kind moments.approver_kind DEFAULT 'hr'::moments.approver_kind NOT NULL,
    approval_channel moments.channel DEFAULT 'email'::moments.channel NOT NULL,
    auto_approve_after_hours smallint DEFAULT 24 NOT NULL,
    gift_enabled boolean DEFAULT true NOT NULL,
    card_enabled boolean DEFAULT true NOT NULL,
    delivery_target moments.delivery_target DEFAULT 'home'::moments.delivery_target NOT NULL,
    allowed_categories moments.product_category[] DEFAULT '{}'::moments.product_category[] NOT NULL,
    default_bundle_id uuid,
    announcement_enabled boolean DEFAULT true NOT NULL,
    announcement_channels moments.channel[] DEFAULT ARRAY['email'::moments.channel] NOT NULL,
    announcement_local_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    announcement_locale text DEFAULT 'en'::text NOT NULL,
    announce_publicly boolean DEFAULT true NOT NULL,
    skip_on_weekend boolean DEFAULT false NOT NULL,
    manager_nudge_enabled boolean DEFAULT true NOT NULL,
    manager_nudge_channel moments.channel DEFAULT 'email'::moments.channel NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moment_policies_announcement_locale_check CHECK ((announcement_locale = ANY (ARRAY['en'::text, 'ur'::text, 'ur-Latn'::text]))),
    CONSTRAINT moment_policies_approval_offset_days_check CHECK (((approval_offset_days >= 0) AND (approval_offset_days <= 60))),
    CONSTRAINT moment_policies_approval_threshold_paisa_check CHECK (((approval_threshold_paisa IS NULL) OR (approval_threshold_paisa >= 0))),
    CONSTRAINT moment_policies_auto_approve_after_hours_check CHECK (((auto_approve_after_hours >= 0) AND (auto_approve_after_hours <= 168))),
    CONSTRAINT moment_policies_budget_paisa_check CHECK (((budget_paisa = 0) OR ((budget_paisa >= 10000) AND (budget_paisa <= 100000000)))),
    CONSTRAINT moment_policies_channels_nonempty CHECK (((NOT announcement_enabled) OR (cardinality(announcement_channels) > 0))),
    CONSTRAINT moment_policies_offsets_ordered CHECK (((verify_offset_days >= select_offset_days) AND (select_offset_days >= approval_offset_days))),
    CONSTRAINT moment_policies_select_offset_days_check CHECK (((select_offset_days >= 0) AND (select_offset_days <= 60))),
    CONSTRAINT moment_policies_verify_offset_days_check CHECK (((verify_offset_days >= 0) AND (verify_offset_days <= 60)))
);


--
-- Name: moment_types; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.moment_types (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid,
    key text NOT NULL,
    label text NOT NULL,
    label_ur text,
    description text,
    category moments.moment_category NOT NULL,
    date_source moments.moment_date_source NOT NULL,
    source_field text,
    source_observance moments.observance_key,
    is_recurring_annual boolean DEFAULT true NOT NULL,
    supports_milestones boolean DEFAULT false NOT NULL,
    default_budget_paisa bigint DEFAULT 0 NOT NULL,
    default_verify_offset_days smallint DEFAULT 7 NOT NULL,
    default_select_offset_days smallint DEFAULT 4 NOT NULL,
    default_approval_offset_days smallint DEFAULT 2 NOT NULL,
    default_announce_local_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    default_announce_publicly boolean DEFAULT true NOT NULL,
    default_gift_categories moments.product_category[] DEFAULT '{}'::moments.product_category[] NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order smallint DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moment_types_default_approval_offset_days_check CHECK (((default_approval_offset_days >= 0) AND (default_approval_offset_days <= 60))),
    CONSTRAINT moment_types_default_budget_paisa_check CHECK (((default_budget_paisa = 0) OR ((default_budget_paisa >= 10000) AND (default_budget_paisa <= 100000000)))),
    CONSTRAINT moment_types_default_select_offset_days_check CHECK (((default_select_offset_days >= 0) AND (default_select_offset_days <= 60))),
    CONSTRAINT moment_types_default_verify_offset_days_check CHECK (((default_verify_offset_days >= 0) AND (default_verify_offset_days <= 60))),
    CONSTRAINT moment_types_key_check CHECK ((key ~ '^[a-z][a-z0-9_]{1,48}$'::text)),
    CONSTRAINT moment_types_offsets_ordered CHECK (((default_verify_offset_days >= default_select_offset_days) AND (default_select_offset_days >= default_approval_offset_days))),
    CONSTRAINT moment_types_source_coherent CHECK ((((date_source = 'employee_date_field'::moments.moment_date_source) AND (source_field IS NOT NULL)) OR ((date_source = 'observance_calendar'::moments.moment_date_source) AND (source_observance IS NOT NULL)) OR (date_source = ANY (ARRAY['employee_event'::moments.moment_date_source, 'manual'::moments.moment_date_source, 'recurring_monthly'::moments.moment_date_source])))),
    CONSTRAINT moment_types_source_field_check CHECK ((source_field = ANY (ARRAY['date_of_birth'::text, 'hire_date'::text])))
);


--
-- Name: COLUMN moment_types.default_announce_publicly; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON COLUMN moments.moment_types.default_announce_publicly IS 'false for new_baby: announcing someone''s baby company-wide before they are ready is recoverable only by apology. The employee opts in at the verify step.';


--
-- Name: observance_dates; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.observance_dates (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    country_code text DEFAULT 'PK'::text NOT NULL,
    observance moments.observance_key NOT NULL,
    hijri_year integer NOT NULL,
    gregorian_date date NOT NULL,
    end_date date,
    status moments.observance_status DEFAULT 'predicted'::moments.observance_status NOT NULL,
    source text,
    source_url text,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT observance_confirmed_has_confirmer CHECK (((status <> 'confirmed'::moments.observance_status) OR ((confirmed_by IS NOT NULL) AND (confirmed_at IS NOT NULL)))),
    CONSTRAINT observance_dates_country_code_check CHECK ((country_code ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT observance_dates_hijri_year_check CHECK (((hijri_year >= 1400) AND (hijri_year <= 1600))),
    CONSTRAINT observance_end_after_start CHECK (((end_date IS NULL) OR (end_date >= gregorian_date)))
);


--
-- Name: offices; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.offices (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    city_id uuid,
    address_line text,
    area text,
    landmark text,
    contact_name text,
    contact_phone text,
    timezone text DEFAULT 'Asia/Karachi'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT offices_contact_phone_check CHECK ((contact_phone ~ '^\+[1-9][0-9]{7,14}$'::text))
);


--
-- Name: org_integrations; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.org_integrations (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    provider moments.integration_provider NOT NULL,
    status moments.integration_status DEFAULT 'pending'::moments.integration_status NOT NULL,
    display_name text,
    external_team_id text,
    external_account_id text,
    default_channel_ref text,
    config_public jsonb DEFAULT '{}'::jsonb NOT NULL,
    access_token_secret_id uuid,
    refresh_token_secret_id uuid,
    signing_secret_id uuid,
    token_expires_at timestamp with time zone,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    installed_by uuid,
    last_verified_at timestamp with time zone,
    last_error text,
    last_error_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: org_members; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.org_members (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role moments.org_role DEFAULT 'viewer'::moments.org_role NOT NULL,
    status moments.membership_status DEFAULT 'active'::moments.membership_status NOT NULL,
    employee_id uuid,
    invited_by uuid,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.organizations (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    legal_name text,
    status moments.org_status DEFAULT 'trial'::moments.org_status NOT NULL,
    timezone text DEFAULT 'Asia/Karachi'::text NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    default_locale text DEFAULT 'en'::text NOT NULL,
    ntn text,
    strn text,
    tax_jurisdiction text,
    billing_email text,
    billing_address jsonb DEFAULT '{}'::jsonb NOT NULL,
    billing_city_id uuid,
    feb29_observed_on text DEFAULT 'feb_28'::text NOT NULL,
    late_announcement_policy text DEFAULT 'fire_immediately_if_before_15'::text NOT NULL,
    announcement_digest_threshold smallint DEFAULT 3 NOT NULL,
    celebrate_on_terminated_exit boolean DEFAULT false NOT NULL,
    dry_run_until timestamp with time zone,
    employee_count_hint integer,
    logo_url text,
    brand_color text,
    onboarding_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT organizations_announcement_digest_threshold_check CHECK (((announcement_digest_threshold >= 1) AND (announcement_digest_threshold <= 50))),
    CONSTRAINT organizations_brand_color_check CHECK ((brand_color ~ '^#[0-9a-fA-F]{6}$'::text)),
    CONSTRAINT organizations_currency_check CHECK ((currency = 'PKR'::text)),
    CONSTRAINT organizations_default_locale_check CHECK ((default_locale = ANY (ARRAY['en'::text, 'ur'::text, 'ur-Latn'::text]))),
    CONSTRAINT organizations_employee_count_hint_check CHECK ((employee_count_hint >= 0)),
    CONSTRAINT organizations_feb29_observed_on_check CHECK ((feb29_observed_on = ANY (ARRAY['feb_28'::text, 'mar_01'::text]))),
    CONSTRAINT organizations_late_announcement_policy_check CHECK ((late_announcement_policy = ANY (ARRAY['fire_immediately_if_before_15'::text, 'next_day'::text, 'skip'::text]))),
    CONSTRAINT organizations_name_check CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 200))),
    CONSTRAINT organizations_ntn_check CHECK (((ntn ~ '^[0-9]{7}-?[0-9]?$'::text) OR (ntn ~ '^[0-9]{13}$'::text))),
    CONSTRAINT organizations_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'::text)),
    CONSTRAINT organizations_strn_check CHECK ((strn ~ '^[0-9]{13}$'::text)),
    CONSTRAINT organizations_tax_jurisdiction_check CHECK ((tax_jurisdiction = ANY (ARRAY['FBR'::text, 'SRB'::text, 'PRA'::text, 'KPRA'::text, 'BRA'::text, 'ICT'::text])))
);


--
-- Name: COLUMN organizations.dry_run_until; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON COLUMN moments.organizations.dry_run_until IS 'While in the future, every message renders and every task runs, but sends go only to the HR admin with a [PREVIEW] banner. Default ON for the first 7 days of an org.';


--
-- Name: outbound_message_events; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.outbound_message_events (
    id bigint NOT NULL,
    message_id uuid NOT NULL,
    org_id uuid,
    status moments.message_status NOT NULL,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outbound_message_events_id_seq; Type: SEQUENCE; Schema: moments; Owner: -
--

ALTER TABLE moments.outbound_message_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME moments.outbound_message_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: outbound_messages; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.outbound_messages (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    moment_event_id uuid,
    task_id uuid,
    employee_id uuid,
    channel moments.channel NOT NULL,
    audience moments.message_audience NOT NULL,
    template_id uuid,
    idempotency_key text NOT NULL,
    recipient_ref text NOT NULL,
    rendered_subject text,
    rendered_body text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status moments.message_status DEFAULT 'queued'::moments.message_status NOT NULL,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    failed_at timestamp with time zone,
    provider_message_id text,
    provider_response jsonb,
    error_code text,
    error_message text,
    is_preview boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.payments (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    invoice_id uuid,
    method moments.payment_method DEFAULT 'bank_transfer'::moments.payment_method NOT NULL,
    status moments.payment_status DEFAULT 'reported'::moments.payment_status NOT NULL,
    amount_paisa bigint NOT NULL,
    wht_paisa bigint DEFAULT 0 NOT NULL,
    paid_on date,
    bank_reference text,
    proof_path text,
    submitted_by uuid,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_paisa_check CHECK ((amount_paisa > 0)),
    CONSTRAINT payments_verified_has_ts CHECK (((status <> 'verified'::moments.payment_status) OR ((verified_at IS NOT NULL) AND (verified_by IS NOT NULL)))),
    CONSTRAINT payments_wht_paisa_check CHECK ((wht_paisa >= 0))
);


--
-- Name: plans; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.plans (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    base_price_paisa bigint NOT NULL,
    included_employees integer DEFAULT 0 NOT NULL,
    per_employee_paisa bigint DEFAULT 0 NOT NULL,
    gift_margin_bps integer DEFAULT 2000 NOT NULL,
    min_margin_paisa bigint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plans_base_price_paisa_check CHECK ((base_price_paisa >= 0)),
    CONSTRAINT plans_gift_margin_bps_check CHECK (((gift_margin_bps >= 0) AND (gift_margin_bps <= 10000))),
    CONSTRAINT plans_included_employees_check CHECK ((included_employees >= 0)),
    CONSTRAINT plans_min_margin_paisa_check CHECK ((min_margin_paisa >= 0)),
    CONSTRAINT plans_per_employee_paisa_check CHECK ((per_employee_paisa >= 0))
);


--
-- Name: profiles; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.profiles (
    id uuid NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    email text,
    phone_e164 text,
    avatar_url text,
    locale text DEFAULT 'en'::text NOT NULL,
    timezone text DEFAULT 'Asia/Karachi'::text NOT NULL,
    default_org_id uuid,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_full_name_check CHECK ((length(full_name) <= 200)),
    CONSTRAINT profiles_locale_check CHECK ((locale = ANY (ARRAY['en'::text, 'ur'::text, 'ur-Latn'::text]))),
    CONSTRAINT profiles_phone_e164_check CHECK ((phone_e164 ~ '^\+[1-9][0-9]{7,14}$'::text))
);


--
-- Name: rate_limit_buckets; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.rate_limit_buckets (
    bucket_key text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    count integer DEFAULT 0 NOT NULL
);


--
-- Name: staff_users; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.staff_users (
    user_id uuid NOT NULL,
    role moments.staff_role DEFAULT 'ops'::moments.staff_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.subscriptions (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status moments.subscription_status DEFAULT 'trialing'::moments.subscription_status NOT NULL,
    period daterange NOT NULL,
    billing_day smallint DEFAULT 1 NOT NULL,
    committed_employees integer,
    trial_ends_on date,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_billing_day_check CHECK (((billing_day >= 1) AND (billing_day <= 28))),
    CONSTRAINT subscriptions_committed_employees_check CHECK (((committed_employees IS NULL) OR (committed_employees >= 0)))
);


--
-- Name: suppressions; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.suppressions (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid,
    channel moments.channel NOT NULL,
    target text NOT NULL,
    reason text NOT NULL,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppressions_reason_check CHECK ((reason = ANY (ARRAY['hard_bounce'::text, 'complaint'::text, 'unsubscribed'::text, 'opted_out'::text, 'invalid'::text])))
);


--
-- Name: task_attempts; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.task_attempts (
    id bigint NOT NULL,
    task_id uuid NOT NULL,
    org_id uuid,
    attempt integer NOT NULL,
    worker_id text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    duration_ms integer,
    outcome text,
    error_class text,
    error text,
    result jsonb,
    CONSTRAINT task_attempts_outcome_check CHECK ((outcome = ANY (ARRAY['succeeded'::text, 'retry'::text, 'skipped'::text, 'failed'::text, 'dead'::text, 'timeout'::text])))
);


--
-- Name: task_attempts_id_seq; Type: SEQUENCE; Schema: moments; Owner: -
--

ALTER TABLE moments.task_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME moments.task_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: token_events; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.token_events (
    id bigint NOT NULL,
    token_id uuid NOT NULL,
    org_id uuid,
    kind text NOT NULL,
    ip inet,
    user_agent text,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT token_events_kind_check CHECK ((kind = ANY (ARRAY['viewed'::text, 'submitted'::text, 'rejected'::text, 'expired'::text, 'revoked'::text])))
);


--
-- Name: token_events_id_seq; Type: SEQUENCE; Schema: moments; Owner: -
--

ALTER TABLE moments.token_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME moments.token_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: v_finance_employees; Type: VIEW; Schema: moments; Owner: -
--

CREATE VIEW moments.v_finance_employees WITH (security_invoker='true') AS
 SELECT id,
    org_id,
    COALESCE(preferred_name, full_name) AS display_name,
    department,
    status
   FROM moments.employees e
  WHERE (deleted_at IS NULL);


--
-- Name: v_ops_employees; Type: VIEW; Schema: moments; Owner: -
--

CREATE VIEW moments.v_ops_employees WITH (security_invoker='true') AS
 SELECT e.id,
    e.org_id,
    COALESCE(e.preferred_name, e.full_name) AS display_name,
    e.full_name_ur,
    e.phone_e164,
    e.whatsapp_e164,
    e.halal_only,
    e.is_vegetarian,
    e.needs_eggless,
    e.allergies,
    e.dietary_notes,
    e.shirt_size,
    a.line1,
    a.line2,
    a.area,
    a.landmark,
    a.city_id,
    a.delivery_notes,
    a.google_maps_url,
    a.verification_status
   FROM (moments.employees e
     LEFT JOIN moments.addresses a ON (((a.employee_id = e.id) AND a.is_primary AND a.is_active)))
  WHERE (EXISTS ( SELECT 1
           FROM moments.gift_orders o
          WHERE ((o.employee_id = e.id) AND (o.status <> ALL (ARRAY['cancelled'::moments.order_status, 'delivered'::moments.order_status, 'failed'::moments.order_status])) AND ((o.deliver_on >= (CURRENT_DATE - 1)) AND (o.deliver_on <= (CURRENT_DATE + 14))))));


--
-- Name: vendors; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.vendors (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    name text NOT NULL,
    legal_name text,
    category text,
    contact_name text,
    contact_phone text,
    contact_email text,
    whatsapp_e164 text,
    ntn text,
    payment_terms text,
    ordering_method text,
    default_lead_days smallint DEFAULT 2 NOT NULL,
    reliability_score smallint,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendors_contact_phone_check CHECK ((contact_phone ~ '^\+[1-9][0-9]{7,14}$'::text)),
    CONSTRAINT vendors_default_lead_days_check CHECK (((default_lead_days >= 0) AND (default_lead_days <= 30))),
    CONSTRAINT vendors_ordering_method_check CHECK ((ordering_method = ANY (ARRAY['whatsapp'::text, 'phone'::text, 'email'::text, 'portal'::text]))),
    CONSTRAINT vendors_payment_terms_check CHECK ((payment_terms = ANY (ARRAY['prepaid'::text, 'cod'::text, 'net7'::text, 'net15'::text, 'net30'::text]))),
    CONSTRAINT vendors_reliability_score_check CHECK (((reliability_score >= 0) AND (reliability_score <= 100))),
    CONSTRAINT vendors_whatsapp_e164_check CHECK ((whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'::text))
);


--
-- Name: v_ops_order_queue; Type: VIEW; Schema: moments; Owner: -
--

CREATE VIEW moments.v_ops_order_queue WITH (security_invoker='true') AS
 SELECT o.id,
    o.order_number,
    o.status,
    o.deliver_on,
    o.ops_sla_due_at,
    o.city_id,
    c.name AS city,
    o.recipient_name,
    o.recipient_phone,
    o.address_snapshot,
    o.dietary_snapshot,
    o.total_price_paisa,
    o.total_cost_paisa,
    o.margin_paisa,
    o.vendor_id,
    v.name AS vendor_name,
    org.name AS org_name,
    o.assigned_staff_id,
    o.is_fallback,
    (o.deliver_on - CURRENT_DATE) AS days_until_delivery
   FROM (((moments.gift_orders o
     JOIN moments.organizations org ON ((org.id = o.org_id)))
     LEFT JOIN moments.cities c ON ((c.id = o.city_id)))
     LEFT JOIN moments.vendors v ON ((v.id = o.vendor_id)))
  WHERE (o.status = ANY (ARRAY['queued_for_ops'::moments.order_status, 'approved'::moments.order_status, 'placed_with_vendor'::moments.order_status, 'in_transit'::moments.order_status]));


--
-- Name: VIEW v_ops_order_queue; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON VIEW moments.v_ops_order_queue IS 'The ops fulfillment queue. security_invoker means a non-staff user sees nothing, because the underlying gift_orders/vendors policies deny them.';


--
-- Name: v_task_health; Type: VIEW; Schema: moments; Owner: -
--

CREATE VIEW moments.v_task_health WITH (security_invoker='true') AS
 SELECT id,
    org_id,
    moment_event_id,
    task_type,
    lane,
    status,
    scheduled_for,
    next_attempt_at,
    attempts,
    max_attempts,
    last_error,
    error_class,
    ((status = 'pending'::moments.task_status) AND (next_attempt_at < (now() - make_interval(secs => (late_threshold_seconds)::double precision)))) AS is_late
   FROM moments.moment_tasks t
  WHERE (status = ANY (ARRAY['pending'::moments.task_status, 'running'::moments.task_status, 'failed'::moments.task_status, 'dead'::moments.task_status]));


--
-- Name: VIEW v_task_health; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON VIEW moments.v_task_health IS 'Feeds the 09:10 PKT watchdog. Any announce-lane row for today not in succeeded/skipped is a P1 page: a missed birthday is a product-killing failure.';


--
-- Name: vendor_city_coverage; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.vendor_city_coverage (
    vendor_id uuid NOT NULL,
    city_id uuid NOT NULL,
    lead_time_days smallint DEFAULT 2 NOT NULL,
    delivery_fee_paisa bigint DEFAULT 0 NOT NULL,
    min_order_paisa bigint DEFAULT 0 NOT NULL,
    order_cutoff_local time without time zone,
    covered_areas text[] DEFAULT '{}'::text[] NOT NULL,
    same_day_available boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_city_coverage_delivery_fee_paisa_check CHECK (((delivery_fee_paisa >= 0) AND (delivery_fee_paisa <= 10000000))),
    CONSTRAINT vendor_city_coverage_lead_time_days_check CHECK (((lead_time_days >= 0) AND (lead_time_days <= 30))),
    CONSTRAINT vendor_city_coverage_min_order_paisa_check CHECK ((min_order_paisa >= 0))
);


--
-- Name: wallet_accounts; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.wallet_accounts (
    org_id uuid NOT NULL,
    balance_paisa bigint DEFAULT 0 NOT NULL,
    held_paisa bigint DEFAULT 0 NOT NULL,
    low_balance_threshold_paisa bigint DEFAULT 0 NOT NULL,
    on_insufficient text DEFAULT 'invoice'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_accounts_held_paisa_check CHECK ((held_paisa >= 0)),
    CONSTRAINT wallet_accounts_low_balance_threshold_paisa_check CHECK ((low_balance_threshold_paisa >= 0)),
    CONSTRAINT wallet_accounts_on_insufficient_check CHECK ((on_insufficient = ANY (ARRAY['pause'::text, 'invoice'::text])))
);


--
-- Name: wallet_ledger; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.wallet_ledger (
    id bigint NOT NULL,
    org_id uuid NOT NULL,
    direction moments.wallet_direction NOT NULL,
    reason moments.wallet_reason NOT NULL,
    amount_paisa bigint NOT NULL,
    balance_after_paisa bigint NOT NULL,
    ref_type text,
    ref_id uuid,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_ledger_amount_paisa_check CHECK ((amount_paisa > 0))
);


--
-- Name: wallet_ledger_id_seq; Type: SEQUENCE; Schema: moments; Owner: -
--

ALTER TABLE moments.wallet_ledger ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME moments.wallet_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: whatsapp_sessions; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.whatsapp_sessions (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    employee_id uuid,
    wa_id text NOT NULL,
    window_expires_at timestamp with time zone NOT NULL,
    last_inbound_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_templates; Type: TABLE; Schema: moments; Owner: -
--

CREATE TABLE moments.whatsapp_templates (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
    org_id uuid,
    name text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    body text NOT NULL,
    variable_map jsonb DEFAULT '[]'::jsonb NOT NULL,
    external_id text,
    rejected_reason text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_templates_category_check CHECK ((category = ANY (ARRAY['MARKETING'::text, 'UTILITY'::text, 'AUTHENTICATION'::text]))),
    CONSTRAINT whatsapp_templates_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'PAUSED'::text, 'DISABLED'::text])))
);


--
-- Name: COLUMN whatsapp_templates.category; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON COLUMN moments.whatsapp_templates.category IS 'A birthday greeting is MARKETING, not UTILITY -- frequency-capped, opt-in required, counts against quality rating. File address confirmation as UTILITY with wording that earns it ("Confirm your delivery address for an upcoming delivery").';


--
-- Name: action_tokens action_tokens_hash_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.action_tokens
    ADD CONSTRAINT action_tokens_hash_uniq UNIQUE (token_hash);


--
-- Name: action_tokens action_tokens_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.action_tokens
    ADD CONSTRAINT action_tokens_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: cities cities_name_province_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.cities
    ADD CONSTRAINT cities_name_province_uniq UNIQUE (country_code, province, name);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: dead_letters dead_letters_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.dead_letters
    ADD CONSTRAINT dead_letters_pkey PRIMARY KEY (id);


--
-- Name: delivery_proofs delivery_proofs_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.delivery_proofs
    ADD CONSTRAINT delivery_proofs_pkey PRIMARY KEY (id);


--
-- Name: employee_events employee_events_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_events
    ADD CONSTRAINT employee_events_pkey PRIMARY KEY (id);


--
-- Name: employee_import_batches employee_import_batches_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_batches
    ADD CONSTRAINT employee_import_batches_pkey PRIMARY KEY (id);


--
-- Name: employee_import_rows employee_import_rows_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_rows
    ADD CONSTRAINT employee_import_rows_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (key);


--
-- Name: gift_bundle_items gift_bundle_items_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_bundle_items
    ADD CONSTRAINT gift_bundle_items_pkey PRIMARY KEY (bundle_id, product_id);


--
-- Name: gift_bundles gift_bundles_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_bundles
    ADD CONSTRAINT gift_bundles_pkey PRIMARY KEY (id);


--
-- Name: gift_order_items gift_order_items_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_order_items
    ADD CONSTRAINT gift_order_items_pkey PRIMARY KEY (id);


--
-- Name: gift_order_status_history gift_order_status_history_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_order_status_history
    ADD CONSTRAINT gift_order_status_history_pkey PRIMARY KEY (id);


--
-- Name: gift_orders gift_orders_order_number_key; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_order_number_key UNIQUE (order_number);


--
-- Name: gift_orders gift_orders_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_pkey PRIMARY KEY (id);


--
-- Name: gift_products gift_products_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_products
    ADD CONSTRAINT gift_products_pkey PRIMARY KEY (id);


--
-- Name: gift_products gift_products_vendor_sku_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_products
    ADD CONSTRAINT gift_products_vendor_sku_uniq UNIQUE (vendor_id, sku);


--
-- Name: employee_import_rows import_rows_batch_row_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_rows
    ADD CONSTRAINT import_rows_batch_row_uniq UNIQUE (batch_id, row_number);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_number_key; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoices
    ADD CONSTRAINT invoices_number_key UNIQUE (number);


--
-- Name: invoices invoices_org_period_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoices
    ADD CONSTRAINT invoices_org_period_uniq UNIQUE (org_id, period_start, kind);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: job_runs job_runs_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.job_runs
    ADD CONSTRAINT job_runs_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: milestone_tiers milestone_no_overlap; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.milestone_tiers
    ADD CONSTRAINT milestone_no_overlap EXCLUDE USING gist (org_id WITH =, moment_type_id WITH =, years_range WITH &&) WHERE (is_active);


--
-- Name: milestone_tiers milestone_tiers_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.milestone_tiers
    ADD CONSTRAINT milestone_tiers_pkey PRIMARY KEY (id);


--
-- Name: moment_events moment_events_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_events
    ADD CONSTRAINT moment_events_pkey PRIMARY KEY (id);


--
-- Name: moment_policies moment_policies_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_policies
    ADD CONSTRAINT moment_policies_pkey PRIMARY KEY (id);


--
-- Name: moment_policies moment_policies_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_policies
    ADD CONSTRAINT moment_policies_uniq UNIQUE (org_id, moment_type_id);


--
-- Name: moment_tasks moment_tasks_event_type_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_tasks
    ADD CONSTRAINT moment_tasks_event_type_uniq UNIQUE (moment_event_id, task_type);


--
-- Name: moment_tasks moment_tasks_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_tasks
    ADD CONSTRAINT moment_tasks_pkey PRIMARY KEY (id);


--
-- Name: moment_types moment_types_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_types
    ADD CONSTRAINT moment_types_pkey PRIMARY KEY (id);


--
-- Name: observance_dates observance_dates_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.observance_dates
    ADD CONSTRAINT observance_dates_pkey PRIMARY KEY (id);


--
-- Name: observance_dates observance_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.observance_dates
    ADD CONSTRAINT observance_uniq UNIQUE (country_code, observance, hijri_year);


--
-- Name: offices offices_org_name_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.offices
    ADD CONSTRAINT offices_org_name_uniq UNIQUE (org_id, name);


--
-- Name: offices offices_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.offices
    ADD CONSTRAINT offices_pkey PRIMARY KEY (id);


--
-- Name: org_integrations org_integrations_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_integrations
    ADD CONSTRAINT org_integrations_pkey PRIMARY KEY (id);


--
-- Name: org_integrations org_integrations_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_integrations
    ADD CONSTRAINT org_integrations_uniq UNIQUE (org_id, provider, external_account_id);


--
-- Name: org_members org_members_org_user_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_members
    ADD CONSTRAINT org_members_org_user_uniq UNIQUE (org_id, user_id);


--
-- Name: org_members org_members_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_members
    ADD CONSTRAINT org_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: outbound_message_events outbound_message_events_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_message_events
    ADD CONSTRAINT outbound_message_events_pkey PRIMARY KEY (id);


--
-- Name: outbound_messages outbound_messages_idem_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_messages
    ADD CONSTRAINT outbound_messages_idem_uniq UNIQUE (idempotency_key);


--
-- Name: outbound_messages outbound_messages_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_messages
    ADD CONSTRAINT outbound_messages_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plans plans_code_key; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.plans
    ADD CONSTRAINT plans_code_key UNIQUE (code);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_buckets rate_limit_buckets_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.rate_limit_buckets
    ADD CONSTRAINT rate_limit_buckets_pkey PRIMARY KEY (bucket_key, window_start);


--
-- Name: staff_users staff_users_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.staff_users
    ADD CONSTRAINT staff_users_pkey PRIMARY KEY (user_id);


--
-- Name: subscriptions subscriptions_no_overlap; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.subscriptions
    ADD CONSTRAINT subscriptions_no_overlap EXCLUDE USING gist (org_id WITH =, period WITH &&) WHERE ((status = ANY (ARRAY['trialing'::moments.subscription_status, 'active'::moments.subscription_status, 'past_due'::moments.subscription_status])));


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: suppressions suppressions_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.suppressions
    ADD CONSTRAINT suppressions_pkey PRIMARY KEY (id);


--
-- Name: suppressions suppressions_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.suppressions
    ADD CONSTRAINT suppressions_uniq UNIQUE (org_id, channel, target);


--
-- Name: task_attempts task_attempts_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.task_attempts
    ADD CONSTRAINT task_attempts_pkey PRIMARY KEY (id);


--
-- Name: token_events token_events_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.token_events
    ADD CONSTRAINT token_events_pkey PRIMARY KEY (id);


--
-- Name: vendor_city_coverage vendor_city_coverage_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.vendor_city_coverage
    ADD CONSTRAINT vendor_city_coverage_pkey PRIMARY KEY (vendor_id, city_id);


--
-- Name: vendors vendors_name_key; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.vendors
    ADD CONSTRAINT vendors_name_key UNIQUE (name);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: wallet_accounts wallet_accounts_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.wallet_accounts
    ADD CONSTRAINT wallet_accounts_pkey PRIMARY KEY (org_id);


--
-- Name: wallet_ledger wallet_ledger_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.wallet_ledger
    ADD CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_uniq UNIQUE (org_id, wa_id);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_uniq; Type: CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_uniq UNIQUE (org_id, name, language);


--
-- Name: action_tokens_expiry_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX action_tokens_expiry_idx ON moments.action_tokens USING btree (expires_at) WHERE ((consumed_at IS NULL) AND (revoked_at IS NULL));


--
-- Name: action_tokens_lookup_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX action_tokens_lookup_idx ON moments.action_tokens USING btree (token_lookup);


--
-- Name: action_tokens_subject_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX action_tokens_subject_idx ON moments.action_tokens USING btree (subject_type, subject_id);


--
-- Name: addresses_city_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX addresses_city_idx ON moments.addresses USING btree (city_id) WHERE is_active;


--
-- Name: addresses_employee_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX addresses_employee_idx ON moments.addresses USING btree (employee_id, is_active);


--
-- Name: addresses_one_primary_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX addresses_one_primary_idx ON moments.addresses USING btree (employee_id) WHERE (is_primary AND is_active);


--
-- Name: addresses_org_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX addresses_org_status_idx ON moments.addresses USING btree (org_id, verification_status);


--
-- Name: addresses_stale_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX addresses_stale_idx ON moments.addresses USING btree (verification_expires_at) WHERE (is_active AND (verification_expires_at IS NOT NULL));


--
-- Name: alerts_open_dedupe_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX alerts_open_dedupe_uniq ON moments.alerts USING btree (dedupe_key) WHERE (status = 'open'::moments.alert_status);


--
-- Name: alerts_open_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX alerts_open_idx ON moments.alerts USING btree (severity, created_at DESC) WHERE (status = 'open'::moments.alert_status);


--
-- Name: approval_requests_autoapprove_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX approval_requests_autoapprove_idx ON moments.approval_requests USING btree (auto_approve_at) WHERE ((status = 'pending'::moments.approval_decision) AND auto_approve_on_timeout);


--
-- Name: approval_requests_event_open_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX approval_requests_event_open_uniq ON moments.approval_requests USING btree (moment_event_id) WHERE (status = 'pending'::moments.approval_decision);


--
-- Name: approval_requests_org_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX approval_requests_org_status_idx ON moments.approval_requests USING btree (org_id, status, expires_at);


--
-- Name: audit_log_actor_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX audit_log_actor_idx ON moments.audit_log USING btree (actor_user_id, created_at DESC) WHERE (actor_user_id IS NOT NULL);


--
-- Name: audit_log_entity_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX audit_log_entity_idx ON moments.audit_log USING btree (entity, entity_id, created_at DESC);


--
-- Name: audit_log_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX audit_log_org_idx ON moments.audit_log USING btree (org_id, created_at DESC);


--
-- Name: cities_name_trgm_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX cities_name_trgm_idx ON moments.cities USING gin (name extensions.gin_trgm_ops);


--
-- Name: cities_serviceable_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX cities_serviceable_idx ON moments.cities USING btree (is_serviceable, name);


--
-- Name: dead_letters_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX dead_letters_org_idx ON moments.dead_letters USING btree (org_id, created_at DESC);


--
-- Name: delivery_proofs_order_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX delivery_proofs_order_idx ON moments.delivery_proofs USING btree (order_id);


--
-- Name: employee_events_detect_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employee_events_detect_idx ON moments.employee_events USING btree (event_date, org_id) WHERE is_celebrated;


--
-- Name: employee_events_employee_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employee_events_employee_idx ON moments.employee_events USING btree (employee_id, event_date DESC);


--
-- Name: employees_birth_mmdd_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employees_birth_mmdd_idx ON moments.employees USING btree (birth_mmdd, org_id) WHERE ((status = ANY (ARRAY['active'::moments.employee_status, 'on_leave'::moments.employee_status])) AND (celebration_opt_out = false) AND (deleted_at IS NULL) AND (date_of_birth IS NOT NULL));


--
-- Name: employees_hire_mmdd_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employees_hire_mmdd_idx ON moments.employees USING btree (hire_mmdd, org_id) WHERE ((status = ANY (ARRAY['active'::moments.employee_status, 'on_leave'::moments.employee_status])) AND (celebration_opt_out = false) AND (deleted_at IS NULL) AND (hire_date IS NOT NULL));


--
-- Name: employees_manager_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employees_manager_idx ON moments.employees USING btree (manager_id) WHERE (manager_id IS NOT NULL);


--
-- Name: employees_name_trgm_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employees_name_trgm_idx ON moments.employees USING gin (full_name extensions.gin_trgm_ops);


--
-- Name: employees_org_code_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX employees_org_code_uniq ON moments.employees USING btree (org_id, employee_code) WHERE ((employee_code IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: employees_org_office_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employees_org_office_idx ON moments.employees USING btree (org_id, office_id);


--
-- Name: employees_org_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employees_org_status_idx ON moments.employees USING btree (org_id, status) WHERE (deleted_at IS NULL);


--
-- Name: employees_org_wemail_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX employees_org_wemail_uniq ON moments.employees USING btree (org_id, work_email) WHERE ((work_email IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: employees_user_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX employees_user_idx ON moments.employees USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: gift_order_items_order_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_order_items_order_idx ON moments.gift_order_items USING btree (order_id);


--
-- Name: gift_orders_city_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_orders_city_idx ON moments.gift_orders USING btree (city_id, deliver_on);


--
-- Name: gift_orders_event_active_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX gift_orders_event_active_uniq ON moments.gift_orders USING btree (moment_event_id) WHERE (status <> 'cancelled'::moments.order_status);


--
-- Name: gift_orders_ops_queue_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_orders_ops_queue_idx ON moments.gift_orders USING btree (deliver_on, ops_sla_due_at) WHERE (status = ANY (ARRAY['queued_for_ops'::moments.order_status, 'approved'::moments.order_status, 'placed_with_vendor'::moments.order_status, 'in_transit'::moments.order_status]));


--
-- Name: gift_orders_org_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_orders_org_status_idx ON moments.gift_orders USING btree (org_id, status, deliver_on);


--
-- Name: gift_orders_uninvoiced_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_orders_uninvoiced_idx ON moments.gift_orders USING btree (org_id, delivered_at) WHERE ((status = 'delivered'::moments.order_status) AND (invoice_id IS NULL));


--
-- Name: gift_products_budget_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_products_budget_idx ON moments.gift_products USING btree (category, list_price_paisa) WHERE is_active;


--
-- Name: gift_products_digital_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_products_digital_idx ON moments.gift_products USING btree (list_price_paisa) WHERE (is_active AND is_digital);


--
-- Name: gift_products_moment_keys_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_products_moment_keys_idx ON moments.gift_products USING gin (suitable_moment_keys);


--
-- Name: gift_products_tags_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_products_tags_idx ON moments.gift_products USING gin (tags);


--
-- Name: gift_products_vendor_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX gift_products_vendor_idx ON moments.gift_products USING btree (vendor_id) WHERE is_active;


--
-- Name: import_batches_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX import_batches_org_idx ON moments.employee_import_batches USING btree (org_id, created_at DESC);


--
-- Name: import_rows_batch_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX import_rows_batch_status_idx ON moments.employee_import_rows USING btree (batch_id, status);


--
-- Name: invitations_pending_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX invitations_pending_uniq ON moments.invitations USING btree (org_id, email) WHERE ((accepted_at IS NULL) AND (revoked_at IS NULL));


--
-- Name: invoice_lines_invoice_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX invoice_lines_invoice_idx ON moments.invoice_lines USING btree (invoice_id);


--
-- Name: invoices_org_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX invoices_org_status_idx ON moments.invoices USING btree (org_id, status, due_on);


--
-- Name: job_runs_kind_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX job_runs_kind_idx ON moments.job_runs USING btree (kind, started_at DESC);


--
-- Name: message_templates_lookup_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX message_templates_lookup_idx ON moments.message_templates USING btree (moment_type_id, channel, audience, locale) WHERE is_active;


--
-- Name: message_templates_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX message_templates_uniq ON moments.message_templates USING btree (org_id, moment_type_id, channel, audience, locale, tone) NULLS NOT DISTINCT;


--
-- Name: milestone_tiers_lookup_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX milestone_tiers_lookup_idx ON moments.milestone_tiers USING btree (org_id, moment_type_id);


--
-- Name: moment_events_employee_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_events_employee_idx ON moments.moment_events USING btree (employee_id, occurs_on DESC);


--
-- Name: moment_events_occurrence_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX moment_events_occurrence_uniq ON moments.moment_events USING btree (org_id, employee_id, moment_type_id, occurrence_key) NULLS NOT DISTINCT;


--
-- Name: moment_events_open_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_events_open_idx ON moments.moment_events USING btree (occurs_on) WHERE (status <> ALL (ARRAY['completed'::moments.moment_status, 'cancelled'::moments.moment_status, 'skipped'::moments.moment_status, 'rejected'::moments.moment_status]));


--
-- Name: moment_events_org_calendar_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_events_org_calendar_idx ON moments.moment_events USING btree (org_id, occurs_on DESC);


--
-- Name: moment_events_org_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_events_org_status_idx ON moments.moment_events USING btree (org_id, status, occurs_on);


--
-- Name: moment_events_provisional_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_events_provisional_idx ON moments.moment_events USING btree (source_ref_id) WHERE is_provisional;


--
-- Name: moment_policies_org_enabled_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_policies_org_enabled_idx ON moments.moment_policies USING btree (org_id) WHERE is_enabled;


--
-- Name: moment_tasks_due_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_tasks_due_idx ON moments.moment_tasks USING btree (lane, priority, next_attempt_at, id) WHERE (status = 'pending'::moments.task_status);


--
-- Name: INDEX moment_tasks_due_idx; Type: COMMENT; Schema: moments; Owner: -
--

COMMENT ON INDEX moments.moment_tasks_due_idx IS 'Partial on status=pending, so a succeeded task leaves the index entirely. Keeps the hot index proportional to PENDING WORK rather than total history -- the difference between a 3 MB index and a 3 GB one after two years.';


--
-- Name: moment_tasks_event_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_tasks_event_idx ON moments.moment_tasks USING btree (moment_event_id, scheduled_for);


--
-- Name: moment_tasks_failed_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_tasks_failed_idx ON moments.moment_tasks USING btree (org_id, updated_at DESC) WHERE (status = ANY (ARRAY['failed'::moments.task_status, 'dead'::moments.task_status]));


--
-- Name: moment_tasks_lease_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_tasks_lease_idx ON moments.moment_tasks USING btree (lease_expires_at) WHERE (status = 'running'::moments.task_status);


--
-- Name: moment_types_active_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX moment_types_active_idx ON moments.moment_types USING btree (is_active, category, sort_order);


--
-- Name: moment_types_org_key_uniq; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX moment_types_org_key_uniq ON moments.moment_types USING btree (org_id, key) NULLS NOT DISTINCT;


--
-- Name: observance_lookup_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX observance_lookup_idx ON moments.observance_dates USING btree (country_code, observance, gregorian_date);


--
-- Name: offices_one_default_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX offices_one_default_idx ON moments.offices USING btree (org_id) WHERE is_default;


--
-- Name: order_status_history_order_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX order_status_history_order_idx ON moments.gift_order_status_history USING btree (order_id, occurred_at);


--
-- Name: org_integrations_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX org_integrations_org_idx ON moments.org_integrations USING btree (org_id, provider) WHERE (status = 'connected'::moments.integration_status);


--
-- Name: org_members_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX org_members_org_idx ON moments.org_members USING btree (org_id, role);


--
-- Name: org_members_user_active_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX org_members_user_active_idx ON moments.org_members USING btree (user_id) WHERE (status = 'active'::moments.membership_status);


--
-- Name: organizations_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX organizations_status_idx ON moments.organizations USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: outbound_message_events_msg_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX outbound_message_events_msg_idx ON moments.outbound_message_events USING btree (message_id, occurred_at DESC);


--
-- Name: outbound_messages_event_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX outbound_messages_event_idx ON moments.outbound_messages USING btree (moment_event_id);


--
-- Name: outbound_messages_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX outbound_messages_org_idx ON moments.outbound_messages USING btree (org_id, created_at DESC);


--
-- Name: outbound_messages_provider_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX outbound_messages_provider_idx ON moments.outbound_messages USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL);


--
-- Name: outbound_messages_stuck_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX outbound_messages_stuck_idx ON moments.outbound_messages USING btree (updated_at) WHERE (status = 'sending'::moments.message_status);


--
-- Name: payments_org_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX payments_org_status_idx ON moments.payments USING btree (org_id, status, submitted_at DESC);


--
-- Name: payments_pending_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX payments_pending_idx ON moments.payments USING btree (submitted_at) WHERE (status = ANY (ARRAY['reported'::moments.payment_status, 'under_review'::moments.payment_status]));


--
-- Name: profiles_email_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE UNIQUE INDEX profiles_email_idx ON moments.profiles USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: rate_limit_window_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX rate_limit_window_idx ON moments.rate_limit_buckets USING btree (window_start);


--
-- Name: subscriptions_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX subscriptions_org_idx ON moments.subscriptions USING btree (org_id, status);


--
-- Name: task_attempts_task_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX task_attempts_task_idx ON moments.task_attempts USING btree (task_id, attempt);


--
-- Name: token_events_token_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX token_events_token_idx ON moments.token_events USING btree (token_id, occurred_at DESC);


--
-- Name: vendor_coverage_city_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX vendor_coverage_city_idx ON moments.vendor_city_coverage USING btree (city_id, lead_time_days) WHERE is_active;


--
-- Name: wallet_ledger_org_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX wallet_ledger_org_idx ON moments.wallet_ledger USING btree (org_id, created_at DESC);


--
-- Name: whatsapp_sessions_window_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX whatsapp_sessions_window_idx ON moments.whatsapp_sessions USING btree (window_expires_at);


--
-- Name: whatsapp_templates_status_idx; Type: INDEX; Schema: moments; Owner: -
--

CREATE INDEX whatsapp_templates_status_idx ON moments.whatsapp_templates USING btree (status);


--
-- Name: addresses trg_addresses_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON moments.addresses FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: addresses trg_addresses_verification_expiry; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_addresses_verification_expiry BEFORE INSERT OR UPDATE OF verified_at ON moments.addresses FOR EACH ROW EXECUTE FUNCTION moments.set_address_verification_expiry();


--
-- Name: alerts trg_alerts_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON moments.alerts FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: approval_requests trg_approval_requests_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_approval_requests_updated_at BEFORE UPDATE ON moments.approval_requests FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: cities trg_cities_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_cities_updated_at BEFORE UPDATE ON moments.cities FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: employee_events trg_employee_events_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_employee_events_updated_at BEFORE UPDATE ON moments.employee_events FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: employees trg_employees_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON moments.employees FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: feature_flags trg_feature_flags_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON moments.feature_flags FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: gift_bundles trg_gift_bundles_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_gift_bundles_updated_at BEFORE UPDATE ON moments.gift_bundles FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: gift_orders trg_gift_orders_status_history; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_gift_orders_status_history AFTER INSERT OR UPDATE OF status ON moments.gift_orders FOR EACH ROW EXECUTE FUNCTION moments.log_order_status_change();


--
-- Name: gift_orders trg_gift_orders_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_gift_orders_updated_at BEFORE UPDATE ON moments.gift_orders FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: gift_products trg_gift_products_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_gift_products_updated_at BEFORE UPDATE ON moments.gift_products FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: employee_import_batches trg_import_batches_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_import_batches_updated_at BEFORE UPDATE ON moments.employee_import_batches FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: employee_import_rows trg_import_rows_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_import_rows_updated_at BEFORE UPDATE ON moments.employee_import_rows FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: invitations trg_invitations_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON moments.invitations FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: invoices trg_invoices_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON moments.invoices FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: message_templates trg_message_templates_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_message_templates_updated_at BEFORE UPDATE ON moments.message_templates FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: milestone_tiers trg_milestone_tiers_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_milestone_tiers_updated_at BEFORE UPDATE ON moments.milestone_tiers FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: moment_events trg_moment_events_announce_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_moment_events_announce_at BEFORE INSERT OR UPDATE OF occurs_on, announce_local_time, timezone ON moments.moment_events FOR EACH ROW EXECUTE FUNCTION moments.set_moment_announce_at();


--
-- Name: moment_events trg_moment_events_guard_status; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_moment_events_guard_status BEFORE UPDATE ON moments.moment_events FOR EACH ROW EXECUTE FUNCTION moments.guard_moment_event_status();


--
-- Name: moment_events trg_moment_events_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_moment_events_updated_at BEFORE UPDATE ON moments.moment_events FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: moment_policies trg_moment_policies_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_moment_policies_updated_at BEFORE UPDATE ON moments.moment_policies FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: moment_tasks trg_moment_tasks_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_moment_tasks_updated_at BEFORE UPDATE ON moments.moment_tasks FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: moment_types trg_moment_types_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_moment_types_updated_at BEFORE UPDATE ON moments.moment_types FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: observance_dates trg_observance_dates_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_observance_dates_updated_at BEFORE UPDATE ON moments.observance_dates FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: offices trg_offices_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_offices_updated_at BEFORE UPDATE ON moments.offices FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: org_integrations trg_org_integrations_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_org_integrations_updated_at BEFORE UPDATE ON moments.org_integrations FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: org_members trg_org_members_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_org_members_updated_at BEFORE UPDATE ON moments.org_members FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: organizations trg_organizations_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON moments.organizations FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: outbound_messages trg_outbound_messages_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_outbound_messages_updated_at BEFORE UPDATE ON moments.outbound_messages FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: payments trg_payments_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON moments.payments FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: plans trg_plans_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON moments.plans FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON moments.profiles FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: staff_users trg_staff_users_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_staff_users_updated_at BEFORE UPDATE ON moments.staff_users FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: subscriptions trg_subscriptions_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON moments.subscriptions FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: vendor_city_coverage trg_vendor_coverage_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_vendor_coverage_updated_at BEFORE UPDATE ON moments.vendor_city_coverage FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: vendors trg_vendors_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON moments.vendors FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: wallet_accounts trg_wallet_accounts_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_wallet_accounts_updated_at BEFORE UPDATE ON moments.wallet_accounts FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: whatsapp_sessions trg_whatsapp_sessions_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_whatsapp_sessions_updated_at BEFORE UPDATE ON moments.whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: whatsapp_templates trg_whatsapp_templates_updated_at; Type: TRIGGER; Schema: moments; Owner: -
--

CREATE TRIGGER trg_whatsapp_templates_updated_at BEFORE UPDATE ON moments.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();


--
-- Name: action_tokens action_tokens_created_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.action_tokens
    ADD CONSTRAINT action_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: action_tokens action_tokens_moment_event_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.action_tokens
    ADD CONSTRAINT action_tokens_moment_event_id_fkey FOREIGN KEY (moment_event_id) REFERENCES moments.moment_events(id) ON DELETE CASCADE;


--
-- Name: action_tokens action_tokens_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.action_tokens
    ADD CONSTRAINT action_tokens_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: addresses addresses_city_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.addresses
    ADD CONSTRAINT addresses_city_id_fkey FOREIGN KEY (city_id) REFERENCES moments.cities(id) ON DELETE SET NULL;


--
-- Name: addresses addresses_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.addresses
    ADD CONSTRAINT addresses_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE CASCADE;


--
-- Name: addresses addresses_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.addresses
    ADD CONSTRAINT addresses_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: addresses addresses_verified_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.addresses
    ADD CONSTRAINT addresses_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: alerts alerts_acked_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.alerts
    ADD CONSTRAINT alerts_acked_by_fkey FOREIGN KEY (acked_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: alerts alerts_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.alerts
    ADD CONSTRAINT alerts_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: approval_requests approval_requests_approver_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_approver_employee_id_fkey FOREIGN KEY (approver_employee_id) REFERENCES moments.employees(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_gift_order_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_gift_order_id_fkey FOREIGN KEY (gift_order_id) REFERENCES moments.gift_orders(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_moment_event_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_moment_event_id_fkey FOREIGN KEY (moment_event_id) REFERENCES moments.moment_events(id) ON DELETE CASCADE;


--
-- Name: approval_requests approval_requests_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: approval_requests approval_requests_responder_user_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_responder_user_id_fkey FOREIGN KEY (responder_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_task_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_task_id_fkey FOREIGN KEY (task_id) REFERENCES moments.moment_tasks(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_token_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.approval_requests
    ADD CONSTRAINT approval_requests_token_id_fkey FOREIGN KEY (token_id) REFERENCES moments.action_tokens(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.audit_log
    ADD CONSTRAINT audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.audit_log
    ADD CONSTRAINT audit_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: dead_letters dead_letters_moment_event_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.dead_letters
    ADD CONSTRAINT dead_letters_moment_event_id_fkey FOREIGN KEY (moment_event_id) REFERENCES moments.moment_events(id) ON DELETE SET NULL;


--
-- Name: dead_letters dead_letters_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.dead_letters
    ADD CONSTRAINT dead_letters_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: dead_letters dead_letters_replayed_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.dead_letters
    ADD CONSTRAINT dead_letters_replayed_by_fkey FOREIGN KEY (replayed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: dead_letters dead_letters_task_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.dead_letters
    ADD CONSTRAINT dead_letters_task_id_fkey FOREIGN KEY (task_id) REFERENCES moments.moment_tasks(id) ON DELETE SET NULL;


--
-- Name: delivery_proofs delivery_proofs_order_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.delivery_proofs
    ADD CONSTRAINT delivery_proofs_order_id_fkey FOREIGN KEY (order_id) REFERENCES moments.gift_orders(id) ON DELETE CASCADE;


--
-- Name: delivery_proofs delivery_proofs_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.delivery_proofs
    ADD CONSTRAINT delivery_proofs_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: delivery_proofs delivery_proofs_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.delivery_proofs
    ADD CONSTRAINT delivery_proofs_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_events employee_events_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_events
    ADD CONSTRAINT employee_events_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE CASCADE;


--
-- Name: employee_events employee_events_moment_type_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_events
    ADD CONSTRAINT employee_events_moment_type_id_fkey FOREIGN KEY (moment_type_id) REFERENCES moments.moment_types(id) ON DELETE RESTRICT;


--
-- Name: employee_events employee_events_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_events
    ADD CONSTRAINT employee_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: employee_events employee_events_recorded_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_events
    ADD CONSTRAINT employee_events_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_import_batches employee_import_batches_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_batches
    ADD CONSTRAINT employee_import_batches_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: employee_import_batches employee_import_batches_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_batches
    ADD CONSTRAINT employee_import_batches_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_import_rows employee_import_rows_batch_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_rows
    ADD CONSTRAINT employee_import_rows_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES moments.employee_import_batches(id) ON DELETE CASCADE;


--
-- Name: employee_import_rows employee_import_rows_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_rows
    ADD CONSTRAINT employee_import_rows_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE SET NULL;


--
-- Name: employee_import_rows employee_import_rows_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employee_import_rows
    ADD CONSTRAINT employee_import_rows_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: employees employees_import_batch_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employees
    ADD CONSTRAINT employees_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES moments.employee_import_batches(id) ON DELETE SET NULL;


--
-- Name: employees employees_manager_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employees
    ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES moments.employees(id) ON DELETE SET NULL;


--
-- Name: employees employees_office_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employees
    ADD CONSTRAINT employees_office_id_fkey FOREIGN KEY (office_id) REFERENCES moments.offices(id) ON DELETE SET NULL;


--
-- Name: employees employees_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employees
    ADD CONSTRAINT employees_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: gift_bundle_items gift_bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_bundle_items
    ADD CONSTRAINT gift_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES moments.gift_bundles(id) ON DELETE CASCADE;


--
-- Name: gift_bundle_items gift_bundle_items_product_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_bundle_items
    ADD CONSTRAINT gift_bundle_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES moments.gift_products(id) ON DELETE RESTRICT;


--
-- Name: gift_bundles gift_bundles_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_bundles
    ADD CONSTRAINT gift_bundles_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: gift_order_items gift_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_order_items
    ADD CONSTRAINT gift_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES moments.gift_orders(id) ON DELETE CASCADE;


--
-- Name: gift_order_items gift_order_items_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_order_items
    ADD CONSTRAINT gift_order_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: gift_order_items gift_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_order_items
    ADD CONSTRAINT gift_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES moments.gift_products(id) ON DELETE SET NULL;


--
-- Name: gift_order_status_history gift_order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_order_status_history
    ADD CONSTRAINT gift_order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES moments.gift_orders(id) ON DELETE CASCADE;


--
-- Name: gift_order_status_history gift_order_status_history_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_order_status_history
    ADD CONSTRAINT gift_order_status_history_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: gift_orders gift_orders_address_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES moments.addresses(id) ON DELETE SET NULL;


--
-- Name: gift_orders gift_orders_assigned_staff_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: gift_orders gift_orders_city_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_city_id_fkey FOREIGN KEY (city_id) REFERENCES moments.cities(id) ON DELETE SET NULL;


--
-- Name: gift_orders gift_orders_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE SET NULL;


--
-- Name: gift_orders gift_orders_invoice_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES moments.invoices(id) ON DELETE SET NULL;


--
-- Name: gift_orders gift_orders_moment_event_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_moment_event_id_fkey FOREIGN KEY (moment_event_id) REFERENCES moments.moment_events(id) ON DELETE RESTRICT;


--
-- Name: gift_orders gift_orders_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE RESTRICT;


--
-- Name: gift_orders gift_orders_over_budget_approved_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_over_budget_approved_by_fkey FOREIGN KEY (over_budget_approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: gift_orders gift_orders_placed_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_placed_by_fkey FOREIGN KEY (placed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: gift_orders gift_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_orders
    ADD CONSTRAINT gift_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES moments.vendors(id) ON DELETE RESTRICT;


--
-- Name: gift_products gift_products_vendor_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.gift_products
    ADD CONSTRAINT gift_products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES moments.vendors(id) ON DELETE RESTRICT;


--
-- Name: invitations invitations_accepted_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invitations
    ADD CONSTRAINT invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: invitations invitations_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invitations
    ADD CONSTRAINT invitations_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_token_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invitations
    ADD CONSTRAINT invitations_token_id_fkey FOREIGN KEY (token_id) REFERENCES moments.action_tokens(id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_gift_order_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoice_lines
    ADD CONSTRAINT invoice_lines_gift_order_id_fkey FOREIGN KEY (gift_order_id) REFERENCES moments.gift_orders(id) ON DELETE SET NULL;


--
-- Name: invoice_lines invoice_lines_invoice_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES moments.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_moment_event_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoice_lines
    ADD CONSTRAINT invoice_lines_moment_event_id_fkey FOREIGN KEY (moment_event_id) REFERENCES moments.moment_events(id) ON DELETE SET NULL;


--
-- Name: invoice_lines invoice_lines_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoice_lines
    ADD CONSTRAINT invoice_lines_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.invoices
    ADD CONSTRAINT invoices_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE RESTRICT;


--
-- Name: job_runs job_runs_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.job_runs
    ADD CONSTRAINT job_runs_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: message_templates message_templates_moment_type_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.message_templates
    ADD CONSTRAINT message_templates_moment_type_id_fkey FOREIGN KEY (moment_type_id) REFERENCES moments.moment_types(id) ON DELETE CASCADE;


--
-- Name: message_templates message_templates_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.message_templates
    ADD CONSTRAINT message_templates_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: message_templates message_templates_whatsapp_template_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.message_templates
    ADD CONSTRAINT message_templates_whatsapp_template_id_fkey FOREIGN KEY (whatsapp_template_id) REFERENCES moments.whatsapp_templates(id) ON DELETE SET NULL;


--
-- Name: milestone_tiers milestone_tiers_bundle_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.milestone_tiers
    ADD CONSTRAINT milestone_tiers_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES moments.gift_bundles(id) ON DELETE SET NULL;


--
-- Name: milestone_tiers milestone_tiers_moment_type_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.milestone_tiers
    ADD CONSTRAINT milestone_tiers_moment_type_id_fkey FOREIGN KEY (moment_type_id) REFERENCES moments.moment_types(id) ON DELETE CASCADE;


--
-- Name: milestone_tiers milestone_tiers_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.milestone_tiers
    ADD CONSTRAINT milestone_tiers_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: moment_events moment_events_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_events
    ADD CONSTRAINT moment_events_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE CASCADE;


--
-- Name: moment_events moment_events_gift_order_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_events
    ADD CONSTRAINT moment_events_gift_order_id_fkey FOREIGN KEY (gift_order_id) REFERENCES moments.gift_orders(id) ON DELETE SET NULL;


--
-- Name: moment_events moment_events_milestone_tier_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_events
    ADD CONSTRAINT moment_events_milestone_tier_id_fkey FOREIGN KEY (milestone_tier_id) REFERENCES moments.milestone_tiers(id) ON DELETE SET NULL;


--
-- Name: moment_events moment_events_moment_type_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_events
    ADD CONSTRAINT moment_events_moment_type_id_fkey FOREIGN KEY (moment_type_id) REFERENCES moments.moment_types(id) ON DELETE RESTRICT;


--
-- Name: moment_events moment_events_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_events
    ADD CONSTRAINT moment_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: moment_events moment_events_policy_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_events
    ADD CONSTRAINT moment_events_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES moments.moment_policies(id) ON DELETE SET NULL;


--
-- Name: moment_policies moment_policies_default_bundle_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_policies
    ADD CONSTRAINT moment_policies_default_bundle_id_fkey FOREIGN KEY (default_bundle_id) REFERENCES moments.gift_bundles(id) ON DELETE SET NULL;


--
-- Name: moment_policies moment_policies_moment_type_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_policies
    ADD CONSTRAINT moment_policies_moment_type_id_fkey FOREIGN KEY (moment_type_id) REFERENCES moments.moment_types(id) ON DELETE CASCADE;


--
-- Name: moment_policies moment_policies_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_policies
    ADD CONSTRAINT moment_policies_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: moment_tasks moment_tasks_moment_event_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_tasks
    ADD CONSTRAINT moment_tasks_moment_event_id_fkey FOREIGN KEY (moment_event_id) REFERENCES moments.moment_events(id) ON DELETE CASCADE;


--
-- Name: moment_tasks moment_tasks_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_tasks
    ADD CONSTRAINT moment_tasks_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: moment_types moment_types_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.moment_types
    ADD CONSTRAINT moment_types_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: observance_dates observance_dates_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.observance_dates
    ADD CONSTRAINT observance_dates_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: offices offices_city_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.offices
    ADD CONSTRAINT offices_city_id_fkey FOREIGN KEY (city_id) REFERENCES moments.cities(id) ON DELETE SET NULL;


--
-- Name: offices offices_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.offices
    ADD CONSTRAINT offices_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: org_integrations org_integrations_installed_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_integrations
    ADD CONSTRAINT org_integrations_installed_by_fkey FOREIGN KEY (installed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: org_integrations org_integrations_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_integrations
    ADD CONSTRAINT org_integrations_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: org_members org_members_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_members
    ADD CONSTRAINT org_members_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE SET NULL;


--
-- Name: org_members org_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_members
    ADD CONSTRAINT org_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: org_members org_members_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_members
    ADD CONSTRAINT org_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: org_members org_members_user_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.org_members
    ADD CONSTRAINT org_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_billing_city_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.organizations
    ADD CONSTRAINT organizations_billing_city_id_fkey FOREIGN KEY (billing_city_id) REFERENCES moments.cities(id) ON DELETE SET NULL;


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: outbound_message_events outbound_message_events_message_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_message_events
    ADD CONSTRAINT outbound_message_events_message_id_fkey FOREIGN KEY (message_id) REFERENCES moments.outbound_messages(id) ON DELETE CASCADE;


--
-- Name: outbound_message_events outbound_message_events_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_message_events
    ADD CONSTRAINT outbound_message_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: outbound_messages outbound_messages_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_messages
    ADD CONSTRAINT outbound_messages_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE SET NULL;


--
-- Name: outbound_messages outbound_messages_moment_event_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_messages
    ADD CONSTRAINT outbound_messages_moment_event_id_fkey FOREIGN KEY (moment_event_id) REFERENCES moments.moment_events(id) ON DELETE CASCADE;


--
-- Name: outbound_messages outbound_messages_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_messages
    ADD CONSTRAINT outbound_messages_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: outbound_messages outbound_messages_task_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_messages
    ADD CONSTRAINT outbound_messages_task_id_fkey FOREIGN KEY (task_id) REFERENCES moments.moment_tasks(id) ON DELETE SET NULL;


--
-- Name: outbound_messages outbound_messages_template_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.outbound_messages
    ADD CONSTRAINT outbound_messages_template_id_fkey FOREIGN KEY (template_id) REFERENCES moments.message_templates(id) ON DELETE SET NULL;


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES moments.invoices(id) ON DELETE SET NULL;


--
-- Name: payments payments_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.payments
    ADD CONSTRAINT payments_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE RESTRICT;


--
-- Name: payments payments_submitted_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.payments
    ADD CONSTRAINT payments_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_verified_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.payments
    ADD CONSTRAINT payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_default_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.profiles
    ADD CONSTRAINT profiles_default_org_id_fkey FOREIGN KEY (default_org_id) REFERENCES moments.organizations(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: staff_users staff_users_user_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.staff_users
    ADD CONSTRAINT staff_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.subscriptions
    ADD CONSTRAINT subscriptions_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES moments.plans(id) ON DELETE RESTRICT;


--
-- Name: suppressions suppressions_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.suppressions
    ADD CONSTRAINT suppressions_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: task_attempts task_attempts_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.task_attempts
    ADD CONSTRAINT task_attempts_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: task_attempts task_attempts_task_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.task_attempts
    ADD CONSTRAINT task_attempts_task_id_fkey FOREIGN KEY (task_id) REFERENCES moments.moment_tasks(id) ON DELETE CASCADE;


--
-- Name: token_events token_events_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.token_events
    ADD CONSTRAINT token_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: token_events token_events_token_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.token_events
    ADD CONSTRAINT token_events_token_id_fkey FOREIGN KEY (token_id) REFERENCES moments.action_tokens(id) ON DELETE CASCADE;


--
-- Name: vendor_city_coverage vendor_city_coverage_city_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.vendor_city_coverage
    ADD CONSTRAINT vendor_city_coverage_city_id_fkey FOREIGN KEY (city_id) REFERENCES moments.cities(id) ON DELETE CASCADE;


--
-- Name: vendor_city_coverage vendor_city_coverage_vendor_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.vendor_city_coverage
    ADD CONSTRAINT vendor_city_coverage_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES moments.vendors(id) ON DELETE CASCADE;


--
-- Name: wallet_accounts wallet_accounts_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.wallet_accounts
    ADD CONSTRAINT wallet_accounts_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: wallet_ledger wallet_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.wallet_ledger
    ADD CONSTRAINT wallet_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: wallet_ledger wallet_ledger_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.wallet_ledger
    ADD CONSTRAINT wallet_ledger_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_sessions whatsapp_sessions_employee_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES moments.employees(id) ON DELETE CASCADE;


--
-- Name: whatsapp_sessions whatsapp_sessions_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_templates whatsapp_templates_org_id_fkey; Type: FK CONSTRAINT; Schema: moments; Owner: -
--

ALTER TABLE ONLY moments.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_org_id_fkey FOREIGN KEY (org_id) REFERENCES moments.organizations(id) ON DELETE CASCADE;


--
-- Name: action_tokens; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.action_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: addresses; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: addresses addresses_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY addresses_delete_admin ON moments.addresses FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: addresses addresses_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY addresses_insert_admin ON moments.addresses FOR INSERT TO authenticated WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: addresses addresses_select_scoped; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY addresses_select_scoped ON moments.addresses FOR SELECT TO authenticated USING ((moments.is_platform_staff() OR ((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) AND (moments.can_manage_people(org_id) OR (employee_id = moments.current_employee_id(org_id))))));


--
-- Name: addresses addresses_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY addresses_update_admin ON moments.addresses FOR UPDATE TO authenticated USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: alerts; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: alerts alerts_staff_only; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY alerts_staff_only ON moments.alerts FOR SELECT TO authenticated USING (moments.is_platform_staff());


--
-- Name: approval_requests; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.approval_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_requests approval_requests_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY approval_requests_select_member ON moments.approval_requests FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY audit_log_select_member ON moments.audit_log FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: cities; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.cities ENABLE ROW LEVEL SECURITY;

--
-- Name: cities cities_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY cities_select_all ON moments.cities FOR SELECT TO authenticated USING (true);


--
-- Name: dead_letters; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.dead_letters ENABLE ROW LEVEL SECURITY;

--
-- Name: dead_letters dead_letters_staff_only; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY dead_letters_staff_only ON moments.dead_letters FOR SELECT TO authenticated USING ((moments.is_platform_staff() OR (org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[]))));


--
-- Name: delivery_proofs; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.delivery_proofs ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_proofs delivery_proofs_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY delivery_proofs_select_member ON moments.delivery_proofs FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: employee_events; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.employee_events ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_events employee_events_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_events_delete_admin ON moments.employee_events FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: employee_events employee_events_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_events_insert_admin ON moments.employee_events FOR INSERT TO authenticated WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: employee_events employee_events_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_events_select_member ON moments.employee_events FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: employee_events employee_events_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_events_update_admin ON moments.employee_events FOR UPDATE TO authenticated USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: employee_import_batches; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.employee_import_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_import_batches employee_import_batches_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_batches_delete_admin ON moments.employee_import_batches FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: employee_import_batches employee_import_batches_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_batches_insert_admin ON moments.employee_import_batches FOR INSERT TO authenticated WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: employee_import_batches employee_import_batches_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_batches_select_member ON moments.employee_import_batches FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: employee_import_batches employee_import_batches_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_batches_update_admin ON moments.employee_import_batches FOR UPDATE TO authenticated USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: employee_import_rows; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.employee_import_rows ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_import_rows employee_import_rows_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_rows_delete_admin ON moments.employee_import_rows FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: employee_import_rows employee_import_rows_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_rows_insert_admin ON moments.employee_import_rows FOR INSERT TO authenticated WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: employee_import_rows employee_import_rows_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_rows_select_member ON moments.employee_import_rows FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: employee_import_rows employee_import_rows_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employee_import_rows_update_admin ON moments.employee_import_rows FOR UPDATE TO authenticated USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: employees; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: employees employees_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employees_delete_admin ON moments.employees FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: employees employees_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employees_insert_admin ON moments.employees FOR INSERT TO authenticated WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: employees employees_select_scoped; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employees_select_scoped ON moments.employees FOR SELECT TO authenticated USING ((moments.is_platform_staff() OR ((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) AND (moments.can_manage_people(org_id) OR (user_id = ( SELECT auth.uid() AS uid)) OR (manager_id = moments.current_employee_id(org_id))))));


--
-- Name: employees employees_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY employees_update_admin ON moments.employees FOR UPDATE TO authenticated USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: feature_flags; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.feature_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_flags feature_flags_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY feature_flags_select_all ON moments.feature_flags FOR SELECT TO authenticated USING (true);


--
-- Name: gift_bundle_items; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.gift_bundle_items ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_bundle_items gift_bundle_items_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_bundle_items_select_all ON moments.gift_bundle_items FOR SELECT TO authenticated USING (true);


--
-- Name: gift_bundles; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.gift_bundles ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_bundles gift_bundles_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_bundles_select_all ON moments.gift_bundles FOR SELECT TO authenticated USING (((org_id IS NULL) OR (org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: gift_order_items; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.gift_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_order_items gift_order_items_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_order_items_select_member ON moments.gift_order_items FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: gift_order_status_history; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.gift_order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_order_status_history gift_order_status_history_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_order_status_history_select_member ON moments.gift_order_status_history FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: gift_orders; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.gift_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_orders gift_orders_insert_staff; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_orders_insert_staff ON moments.gift_orders FOR INSERT TO authenticated WITH CHECK (moments.is_platform_staff());


--
-- Name: gift_orders gift_orders_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_orders_select_member ON moments.gift_orders FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: gift_orders gift_orders_write_staff; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_orders_write_staff ON moments.gift_orders FOR UPDATE TO authenticated USING (moments.is_platform_staff()) WITH CHECK (moments.is_platform_staff());


--
-- Name: gift_products; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.gift_products ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_products gift_products_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY gift_products_select_all ON moments.gift_products FOR SELECT TO authenticated USING ((is_active OR moments.is_platform_staff()));


--
-- Name: invitations; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations invitations_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY invitations_delete_admin ON moments.invitations FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: invitations invitations_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY invitations_insert_admin ON moments.invitations FOR INSERT TO authenticated WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: invitations invitations_select_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY invitations_select_admin ON moments.invitations FOR SELECT TO authenticated USING ((moments.is_org_admin(org_id) OR moments.is_platform_staff()));


--
-- Name: invitations invitations_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY invitations_update_admin ON moments.invitations FOR UPDATE TO authenticated USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: invoice_lines; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.invoice_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_lines invoice_lines_select_billing; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY invoice_lines_select_billing ON moments.invoice_lines FOR SELECT TO authenticated USING ((moments.can_manage_billing(org_id) OR moments.is_platform_staff()));


--
-- Name: invoices; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices invoices_select_billing; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY invoices_select_billing ON moments.invoices FOR SELECT TO authenticated USING ((moments.can_manage_billing(org_id) OR moments.is_platform_staff()));


--
-- Name: job_runs; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.job_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: job_runs job_runs_staff_only; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY job_runs_staff_only ON moments.job_runs FOR SELECT TO authenticated USING (moments.is_platform_staff());


--
-- Name: message_templates; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: message_templates message_templates_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY message_templates_delete_admin ON moments.message_templates FOR DELETE TO authenticated USING (((org_id IS NOT NULL) AND moments.is_org_admin(org_id)));


--
-- Name: message_templates message_templates_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY message_templates_insert_admin ON moments.message_templates FOR INSERT TO authenticated WITH CHECK (((org_id IS NOT NULL) AND moments.can_manage_people(org_id)));


--
-- Name: message_templates message_templates_select; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY message_templates_select ON moments.message_templates FOR SELECT TO authenticated USING (((org_id IS NULL) OR (org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: message_templates message_templates_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY message_templates_update_admin ON moments.message_templates FOR UPDATE TO authenticated USING (((org_id IS NOT NULL) AND moments.can_manage_people(org_id))) WITH CHECK (((org_id IS NOT NULL) AND moments.can_manage_people(org_id)));


--
-- Name: milestone_tiers; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.milestone_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: milestone_tiers milestone_tiers_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY milestone_tiers_delete_admin ON moments.milestone_tiers FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: milestone_tiers milestone_tiers_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY milestone_tiers_insert_admin ON moments.milestone_tiers FOR INSERT TO authenticated WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: milestone_tiers milestone_tiers_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY milestone_tiers_select_member ON moments.milestone_tiers FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: milestone_tiers milestone_tiers_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY milestone_tiers_update_admin ON moments.milestone_tiers FOR UPDATE TO authenticated USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: moment_events; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.moment_events ENABLE ROW LEVEL SECURITY;

--
-- Name: moment_events moment_events_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_events_select_member ON moments.moment_events FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: moment_events moment_events_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_events_update_admin ON moments.moment_events FOR UPDATE TO authenticated USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: moment_policies; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.moment_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: moment_policies moment_policies_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_policies_delete_admin ON moments.moment_policies FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: moment_policies moment_policies_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_policies_insert_admin ON moments.moment_policies FOR INSERT TO authenticated WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: moment_policies moment_policies_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_policies_select_member ON moments.moment_policies FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: moment_policies moment_policies_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_policies_update_admin ON moments.moment_policies FOR UPDATE TO authenticated USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: moment_tasks; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.moment_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: moment_tasks moment_tasks_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_tasks_select_member ON moments.moment_tasks FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: moment_types; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.moment_types ENABLE ROW LEVEL SECURITY;

--
-- Name: moment_types moment_types_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_types_delete_admin ON moments.moment_types FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: moment_types moment_types_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_types_insert_admin ON moments.moment_types FOR INSERT TO authenticated WITH CHECK (((org_id IS NOT NULL) AND moments.is_org_admin(org_id)));


--
-- Name: moment_types moment_types_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_types_select_all ON moments.moment_types FOR SELECT TO authenticated USING (((org_id IS NULL) OR (org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: moment_types moment_types_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY moment_types_update_admin ON moments.moment_types FOR UPDATE TO authenticated USING (((org_id IS NOT NULL) AND moments.is_org_admin(org_id))) WITH CHECK (((org_id IS NOT NULL) AND moments.is_org_admin(org_id)));


--
-- Name: observance_dates; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.observance_dates ENABLE ROW LEVEL SECURITY;

--
-- Name: observance_dates observance_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY observance_select_all ON moments.observance_dates FOR SELECT TO authenticated USING (true);


--
-- Name: observance_dates observance_write_staff; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY observance_write_staff ON moments.observance_dates FOR UPDATE TO authenticated USING (moments.is_platform_staff(ARRAY['platform_admin'::moments.staff_role, 'ops'::moments.staff_role])) WITH CHECK (moments.is_platform_staff(ARRAY['platform_admin'::moments.staff_role, 'ops'::moments.staff_role]));


--
-- Name: offices; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.offices ENABLE ROW LEVEL SECURITY;

--
-- Name: offices offices_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY offices_delete_admin ON moments.offices FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: offices offices_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY offices_insert_admin ON moments.offices FOR INSERT TO authenticated WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: offices offices_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY offices_select_member ON moments.offices FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: offices offices_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY offices_update_admin ON moments.offices FOR UPDATE TO authenticated USING (moments.can_manage_people(org_id)) WITH CHECK (moments.can_manage_people(org_id));


--
-- Name: org_integrations; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.org_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: org_integrations org_integrations_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY org_integrations_delete_admin ON moments.org_integrations FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: org_integrations org_integrations_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY org_integrations_select_member ON moments.org_integrations FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: org_integrations org_integrations_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY org_integrations_update_admin ON moments.org_integrations FOR UPDATE TO authenticated USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: org_members; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.org_members ENABLE ROW LEVEL SECURITY;

--
-- Name: org_members org_members_delete_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY org_members_delete_admin ON moments.org_members FOR DELETE TO authenticated USING (moments.is_org_admin(org_id));


--
-- Name: org_members org_members_insert_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY org_members_insert_admin ON moments.org_members FOR INSERT TO authenticated WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: org_members org_members_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY org_members_select_member ON moments.org_members FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: org_members org_members_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY org_members_update_admin ON moments.org_members FOR UPDATE TO authenticated USING (moments.is_org_admin(org_id)) WITH CHECK (moments.is_org_admin(org_id));


--
-- Name: organizations; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations organizations_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY organizations_select_member ON moments.organizations FOR SELECT TO authenticated USING (((id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: organizations organizations_update_admin; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY organizations_update_admin ON moments.organizations FOR UPDATE TO authenticated USING (moments.is_org_admin(id)) WITH CHECK (moments.is_org_admin(id));


--
-- Name: outbound_message_events; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.outbound_message_events ENABLE ROW LEVEL SECURITY;

--
-- Name: outbound_message_events outbound_message_events_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY outbound_message_events_select_member ON moments.outbound_message_events FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: outbound_messages; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.outbound_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: outbound_messages outbound_messages_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY outbound_messages_select_member ON moments.outbound_messages FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: payments; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_insert_billing; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY payments_insert_billing ON moments.payments FOR INSERT TO authenticated WITH CHECK ((moments.can_manage_billing(org_id) AND (status = 'reported'::moments.payment_status)));


--
-- Name: payments payments_select_billing; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY payments_select_billing ON moments.payments FOR SELECT TO authenticated USING ((moments.can_manage_billing(org_id) OR moments.is_platform_staff()));


--
-- Name: payments payments_update_staff; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY payments_update_staff ON moments.payments FOR UPDATE TO authenticated USING (moments.is_platform_staff()) WITH CHECK (moments.is_platform_staff());


--
-- Name: plans; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plans plans_select_all; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY plans_select_all ON moments.plans FOR SELECT TO authenticated USING (is_active);


--
-- Name: profiles; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_self_or_colleague; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY profiles_select_self_or_colleague ON moments.profiles FOR SELECT TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR moments.is_platform_staff() OR (EXISTS ( SELECT 1
   FROM moments.org_members m
  WHERE ((m.user_id = profiles.id) AND (m.org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])))))));


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY profiles_update_self ON moments.profiles FOR UPDATE TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: rate_limit_buckets; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_users; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.staff_users ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_users staff_users_select_self; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY staff_users_select_self ON moments.staff_users FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR moments.is_platform_staff(ARRAY['platform_admin'::moments.staff_role])));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_select_billing; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY subscriptions_select_billing ON moments.subscriptions FOR SELECT TO authenticated USING ((moments.can_manage_billing(org_id) OR moments.is_platform_staff()));


--
-- Name: suppressions; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.suppressions ENABLE ROW LEVEL SECURITY;

--
-- Name: suppressions suppressions_select; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY suppressions_select ON moments.suppressions FOR SELECT TO authenticated USING (((org_id IS NULL) OR (org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: task_attempts; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.task_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: task_attempts task_attempts_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY task_attempts_select_member ON moments.task_attempts FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: token_events; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.token_events ENABLE ROW LEVEL SECURITY;

--
-- Name: token_events token_events_select_member; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY token_events_select_member ON moments.token_events FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: vendor_city_coverage; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.vendor_city_coverage ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_city_coverage vendor_coverage_staff_only; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY vendor_coverage_staff_only ON moments.vendor_city_coverage FOR SELECT TO authenticated USING (moments.is_platform_staff());


--
-- Name: vendors; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors_staff_only; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY vendors_staff_only ON moments.vendors FOR SELECT TO authenticated USING (moments.is_platform_staff());


--
-- Name: wallet_accounts; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.wallet_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_accounts wallet_accounts_select_billing; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY wallet_accounts_select_billing ON moments.wallet_accounts FOR SELECT TO authenticated USING ((moments.can_manage_billing(org_id) OR moments.is_platform_staff()));


--
-- Name: wallet_ledger; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.wallet_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_ledger wallet_ledger_select_billing; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY wallet_ledger_select_billing ON moments.wallet_ledger FOR SELECT TO authenticated USING ((moments.can_manage_billing(org_id) OR moments.is_platform_staff()));


--
-- Name: whatsapp_sessions; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_sessions whatsapp_sessions_select; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY whatsapp_sessions_select ON moments.whatsapp_sessions FOR SELECT TO authenticated USING (((org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- Name: whatsapp_templates; Type: ROW SECURITY; Schema: moments; Owner: -
--

ALTER TABLE moments.whatsapp_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_templates whatsapp_templates_select; Type: POLICY; Schema: moments; Owner: -
--

CREATE POLICY whatsapp_templates_select ON moments.whatsapp_templates FOR SELECT TO authenticated USING (((org_id IS NULL) OR (org_id = ANY (( SELECT moments.current_org_ids() AS current_org_ids)::uuid[])) OR moments.is_platform_staff()));


--
-- PostgreSQL database dump complete
--

\unrestrict dJFr1haR9r0tnS1Tp3BIsCkteycGrWXfdLGRRYva3pS9DBXt96Gm24ddD1oTGca

