-- 00025_rpc_approvals_orders.sql
-- The T-2 approval decision and the ops order lifecycle.
--
-- Both paths -- a logged-in HR admin clicking Approve in the dashboard, and an
-- anonymous manager clicking a tokenised link in an email -- go through the SAME
-- function, so the decision rules cannot drift between them.

BEGIN;

-- --------------------------------------------------------------------------
-- respond_to_approval
--
-- p_token is NULL for the dashboard path (identity comes from auth.uid()) and
-- present for the emailed-link path.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.respond_to_approval(
  p_approval_id uuid,
  p_decision    text,
  p_note        text DEFAULT NULL,
  p_token       text DEFAULT NULL,
  p_otp         text DEFAULT NULL,
  p_ip          inet DEFAULT NULL,
  p_ua          text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req  moments.approval_requests;
  v_tok  moments.action_tokens;
  v_user uuid := (SELECT auth.uid());
  v_via  moments.response_channel;
  v_label text;
BEGIN
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'decision must be approved or rejected' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_req FROM moments.approval_requests a WHERE a.id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Already decided. Return the standing decision rather than an error: the
  -- second click on a forwarded link should read as "Ayesha already approved
  -- this", not as a failure.
  IF v_req.status <> 'pending' THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', true, 'alreadyDecided', true,
      'decision', v_req.status, 'decidedAt', v_req.responded_at,
      'decidedBy', v_req.responder_label);
  END IF;

  IF v_req.expires_at < pg_catalog.now() THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  ----------------------------------------------------------------- authorise
  IF p_token IS NOT NULL THEN
    SELECT * INTO v_tok
      FROM moments.action_tokens t
     WHERE t.token_lookup = pg_catalog.left(p_token, 12)
       AND t.token_hash = moments.hash_token(p_token)
       AND t.purpose = 'approval'
     FOR UPDATE;

    IF NOT FOUND
       OR v_tok.revoked_at IS NOT NULL
       OR v_tok.expires_at < pg_catalog.now()
       OR v_tok.consumed_at IS NOT NULL
       OR v_tok.subject_id <> v_req.id THEN
      RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'invalid_link');
    END IF;

    -- Above the org's threshold a bare click is not enough: the link is
    -- forwardable, so a high-value approval needs a second factor.
    IF v_req.requires_otp THEN
      IF p_otp IS NULL
         OR v_req.otp_hash IS NULL
         OR v_req.otp_expires_at < pg_catalog.now()
         OR moments.hash_token(p_otp) <> v_req.otp_hash THEN
        RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'otp_required');
      END IF;
    END IF;

    v_via   := 'link';
    v_label := COALESCE(v_tok.issued_to_email, v_tok.issued_to_phone, 'emailed link');

    UPDATE moments.action_tokens t
       SET use_count = t.use_count + 1,
           consumed_at = pg_catalog.now(),      -- single-use for DECIDING
           first_used_at = COALESCE(t.first_used_at, pg_catalog.now()),
           last_used_at = pg_catalog.now(), last_ip = p_ip, last_user_agent = p_ua
     WHERE t.id = v_tok.id;

    INSERT INTO moments.token_events (token_id, org_id, kind, ip, user_agent)
    VALUES (v_tok.id, v_tok.org_id, 'submitted', p_ip, p_ua);
  ELSE
    IF v_user IS NULL THEN
      RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not_signed_in');
    END IF;
    IF NOT (moments.can_manage_people(v_req.org_id) OR moments.is_platform_staff()) THEN
      RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not_allowed');
    END IF;
    v_via   := 'dashboard';
    v_label := (SELECT p.email FROM moments.profiles p WHERE p.id = v_user);
  END IF;

  ------------------------------------------------------------------- record
  UPDATE moments.approval_requests a
     SET status = p_decision::moments.approval_decision,
         responded_at = pg_catalog.now(),
         responded_via = v_via,
         responder_user_id = v_user,
         responder_label = v_label,
         responder_ip = p_ip,
         responder_user_agent = p_ua,
         decision_note = p_note,
         updated_at = pg_catalog.now()
   WHERE a.id = v_req.id;

  UPDATE moments.moment_events m
     SET status = (CASE WHEN p_decision = 'approved' THEN 'approved' ELSE 'rejected' END)::moments.moment_status,
         updated_at = pg_catalog.now()
   WHERE m.id = v_req.moment_event_id;

  -- A rejection stops the gift. The moment still exists, so the announcement
  -- can go ahead if the org wants one.
  IF p_decision = 'rejected' THEN
    UPDATE moments.gift_orders o
       SET status = 'cancelled', cancelled_at = pg_catalog.now(),
           failure_reason = 'approval rejected', updated_at = pg_catalog.now()
     WHERE o.moment_event_id = v_req.moment_event_id AND o.status <> 'cancelled';
  END IF;

  INSERT INTO moments.audit_log (org_id, actor_kind, actor_user_id, actor_label,
                                 action, entity, entity_id, reason, ip)
  VALUES (v_req.org_id,
          (CASE WHEN p_token IS NOT NULL THEN 'anon_token' ELSE 'user' END)::moments.actor_kind,
          v_user, v_label, 'approval.' || p_decision,
          'approval_requests', v_req.id, p_note, p_ip);

  RETURN pg_catalog.jsonb_build_object('ok', true, 'decision', p_decision);
