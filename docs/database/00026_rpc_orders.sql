-- 00026_rpc_orders.sql
-- Order creation and the ops lifecycle.
--
-- v1 fulfillment is ops-assisted: this creates a real order record and puts it
-- in a queue a human works. There is no vendor API.

BEGIN;

-- Human-readable, sortable, and unique without a sequence collision.
CREATE OR REPLACE FUNCTION moments.next_order_number()
RETURNS text
LANGUAGE sql VOLATILE
SET search_path = ''
AS $$
  SELECT 'MO-' || pg_catalog.to_char(pg_catalog.now(), 'YYMM') || '-' ||
         pg_catalog.upper(pg_catalog.encode(extensions.gen_random_bytes(3), 'hex'));
$$;

-- --------------------------------------------------------------------------
-- create_gift_order -- called by the place_order handler at T-2.
--
-- SNAPSHOTS EVERYTHING that affects a physical action or an invoice. If the
-- employee moves house in October, the September order must still show where the
-- cake actually went; if the price book changes, a delivered order's margin must
-- not move.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.create_gift_order(
  p_moment_event_id uuid,
  p_product_id      uuid,
  p_quantity        smallint DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event   moments.moment_events;
  v_emp     moments.employees;
  v_addr    moments.addresses;
  v_product moments.gift_products;
  v_cov     moments.vendor_city_coverage;
  v_order   uuid;
  v_city    uuid;
  v_lead    smallint;
BEGIN
  SELECT * INTO v_event FROM moments.moment_events m WHERE m.id = p_moment_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'moment not found' USING ERRCODE = 'no_data_found'; END IF;

  SELECT * INTO v_product FROM moments.gift_products g WHERE g.id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found' USING ERRCODE = 'no_data_found'; END IF;

  SELECT * INTO v_emp FROM moments.employees e WHERE e.id = v_event.employee_id;

  SELECT * INTO v_addr
    FROM moments.addresses a
   WHERE a.employee_id = v_event.employee_id AND a.is_primary AND a.is_active
   LIMIT 1;

  v_city := COALESCE(v_addr.city_id, (SELECT o.city_id FROM moments.offices o
                                       WHERE o.id = v_emp.office_id));

  SELECT * INTO v_cov
    FROM moments.vendor_city_coverage vc
   WHERE vc.vendor_id = v_product.vendor_id AND vc.city_id = v_city AND vc.is_active;

  v_lead := COALESCE(v_cov.lead_time_days, v_product.min_lead_days, 2);

  INSERT INTO moments.gift_orders (
    org_id, moment_event_id, employee_id, vendor_id, order_number, status,
    address_id, address_snapshot, recipient_name, recipient_phone, city_id,
    deliver_on, dietary_snapshot,
    items_cost_paisa, delivery_cost_paisa, items_price_paisa, delivery_price_paisa,
    budget_paisa,
    -- Ops needs the order in hand before the vendor's lead time runs out, not on
    -- the delivery date itself.
    ops_sla_due_at
  ) VALUES (
    v_event.org_id, v_event.id, v_event.employee_id, v_product.vendor_id,
    moments.next_order_number(), 'queued_for_ops',
    v_addr.id,
    COALESCE(
      pg_catalog.jsonb_build_object(
        'line1', v_addr.line1, 'line2', v_addr.line2, 'area', v_addr.area,
        'landmark', v_addr.landmark, 'city', (SELECT c.name FROM moments.cities c WHERE c.id = v_city),
        'cityText', v_addr.city_text, 'notes', v_addr.delivery_notes,
        'verification', v_addr.verification_status),
      '{}'::jsonb),
    COALESCE(NULLIF(v_emp.preferred_name, ''), v_emp.full_name, 'Recipient'),
    COALESCE(v_addr.recipient_phone, v_emp.phone_e164),
    v_city,
    v_event.occurs_on,
    pg_catalog.jsonb_build_object(
      'halalOnly', v_emp.halal_only, 'vegetarian', v_emp.is_vegetarian,
      'eggless', v_emp.needs_eggless, 'allergies', v_emp.allergies,
      'notes', v_emp.dietary_notes),
    v_product.cost_paisa * p_quantity,
    COALESCE(v_cov.delivery_fee_paisa, 0),
    v_product.list_price_paisa * p_quantity,
    COALESCE(v_cov.delivery_fee_paisa, 0),
    v_event.budget_paisa,
    (v_event.occurs_on - v_lead)::timestamptz
  )
  RETURNING id INTO v_order;

  INSERT INTO moments.gift_order_items (
    order_id, org_id, product_id, name_snapshot, category, quantity,
    unit_cost_paisa, unit_price_paisa, dietary_snapshot
  ) VALUES (
    v_order, v_event.org_id, v_product.id, v_product.name, v_product.category, p_quantity,
    v_product.cost_paisa, v_product.list_price_paisa,
    pg_catalog.jsonb_build_object('halalOnly', v_emp.halal_only, 'eggless', v_emp.needs_eggless)
  );

  UPDATE moments.moment_events m
     SET gift_order_id = v_order, status = 'fulfilling', updated_at = pg_catalog.now()
   WHERE m.id = v_event.id;

  RETURN v_order;
END $$;

REVOKE EXECUTE ON FUNCTION moments.create_gift_order(uuid, uuid, smallint) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION moments.create_gift_order(uuid, uuid, smallint) TO service_role;

-- --------------------------------------------------------------------------
-- ops_update_order -- the only way the ops UI mutates an order.
--
-- Every call writes an audit row, and a `reason` is REQUIRED for the destructive
-- transitions. "What can your staff do to my orders" must be answerable from the
-- audit log, not from a promise about application code.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.ops_update_order(
  p_order_id  uuid,
  p_status    text,
  p_vendor_ref text DEFAULT NULL,
  p_vendor_id uuid DEFAULT NULL,
  p_reason    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_old  moments.gift_orders;
BEGIN
  IF NOT moments.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_status IN ('cancelled','failed') AND COALESCE(pg_catalog.btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'a reason is required to cancel or fail an order'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_old FROM moments.gift_orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE moments.gift_orders o
     SET status = p_status::moments.order_status,
         vendor_id = COALESCE(p_vendor_id, o.vendor_id),
         vendor_order_ref = COALESCE(p_vendor_ref, o.vendor_order_ref),
         placed_at = CASE WHEN p_status = 'placed_with_vendor' THEN COALESCE(o.placed_at, pg_catalog.now())
                          ELSE o.placed_at END,
         placed_by = CASE WHEN p_status = 'placed_with_vendor' THEN COALESCE(o.placed_by, v_user)
                          ELSE o.placed_by END,
         delivered_at = CASE WHEN p_status = 'delivered' THEN COALESCE(o.delivered_at, pg_catalog.now())
                             ELSE o.delivered_at END,
         cancelled_at = CASE WHEN p_status = 'cancelled' THEN pg_catalog.now() ELSE o.cancelled_at END,
         failure_reason = CASE WHEN p_status IN ('failed','cancelled') THEN p_reason ELSE o.failure_reason END,
         assigned_staff_id = COALESCE(o.assigned_staff_id, v_user),
         updated_at = pg_catalog.now()
   WHERE o.id = p_order_id;

  -- Delivery closes the loop on the moment itself.
  IF p_status = 'delivered' THEN
    UPDATE moments.moment_events m
       SET status = 'delivered', updated_at = pg_catalog.now()
     WHERE m.id = v_old.moment_event_id AND m.status NOT IN ('completed','cancelled');
  END IF;

  INSERT INTO moments.audit_log (org_id, actor_kind, actor_user_id, action, entity, entity_id,
                                 before, after, reason)
  VALUES (v_old.org_id, 'staff', v_user, 'order.' || p_status, 'gift_orders', p_order_id,
          pg_catalog.jsonb_build_object('status', v_old.status),
          pg_catalog.jsonb_build_object('status', p_status, 'vendorRef', p_vendor_ref),
          p_reason);

  RETURN pg_catalog.jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION moments.ops_update_order(uuid, text, text, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION moments.ops_update_order(uuid, text, text, uuid, text) TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- substitute_digital_gift -- THE MOST IMPORTANT FUNCTION IN FULFILLMENT.
--
-- At T-0 08:00, if the physical gift is not confirmed in transit, swap in a
-- digital one so the employee gets SOMETHING on the day. The physical item
-- arrives later as a bonus. This converts the product's worst failure -- a
-- birthday where nothing happens -- into an acceptable one.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.substitute_digital_gift(p_moment_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event   moments.moment_events;
  v_product moments.gift_products;
  v_order   uuid;
BEGIN
  SELECT * INTO v_event FROM moments.moment_events m WHERE m.id = p_moment_event_id;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  -- Already on its way? Leave it alone.
  IF EXISTS (SELECT 1 FROM moments.gift_orders o
              WHERE o.moment_event_id = p_moment_event_id
                AND o.status IN ('in_transit','delivered')) THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'skipped', 'already_in_transit');
  END IF;

  SELECT * INTO v_product
    FROM moments.gift_products g
   WHERE g.is_active AND g.is_digital AND g.list_price_paisa <= GREATEST(v_event.budget_paisa, 10000)
   ORDER BY g.list_price_paisa DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'no_digital_gift_available');
  END IF;

  v_order := moments.create_gift_order(p_moment_event_id, v_product.id, 1::smallint);

  UPDATE moments.gift_orders o
     SET is_fallback = true, status = 'delivered',
         placed_at = pg_catalog.now(), delivered_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   WHERE o.id = v_order;

  INSERT INTO moments.audit_log (org_id, actor_kind, action, entity, entity_id, reason)
  VALUES (v_event.org_id, 'system', 'order.digital_fallback', 'gift_orders', v_order,
          'physical gift was not in transit by the morning of the moment');

  RETURN pg_catalog.jsonb_build_object('ok', true, 'orderId', v_order, 'product', v_product.name);
END $$;

REVOKE EXECUTE ON FUNCTION moments.substitute_digital_gift(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION moments.substitute_digital_gift(uuid) TO service_role;

COMMIT;
