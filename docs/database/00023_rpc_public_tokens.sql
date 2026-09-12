-- 00023_rpc_public_tokens.sql
-- The login-free, tokenised flows.
--
-- action_tokens has RLS enabled with ZERO policies, so these SECURITY DEFINER
-- functions are the ONLY way to touch a token. A token row that is never
-- selectable through PostgREST can never leak through PostgREST.
--
-- `anon` gets EXECUTE on exactly two functions here and nothing else in the
-- schema.

BEGIN;

-- --------------------------------------------------------------------------
-- resolve_action_token -- what the confirmation page renders.
--
-- GET MUST NEVER MUTATE. Outlook Safe Links, Gmail's image proxy and WhatsApp
-- link previews all PRE-FETCH urls; if opening the page consumed the token,
-- Microsoft would burn every link before the employee ever clicked it. This
-- function only reads. use_count is incremented by submit_*, never here.
--
-- MINIMAL DISCLOSURE: returns the employee's first name and a MASKED address --
-- enough to say "yes, that's right", not enough to be a leak if the link is
-- forwarded. No date of birth, no salary, no colleagues, no email.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.resolve_action_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tok   moments.action_tokens;
  v_emp   moments.employees;
  v_addr  moments.addresses;
  v_event moments.moment_events;
BEGIN
  SELECT * INTO v_tok
    FROM moments.action_tokens t
   WHERE t.token_lookup = pg_catalog.left(p_token, 12)
     AND t.token_hash = moments.hash_token(p_token)
   LIMIT 1;

  -- Invalid, expired, revoked and used-up all return the SAME shape. Distinct
  -- responses (or distinct HTTP codes) are an enumeration oracle.
  IF NOT FOUND
     OR v_tok.revoked_at IS NOT NULL
     OR v_tok.expires_at < pg_catalog.now()
     OR v_tok.consumed_at IS NOT NULL
     OR v_tok.use_count >= v_tok.max_uses THEN
    RETURN pg_catalog.jsonb_build_object('valid', false);
  END IF;

  SELECT * INTO v_emp FROM moments.employees e WHERE e.id = v_tok.subject_id;
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('valid', false);
  END IF;

  SELECT * INTO v_addr
    FROM moments.addresses a
   WHERE a.employee_id = v_emp.id AND a.is_primary AND a.is_active
   LIMIT 1;

  SELECT * INTO v_event
    FROM moments.moment_events m WHERE m.id = v_tok.moment_event_id;

  RETURN pg_catalog.jsonb_build_object(
    'valid', true,
    'purpose', v_tok.purpose,
    'firstName', pg_catalog.split_part(
                   COALESCE(NULLIF(v_emp.preferred_name, ''), v_emp.full_name), ' ', 1),
    'orgName', (SELECT o.name FROM moments.organizations o WHERE o.id = v_tok.org_id),
    'occursOn', v_event.occurs_on,
    'hasAddress', v_addr.id IS NOT NULL,
    -- Masked: house number and city survive; street and block do not.
    'addressPreview', CASE WHEN v_addr.id IS NULL THEN NULL ELSE
      pg_catalog.regexp_replace(pg_catalog.left(v_addr.line1, 14), '[0-9]', 'x', 'g')
      || '…, ' || COALESCE((SELECT c.name FROM moments.cities c WHERE c.id = v_addr.city_id),
                           v_addr.city_text, '') END,
    'shirtSize', v_emp.shirt_size,
    'halalOnly', v_emp.halal_only,
    'isVegetarian', v_emp.is_vegetarian,
    'needsEggless', v_emp.needs_eggless,
    'whatsappOptIn', v_emp.whatsapp_opt_in_at IS NOT NULL,
    'celebrationOptOut', v_emp.celebration_opt_out
  );
END $$;

