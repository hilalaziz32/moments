-- 00019_views.sql
--
-- EVERY VIEW IN THIS SCHEMA CARRIES WITH (security_invoker = true).
-- Without it a view runs as its OWNER (postgres) and silently bypasses RLS,
-- handing every tenant's orders to every customer. Supabase's
-- security_definer_view advisor flags this; treat a hit as a P0.

BEGIN;

-- --------------------------------------------------------------------------
-- The ops fulfillment queue. Not a table -- a view over gift_orders, so it can
-- never drift from the orders themselves.
-- --------------------------------------------------------------------------
CREATE VIEW moments.v_ops_order_queue WITH (security_invoker = true) AS
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
  FROM moments.gift_orders o
  JOIN moments.organizations org ON org.id = o.org_id
  LEFT JOIN moments.cities  c ON c.id = o.city_id
  LEFT JOIN moments.vendors v ON v.id = o.vendor_id
 WHERE o.status IN ('queued_for_ops','approved','placed_with_vendor','in_transit');

COMMENT ON VIEW moments.v_ops_order_queue IS
  'The ops fulfillment queue. security_invoker means a non-staff user sees nothing, '
  'because the underlying gift_orders/vendors policies deny them.';

-- --------------------------------------------------------------------------
-- What ops may see about an employee: ONLY people with an active order in the
-- next 14 days, and only the fields needed to get a gift to a door.
-- No DOB, no salary, no email, no full roster.
-- --------------------------------------------------------------------------
CREATE VIEW moments.v_ops_employees WITH (security_invoker = true) AS
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
       a.line1, a.line2, a.area, a.landmark, a.city_id,
       a.delivery_notes, a.google_maps_url,
       a.verification_status
  FROM moments.employees e
  LEFT JOIN moments.addresses a
         ON a.employee_id = e.id AND a.is_primary AND a.is_active
 WHERE EXISTS (
         SELECT 1 FROM moments.gift_orders o
          WHERE o.employee_id = e.id
            AND o.status NOT IN ('cancelled','delivered','failed')
            AND o.deliver_on BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 14
       );

-- --------------------------------------------------------------------------
-- What `finance` may see about an employee: nothing personal.
-- The finance role's PII exclusion is a real constraint, not a UI convention.
-- --------------------------------------------------------------------------
CREATE VIEW moments.v_finance_employees WITH (security_invoker = true) AS
SELECT e.id,
       e.org_id,
       COALESCE(e.preferred_name, e.full_name) AS display_name,
       e.department,
       e.status
  FROM moments.employees e
 WHERE e.deleted_at IS NULL;

-- --------------------------------------------------------------------------
-- The HR dashboard's "needs attention" strip, and the 09:10 watchdog's query.
-- --------------------------------------------------------------------------
CREATE VIEW moments.v_task_health WITH (security_invoker = true) AS
SELECT t.id,
       t.org_id,
       t.moment_event_id,
       t.task_type,
       t.lane,
       t.status,
       t.scheduled_for,
       t.next_attempt_at,
       t.attempts,
       t.max_attempts,
       t.last_error,
       t.error_class,
       (t.status = 'pending'
        AND t.next_attempt_at < now() - make_interval(secs => t.late_threshold_seconds))
         AS is_late
  FROM moments.moment_tasks t
 WHERE t.status IN ('pending','running','failed','dead');

COMMENT ON VIEW moments.v_task_health IS
  'Feeds the 09:10 PKT watchdog. Any announce-lane row for today not in '
  'succeeded/skipped is a P1 page: a missed birthday is a product-killing failure.';

GRANT SELECT ON moments.v_ops_order_queue, moments.v_ops_employees,
                moments.v_finance_employees, moments.v_task_health
  TO authenticated, service_role;

COMMIT;
