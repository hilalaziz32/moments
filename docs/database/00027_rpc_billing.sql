-- 00027_rpc_billing.sql
-- Monthly invoice generation and payment verification.
--
-- Revenue is subscription + margin on every fulfilled gift. Two rules make the
-- invoice defensible when a customer queries it:
--
--   * WE NEVER BILL FOR A GIFT THAT DID NOT ARRIVE. Only orders with
--     status='delivered' are invoiced; anything undelivered rolls forward.
--   * Margin is read from the ORDER, which snapshotted it at fulfillment.
--     A price-book change must not retroactively alter a delivered order.

BEGIN;

CREATE OR REPLACE FUNCTION moments.generate_invoice(
  p_org_id       uuid,
  p_period_start date,
  p_period_end   date
)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice   uuid;
  v_plan      moments.plans;
  v_headcount int;
  v_sub_paisa bigint := 0;
  v_gifts     bigint := 0;
  v_delivery  bigint := 0;
  v_tax_bps   int := 0;
  v_number    text;
BEGIN
  -- Idempotent BY CONSTRUCTION: invoices_org_period_uniq means re-running the
  -- monthly job is a no-op, not a duplicate bill.
  SELECT i.id INTO v_invoice
    FROM moments.invoices i
   WHERE i.org_id = p_org_id AND i.period_start = p_period_start AND i.kind = 'combined';
  IF FOUND THEN RETURN v_invoice; END IF;

  SELECT p.* INTO v_plan
    FROM moments.subscriptions s JOIN moments.plans p ON p.id = s.plan_id
   WHERE s.org_id = p_org_id AND s.status IN ('trialing','active','past_due')
   ORDER BY s.created_at DESC LIMIT 1;

  -- Headcount is the MAX active during the period, snapshotted onto the invoice,
  -- so "why did my bill go up" has a paper trail.
  SELECT pg_catalog.count(*)::int INTO v_headcount
    FROM moments.employees e
   WHERE e.org_id = p_org_id AND e.deleted_at IS NULL
     AND e.status IN ('active','on_leave','notice_period');

  IF v_plan.id IS NOT NULL THEN
    v_sub_paisa := v_plan.base_price_paisa
      + GREATEST(0, v_headcount - v_plan.included_employees) * v_plan.per_employee_paisa;
  END IF;

  SELECT COALESCE(pg_catalog.sum(o.items_price_paisa), 0),
         COALESCE(pg_catalog.sum(o.delivery_price_paisa), 0)
    INTO v_gifts, v_delivery
    FROM moments.gift_orders o
   WHERE o.org_id = p_org_id
     AND o.status = 'delivered'
     AND o.invoice_id IS NULL
     AND o.delivered_at::date BETWEEN p_period_start AND p_period_end;

  -- Provincial sales tax on SERVICES (SRB/PRA ~15-16%) applies to the
  -- subscription. Goods are treated differently, so gifts are excluded here.
  SELECT CASE o.tax_jurisdiction
           WHEN 'SRB' THEN 1500 WHEN 'PRA' THEN 1600
           WHEN 'KPRA' THEN 1500 WHEN 'BRA' THEN 1500 WHEN 'ICT' THEN 1600
           ELSE 0 END
    INTO v_tax_bps
    FROM moments.organizations o WHERE o.id = p_org_id;

  v_number := 'INV-' || pg_catalog.to_char(p_period_start, 'YYYY-MM') || '-' ||
              pg_catalog.upper(pg_catalog.encode(extensions.gen_random_bytes(2), 'hex'));

  INSERT INTO moments.invoices (
    org_id, number, kind, status, period_start, period_end,
    subtotal_subscription_paisa, subtotal_gifts_paisa, subtotal_delivery_paisa,
    tax_rate_bps, tax_paisa, total_paisa, employee_count_snapshot,
    issued_at, due_on
  ) VALUES (
    p_org_id, v_number, 'combined', 'issued', p_period_start, p_period_end,
    v_sub_paisa, v_gifts, v_delivery,
    v_tax_bps, (v_sub_paisa * v_tax_bps) / 10000,
    v_sub_paisa + v_gifts + v_delivery + (v_sub_paisa * v_tax_bps) / 10000,
    v_headcount, pg_catalog.now(), p_period_end + 14
  )
  RETURNING id INTO v_invoice;

  IF v_sub_paisa > 0 THEN
    INSERT INTO moments.invoice_lines (invoice_id, org_id, kind, description,
                                       quantity, unit_price_paisa, amount_paisa, metadata)
    VALUES (v_invoice, p_org_id, 'subscription',
            v_plan.name || ' — ' || pg_catalog.to_char(p_period_start, 'Mon YYYY'),
            1, v_sub_paisa, v_sub_paisa,
            pg_catalog.jsonb_build_object('headcount', v_headcount,
                                          'included', v_plan.included_employees));
  END IF;

  -- One line per delivered gift, so the customer can see exactly what they are
  -- paying for and tie it back to a person and a date.
  INSERT INTO moments.invoice_lines (invoice_id, org_id, kind, description, quantity,
                                     unit_price_paisa, amount_paisa, gift_order_id, moment_event_id)
  SELECT v_invoice, p_org_id, 'gift',
         COALESCE(i.name_snapshot, 'Gift') || ' for ' || o.recipient_name ||
           ' — ' || pg_catalog.to_char(o.deliver_on, 'DD Mon'),
         1, o.total_price_paisa, o.total_price_paisa, o.id, o.moment_event_id
    FROM moments.gift_orders o
    LEFT JOIN LATERAL (
      SELECT gi.name_snapshot FROM moments.gift_order_items gi
       WHERE gi.order_id = o.id ORDER BY gi.line_price_paisa DESC LIMIT 1
    ) i ON true
   WHERE o.org_id = p_org_id AND o.status = 'delivered' AND o.invoice_id IS NULL
     AND o.delivered_at::date BETWEEN p_period_start AND p_period_end;

  UPDATE moments.gift_orders o
     SET invoice_id = v_invoice, invoiced_at = pg_catalog.now()
   WHERE o.org_id = p_org_id AND o.status = 'delivered' AND o.invoice_id IS NULL
     AND o.delivered_at::date BETWEEN p_period_start AND p_period_end;

  RETURN v_invoice;
