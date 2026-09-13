-- 00028_fix_status_guard_and_fallback.sql
--
-- Three fixes found by smoke_money_path.sql.

BEGIN;

-- ==========================================================================
-- 1. The status guard blocked legitimate RPCs.
--
-- It decided "is this a tenant edit?" with auth.uid(). But auth.uid() reads the
-- JWT claims, which are STILL PRESENT inside a SECURITY DEFINER function -- so
-- respond_to_approval, called by a signed-in HR admin, was refused its own
-- awaiting_approval -> approved transition.
--
-- The correct signal is current_user. A direct PostgREST edit runs as
-- `authenticated`; a trusted SECURITY DEFINER RPC runs as its owner, and the
-- worker runs as `service_role`.
-- ==========================================================================
CREATE OR REPLACE FUNCTION moments.guard_moment_event_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR moments.is_platform_staff() THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT ((OLD.status = 'scheduled' AND NEW.status = 'skipped') OR NEW.status = 'cancelled') THEN
      RAISE EXCEPTION
        'moment_events: tenants may only skip a scheduled moment or cancel one (tried % -> %)',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ==========================================================================
-- 2. Cancelling a moment did not stop anything.
--
-- HR could cancel a moment, but its pending tasks and its queued order carried on
-- -- tenants cannot write moment_tasks or gift_orders directly, by design. This
-- trigger runs as the owner, so the cancellation actually cascades.
-- ==========================================================================
CREATE OR REPLACE FUNCTION moments.cascade_moment_cancellation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'skipped') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE moments.moment_tasks t
       SET status = 'cancelled',
           finished_at = pg_catalog.now(),
           result = pg_catalog.jsonb_build_object('reason', 'moment_' || NEW.status::text),
           locked_by = NULL, locked_at = NULL, lease_expires_at = NULL,
           updated_at = pg_catalog.now()
     WHERE t.moment_event_id = NEW.id
       AND t.status IN ('pending', 'failed');

    -- Only orders nobody has sent to a vendor yet. Something already on its way
    -- is an ops decision, not an automatic cancel.
    UPDATE moments.gift_orders o
       SET status = 'cancelled',
           cancelled_at = pg_catalog.now(),
           failure_reason = 'moment ' || NEW.status::text || ' by the organisation',
           updated_at = pg_catalog.now()
     WHERE o.moment_event_id = NEW.id
       AND o.status IN ('draft','pending_selection','awaiting_approval','approved','queued_for_ops');
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_moment_events_cascade_cancel ON moments.moment_events;
CREATE TRIGGER trg_moment_events_cascade_cancel
  AFTER UPDATE OF status ON moments.moment_events
  FOR EACH ROW EXECUTE FUNCTION moments.cascade_moment_cancellation();

-- ==========================================================================
-- 3. The digital backup could collide with -- or double up on -- the real order.
--
-- One live order per moment is enforced by a unique index. The old version
-- created the digital order while a queued physical one still existed, which
-- hits that index. And firing the backup when a vendor already has the order
-- would send two gifts and pay for both.
--
-- Now: if a vendor has it, stand down. If ops never placed it, cancel the stale
-- order first, then send the digital gift.
-- ==========================================================================
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
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM moments.gift_orders o
              WHERE o.moment_event_id = p_moment_event_id
                AND o.status IN ('placed_with_vendor','in_transit','delivered')) THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'skipped', 'vendor_has_it');
  END IF;

  -- Check a digital gift exists BEFORE cancelling anything: never cancel the
  -- physical order only to discover there is no backup.
  SELECT * INTO v_product
    FROM moments.gift_products g
   WHERE g.is_active AND g.is_digital
     AND g.list_price_paisa <= GREATEST(v_event.budget_paisa, 10000)
   ORDER BY g.list_price_paisa DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'no_digital_gift_available');
  END IF;

  UPDATE moments.gift_orders o
     SET status = 'cancelled',
         cancelled_at = pg_catalog.now(),
         failure_reason = 'not placed with a vendor in time; replaced by a digital gift',
         updated_at = pg_catalog.now()
   WHERE o.moment_event_id = p_moment_event_id
     AND o.status IN ('draft','pending_selection','awaiting_approval','approved','queued_for_ops');

  v_order := moments.create_gift_order(p_moment_event_id, v_product.id, 1::smallint);

  UPDATE moments.gift_orders o
     SET is_fallback = true, status = 'delivered',
         placed_at = pg_catalog.now(), delivered_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   WHERE o.id = v_order;

  INSERT INTO moments.audit_log (org_id, actor_kind, action, entity, entity_id, reason)
  VALUES (v_event.org_id, 'system', 'order.digital_fallback', 'gift_orders', v_order,
          'physical gift was not with a vendor by the morning of the moment');

  RETURN pg_catalog.jsonb_build_object('ok', true, 'orderId', v_order, 'product', v_product.name);
END $$;

COMMIT;