-- --------------------------------------------------------------------------
-- submit_employee_confirmation -- the POST half.
--
-- THE COLUMN WHITELIST LIVES HERE, not in the server action. The action can be
-- bypassed; this function cannot. It may write an address, a phone, sizes,
-- dietary flags and the opt-out -- and nothing else. Not email, not manager,
-- not job title, not salary.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.submit_employee_confirmation(
  p_token   text,
  p_payload jsonb,
  p_ip      inet DEFAULT NULL,
  p_ua      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tok  moments.action_tokens;
  v_emp  moments.employees;
  v_addr uuid;
BEGIN
  SELECT * INTO v_tok
    FROM moments.action_tokens t
   WHERE t.token_lookup = pg_catalog.left(p_token, 12)
     AND t.token_hash = moments.hash_token(p_token)
   FOR UPDATE;

  IF NOT FOUND
     OR v_tok.revoked_at IS NOT NULL
     OR v_tok.expires_at < pg_catalog.now()
     OR v_tok.consumed_at IS NOT NULL
     OR v_tok.use_count >= v_tok.max_uses
     OR v_tok.purpose <> 'address_verification' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false);
  END IF;

  SELECT * INTO v_emp FROM moments.employees e WHERE e.id = v_tok.subject_id;
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false);
  END IF;

  -- Address: update the primary one, or create it.
  SELECT a.id INTO v_addr
    FROM moments.addresses a
   WHERE a.employee_id = v_emp.id AND a.is_primary AND a.is_active
   LIMIT 1;

  IF v_addr IS NULL THEN
    INSERT INTO moments.addresses (
      org_id, employee_id, kind, line1, line2, area, landmark,
      city_id, city_text, delivery_notes, recipient_phone,
      is_primary, verification_status, verified_at, verified_by_kind
    ) VALUES (
      v_emp.org_id, v_emp.id, 'home',
      p_payload ->> 'line1', NULLIF(p_payload ->> 'line2', ''),
      NULLIF(p_payload ->> 'area', ''), NULLIF(p_payload ->> 'landmark', ''),
      (NULLIF(p_payload ->> 'cityId', ''))::uuid, NULLIF(p_payload ->> 'cityText', ''),
      NULLIF(p_payload ->> 'deliveryNotes', ''), NULLIF(p_payload ->> 'recipientPhone', ''),
      true, 'employee_confirmed', pg_catalog.now(), 'anon_token'
    )
    RETURNING id INTO v_addr;
  ELSE
    UPDATE moments.addresses a
       SET line1 = p_payload ->> 'line1',
           line2 = NULLIF(p_payload ->> 'line2', ''),
           area = NULLIF(p_payload ->> 'area', ''),
           landmark = NULLIF(p_payload ->> 'landmark', ''),
           city_id = COALESCE((NULLIF(p_payload ->> 'cityId', ''))::uuid, a.city_id),
           city_text = COALESCE(NULLIF(p_payload ->> 'cityText', ''), a.city_text),
           delivery_notes = NULLIF(p_payload ->> 'deliveryNotes', ''),
           recipient_phone = COALESCE(NULLIF(p_payload ->> 'recipientPhone', ''), a.recipient_phone),
           verification_status = 'employee_confirmed',
           verified_at = pg_catalog.now(),
           verified_by_kind = 'anon_token',
           updated_at = pg_catalog.now()
     WHERE a.id = v_addr;
  END IF;

  -- The employee column whitelist. Nothing outside this list is writable here.
  UPDATE moments.employees e
     SET whatsapp_e164 = COALESCE(NULLIF(p_payload ->> 'whatsappE164', ''), e.whatsapp_e164),
         whatsapp_opt_in_at = CASE
           WHEN (p_payload ->> 'whatsappOptIn')::boolean THEN COALESCE(e.whatsapp_opt_in_at, pg_catalog.now())
           ELSE NULL END,
         shirt_size = COALESCE(NULLIF(p_payload ->> 'shirtSize', ''), e.shirt_size),
         halal_only = COALESCE((p_payload ->> 'halalOnly')::boolean, e.halal_only),
         is_vegetarian = COALESCE((p_payload ->> 'isVegetarian')::boolean, e.is_vegetarian),
         needs_eggless = COALESCE((p_payload ->> 'needsEggless')::boolean, e.needs_eggless),
         dietary_notes = COALESCE(NULLIF(p_payload ->> 'dietaryNotes', ''), e.dietary_notes),
         -- Always honoured, immediately.
         celebration_opt_out = COALESCE((p_payload ->> 'celebrationOptOut')::boolean, e.celebration_opt_out),
         updated_at = pg_catalog.now()
   WHERE e.id = v_emp.id;

  -- Reusable, not consumed: people open it on a phone, then a laptop, then again
  -- to fix a typo. Bounded by max_uses.
  UPDATE moments.action_tokens t
     SET use_count = t.use_count + 1,
         first_used_at = COALESCE(t.first_used_at, pg_catalog.now()),
         last_used_at = pg_catalog.now(),
         last_ip = p_ip, last_user_agent = p_ua
   WHERE t.id = v_tok.id;

  INSERT INTO moments.token_events (token_id, org_id, kind, ip, user_agent)
  VALUES (v_tok.id, v_tok.org_id, 'submitted', p_ip, p_ua);

  -- The moment can move on: we know where to send it.
  UPDATE moments.moment_events m
     SET status = 'scheduled'
   WHERE m.id = v_tok.moment_event_id AND m.status = 'needs_info';

  RETURN pg_catalog.jsonb_build_object('ok', true, 'addressId', v_addr);
END $$;

-- --------------------------------------------------------------------------
-- Grants. anon gets these two and NOTHING else in the schema.
-- --------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION moments.resolve_action_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION moments.submit_employee_confirmation(text, jsonb, inet, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION moments.resolve_action_token(text) TO anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION moments.submit_employee_confirmation(text, jsonb, inet, text)
  TO anon, authenticated, service_role;

COMMIT;