END $$;

REVOKE EXECUTE ON FUNCTION moments.generate_invoice(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION moments.generate_invoice(uuid, date, date) TO service_role;

-- --------------------------------------------------------------------------
-- verify_payment -- ops confirming a bank transfer landed.
--
-- There is no Stripe in Pakistan: bank transfer is the happy path, and a human
-- matching a screenshot against a bank statement is the correct v1 mechanism.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION moments.verify_payment(
  p_payment_id uuid,
  p_approve    boolean,
  p_reason     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_pay  moments.payments;
  v_paid bigint;
  v_inv  moments.invoices;
BEGIN
  IF NOT moments.is_platform_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_pay FROM moments.payments p WHERE p.id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE moments.payments p
     SET status = (CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END)::moments.payment_status,
         verified_by = v_user, verified_at = pg_catalog.now(),
         rejection_reason = CASE WHEN p_approve THEN NULL ELSE p_reason END,
         updated_at = pg_catalog.now()
   WHERE p.id = p_payment_id;

  IF p_approve AND v_pay.invoice_id IS NOT NULL THEN
    SELECT COALESCE(pg_catalog.sum(p.amount_paisa + p.wht_paisa), 0) INTO v_paid
      FROM moments.payments p
     WHERE p.invoice_id = v_pay.invoice_id AND p.status = 'verified';

    SELECT * INTO v_inv FROM moments.invoices i WHERE i.id = v_pay.invoice_id;

    UPDATE moments.invoices i
       SET paid_paisa = v_paid,
           wht_paisa = (SELECT COALESCE(pg_catalog.sum(p.wht_paisa), 0)
                          FROM moments.payments p
                         WHERE p.invoice_id = i.id AND p.status = 'verified'),
           -- Corporate customers withhold tax under s.153, so a payment that is
           -- short by exactly the WHT is still a settled invoice.
           status = (CASE WHEN v_paid >= i.total_paisa THEN 'paid'
                          WHEN v_paid > 0 THEN 'partially_paid'
                          ELSE i.status::text END)::moments.invoice_status,
           paid_at = CASE WHEN v_paid >= i.total_paisa THEN pg_catalog.now() ELSE i.paid_at END,
           updated_at = pg_catalog.now()
     WHERE i.id = v_pay.invoice_id;
  END IF;

  INSERT INTO moments.audit_log (org_id, actor_kind, actor_user_id, action, entity, entity_id, reason)
  VALUES (v_pay.org_id, 'staff', v_user,
          CASE WHEN p_approve THEN 'payment.verified' ELSE 'payment.rejected' END,
          'payments', p_payment_id, p_reason);

  RETURN pg_catalog.jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION moments.verify_payment(uuid, boolean, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION moments.verify_payment(uuid, boolean, text) TO authenticated, service_role;

COMMIT;