END $$;

REVOKE EXECUTE ON FUNCTION moments.respond_to_approval(uuid, text, text, text, text, inet, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION moments.respond_to_approval(uuid, text, text, text, text, inet, text)
  TO anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- resolve_approval_token -- what the emailed approve page renders.
-- Read-only: GET must never consume the token (Safe Links pre-fetches urls).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.resolve_approval_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tok moments.action_tokens;
  v_req moments.approval_requests;
BEGIN
  SELECT * INTO v_tok
    FROM moments.action_tokens t
   WHERE t.token_lookup = pg_catalog.left(p_token, 12)
     AND t.token_hash = moments.hash_token(p_token)
     AND t.purpose = 'approval';

  IF NOT FOUND OR v_tok.revoked_at IS NOT NULL OR v_tok.expires_at < pg_catalog.now() THEN
    RETURN pg_catalog.jsonb_build_object('valid', false);
  END IF;

  SELECT * INTO v_req FROM moments.approval_requests a WHERE a.id = v_tok.subject_id;
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('valid', false);
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'valid', true,
    'approvalId', v_req.id,
    'status', v_req.status,
    'amountPaisa', v_req.requested_amount_paisa,
    'budgetPaisa', v_req.budget_paisa,
    'summary', v_req.summary,
    'requiresOtp', v_req.requires_otp,
    'expiresAt', v_req.expires_at,
    'autoApproveAt', v_req.auto_approve_at,
    'decidedBy', v_req.responder_label,
    'decidedAt', v_req.responded_at,
    'orgName', (SELECT o.name FROM moments.organizations o WHERE o.id = v_req.org_id),
    'employeeName', (
      SELECT COALESCE(NULLIF(e.preferred_name,''), e.full_name)
        FROM moments.moment_events m
        JOIN moments.employees e ON e.id = m.employee_id
       WHERE m.id = v_req.moment_event_id),
    'momentLabel', (
      SELECT mt.label FROM moments.moment_events m
        JOIN moments.moment_types mt ON mt.id = m.moment_type_id
       WHERE m.id = v_req.moment_event_id),
    'occursOn', (SELECT m.occurs_on FROM moments.moment_events m WHERE m.id = v_req.moment_event_id)
  );
END $$;

REVOKE EXECUTE ON FUNCTION moments.resolve_approval_token(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION moments.resolve_approval_token(text) TO anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- sweep_expired_approvals -- the auto-approve deadline.
--
-- AUTO-APPROVED IS A DISTINCT STATUS, never folded into `approved`. When a
-- customer disputes a PKR 7,500 marriage gift you must be able to say "nobody
-- clicked; your policy auto-approved after 24 hours" and prove it.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.sweep_expired_approvals()
RETURNS TABLE (auto_approved int, expired int)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  WITH auto AS (
    UPDATE moments.approval_requests a
       SET status = 'auto_approved', responded_at = pg_catalog.now(),
           responded_via = 'auto', responder_label = 'policy timeout',
           updated_at = pg_catalog.now()
     WHERE a.status = 'pending'
       AND a.auto_approve_on_timeout
       AND a.auto_approve_at IS NOT NULL
       AND a.auto_approve_at <= pg_catalog.now()
    RETURNING a.moment_event_id
  ),
  gone AS (
    UPDATE moments.approval_requests a
       SET status = 'expired', responded_at = pg_catalog.now(),
           responded_via = 'auto', responder_label = 'expired unanswered',
           updated_at = pg_catalog.now()
     WHERE a.status = 'pending'
       AND NOT a.auto_approve_on_timeout
       AND a.expires_at <= pg_catalog.now()
    RETURNING a.id
  ),
  advanced AS (
    UPDATE moments.moment_events m
       SET status = 'approved', updated_at = pg_catalog.now()
      FROM auto WHERE m.id = auto.moment_event_id
    RETURNING m.id
  )
  SELECT (SELECT pg_catalog.count(*)::int FROM auto),
         (SELECT pg_catalog.count(*)::int FROM gone)
    INTO auto_approved, expired;

  RETURN NEXT;
END $$;

REVOKE EXECUTE ON FUNCTION moments.sweep_expired_approvals() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION moments.sweep_expired_approvals() TO service_role;

COMMIT;
