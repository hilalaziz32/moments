-- 00029_tenant_consistency_guards.sql
--
-- A cross-tenant hole, found while building the billing screen.
--
-- RLS on a table checks the row's OWN org_id. It says nothing about the rows that
-- row POINTS AT. payments.invoice_id is a plain foreign key, so a customer who
-- learned another tenant's invoice id could insert a payment with their own
-- org_id and the other tenant's invoice -- and ops verifying it would mark
-- someone else's invoice paid.
--
-- The same shape exists wherever a tenant can write a row referencing another
-- tenant-owned row: an address pointing at another org's employee would make
-- create_gift_order ship that employee's gift to an attacker's door.
--
-- UUIDs are unguessable and never exposed across tenants, so this was hard to
-- exploit -- but "hard to guess" is not a security boundary. One generic guard,
-- applied to every tenant-writable reference.

BEGIN;

CREATE OR REPLACE FUNCTION moments.guard_same_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fk_col text := TG_ARGV[0];
  v_parent text := TG_ARGV[1];
  v_ref    uuid;
  v_ok     boolean;
BEGIN
  v_ref := (pg_catalog.to_jsonb(NEW) ->> v_fk_col)::uuid;
  IF v_ref IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE pg_catalog.format(
    'SELECT EXISTS (SELECT 1 FROM moments.%I p WHERE p.id = $1 AND p.org_id = $2)', v_parent)
    INTO v_ok USING v_ref, NEW.org_id;

  IF NOT v_ok THEN
    RAISE EXCEPTION '%.% points at a % row in a different organisation',
      TG_TABLE_NAME, v_fk_col, v_parent
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  g record;
BEGIN
  FOR g IN
    SELECT * FROM (VALUES
      ('payments',             'invoice_id',      'invoices'),
      ('addresses',            'employee_id',     'employees'),
      ('employee_events',      'employee_id',     'employees'),
      ('employee_import_rows', 'batch_id',        'employee_import_batches'),
      ('employees',            'manager_id',      'employees'),
      ('employees',            'office_id',       'offices'),
      ('org_members',          'employee_id',     'employees'),
      ('moment_events',        'employee_id',     'employees'),
      ('moment_tasks',         'moment_event_id', 'moment_events'),
      ('approval_requests',    'moment_event_id', 'moment_events'),
      ('gift_orders',          'moment_event_id', 'moment_events'),
      ('gift_order_items',     'order_id',        'gift_orders'),
      ('outbound_messages',    'moment_event_id', 'moment_events')
    ) AS t(tbl, col, parent)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON moments.%I',
                   'trg_' || g.tbl || '_same_org_' || g.col, g.tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %I, org_id ON moments.%I
         FOR EACH ROW EXECUTE FUNCTION moments.guard_same_org(%L, %L)',
      'trg_' || g.tbl || '_same_org_' || g.col, g.col, g.tbl, g.col, g.parent);
  END LOOP;
END $$;

COMMIT;
