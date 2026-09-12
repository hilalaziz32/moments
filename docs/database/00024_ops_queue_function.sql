-- 00024_ops_queue_function.sql
--
-- Fixes a real problem found by the privilege audit.
--
-- v_ops_order_queue selects gift_orders.margin_paisa / total_cost_paisa /
-- vendor_id. Those columns are REVOKED from `authenticated` (00018), and the
-- view is security_invoker, so the permission check runs as the caller. The
-- result: the ops queue was unreadable by EVERYONE, including our own ops staff,
-- who are also `authenticated`.
--
-- Confirmed by test: selecting margin_paisa through the view raises
-- "permission denied for table gift_orders".
--
-- The fix is not to loosen the column grants -- customers must never see our
-- margin. It is to expose the ops queue through a SECURITY DEFINER function that
-- checks is_platform_staff() explicitly. Gated, auditable, and it keeps the base
-- table locked down.

BEGIN;

DROP VIEW IF EXISTS moments.v_ops_order_queue;

CREATE OR REPLACE FUNCTION moments.ops_order_queue(p_limit int DEFAULT 200)
RETURNS TABLE (
  id                 uuid,
  order_number       text,
  status             moments.order_status,
  deliver_on         date,
  ops_sla_due_at     timestamptz,
  city               text,
  org_name           text,
  recipient_name     text,
  recipient_phone    text,
  address_snapshot   jsonb,
  dietary_snapshot   jsonb,
  total_price_paisa  bigint,
  total_cost_paisa   bigint,
  margin_paisa       bigint,
  vendor_name        text,
  assigned_staff_id  uuid,
  is_fallback        boolean,
  days_until_delivery int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- The gate. Without this, SECURITY DEFINER would hand every customer our
  -- entire margin book.
  IF NOT moments.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT o.id, o.order_number, o.status, o.deliver_on, o.ops_sla_due_at,
         c.name, org.name, o.recipient_name, o.recipient_phone,
         o.address_snapshot, o.dietary_snapshot,
         o.total_price_paisa, o.total_cost_paisa, o.margin_paisa,
         v.name, o.assigned_staff_id, o.is_fallback,
         (o.deliver_on - CURRENT_DATE)::int
    FROM moments.gift_orders o
    JOIN moments.organizations org ON org.id = o.org_id
    LEFT JOIN moments.cities  c ON c.id = o.city_id
    LEFT JOIN moments.vendors v ON v.id = o.vendor_id
   WHERE o.status IN ('queued_for_ops','approved','placed_with_vendor','in_transit')
   ORDER BY o.deliver_on, o.ops_sla_due_at NULLS LAST
   LIMIT p_limit;
END $$;

REVOKE EXECUTE ON FUNCTION moments.ops_order_queue(int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION moments.ops_order_queue(int) TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- Views are tables as far as GRANT is concerned, so the blanket
-- "GRANT ... ON ALL TABLES" in 00001 handed out INSERT/UPDATE/DELETE on them
-- too. Nothing writes through these views; take it back.
-- --------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON
  moments.v_ops_employees, moments.v_finance_employees, moments.v_task_health
FROM authenticated;

COMMIT;
