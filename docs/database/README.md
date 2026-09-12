# `moments` schema

The database layer for Moments — Employee Celebration Autopilot.

## Critical context

**This Supabase project is shared.** Its `public` schema belongs to an unrelated
tours/bookings application (25 tables: `tours`, `bookings`, `guide_profiles`,
`vehicles`, …). Moments lives entirely in the `moments` schema and must never
create objects in `public`.

Consequences you must respect:

- `auth.users` is shared. The `on_auth_user_created_moments` trigger **swallows its
  own exceptions on purpose** — a raise inside it would make Supabase Auth signup
  return 500 for the tours app too.
- PostgREST's exposed-schema list is `public, graphql_public, moments`, **with
  `public` first** because the tours app calls `.from('bookings')` with no schema
  header. Moments clients must always use `supabase.schema('moments')`.

## Applying migrations

Ordered, idempotent-where-possible, applied with `psql` directly (no Supabase CLI
directory, matching the house convention).

```bash
export PGPASSWORD='<db password>'
CONN="postgresql://postgres.<ref>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
for f in docs/database/000*.sql; do
  echo "== $f"; psql "$CONN" -v ON_ERROR_STOP=1 -f "$f" || break
done
```

`00021_postgrest_expose.sql` **must run last**.

## Prerequisite that is invisible in SQL

If the API starts returning `PGRST106`, PostgREST is not serving `moments`.
Re-run `00021`, or set it through the Management API:

```
PATCH https://api.supabase.com/v1/projects/{ref}/postgrest
{"db_schema": "public, graphql_public, moments"}
```

The Dashboard (Settings → API → Exposed schemas) writes the same config and **can
overwrite the `ALTER ROLE`** if someone opens that page and saves.

## Hard constraints discovered on this project

| Constraint | Consequence |
|---|---|
| `statement_timeout = 8s` on `authenticator` | Every PostgREST request is capped at 8s. **CSV import and all bulk writes must chunk.** |
| `timestamptz + interval` is STABLE, not IMMUTABLE | Cannot back a generated column. `addresses.verification_expires_at` and `moment_events.announce_at` are trigger-maintained. |
| `NULLIF`, `COALESCE`, `EXTRACT(x FROM y)` are SQL syntax | Not schema-qualifiable. Under `SET search_path = ''` use `pg_catalog.date_part('epoch', …)`, and leave `NULLIF`/`COALESCE` unqualified. |
| `= ANY ((SELECT f()))` parses as a row-set | Must be `= ANY ((SELECT f())::uuid[])` to compare against an array — and that form is what produces the once-per-query InitPlan. |
| SQL-language function bodies validate at CREATE time | `current_employee_id` had to move to `00007`, after `employees` exists. plpgsql defers; SQL does not. |

## Design rules

1. **`org_id` is denormalised onto every tenant table.** RLS policies never join.
2. **Money is `bigint` paisa**, suffix `_paisa`, with a `CHECK (x = 0 OR x BETWEEN
   10000 AND 100000000)` floor. The PKR 100 floor catches the rupees-vs-paisa bug
   at insert time rather than when a vendor laughs at a PKR 25 cake order.
3. **`anon` has zero table privileges.** Tokenised links go through
   `SECURITY DEFINER` RPCs only.
4. **The task queue is product data.** The T-7/T-4/T-2/T-0 timeline is what the HR
   dashboard renders, so it lives in `moment_tasks`, not pgmq/pgboss.
5. **The detector is idempotent by unique key**, not bookkeeping:
   `ON CONFLICT DO NOTHING` against
   `moment_events(org_id, employee_id, moment_type_id, occurrence_key)`.

### `occurrence_key` contract

| Moment | Key |
|---|---|
| birthday / work_anniversary | `2026-09-28` (resolved date) |
| new_hire | `hire:2026-09-01` |
| **eid_ul_fitr** | **`eid_ul_fitr:1448` — Hijri year, NOT the Gregorian date** |
| promotion / marriage / new_baby / farewell | `evt:<employee_events.id>` |

The Hijri-year key is the crux: when the Ruet-e-Hilal Committee moves Eid by a day,
`occurs_on` changes but `occurrence_key` does not, so the detector recognises the
same occurrence instead of duplicating it.

## Things that will break the product if you change them

- **Never `ALTER TABLE moments.org_members FORCE ROW LEVEL SECURITY.`** The RLS
  helpers are `SECURITY DEFINER` and rely on the table owner being RLS-exempt;
  forcing it would make every policy in the schema recurse.
- **Never add `vault` to `pgrst.db_schemas`**, and never grant `SELECT` on
  `vault.decrypted_secrets`. That view decrypts on read.
- **Every view needs `WITH (security_invoker = true)`.** Without it the view runs as
  `postgres` and silently bypasses RLS.
- **`attempts` is incremented at CLAIM time, not completion.** That is what stops a
  task that crashes the worker process from crash-looping forever.
- **Feb 29:** `birth_mmdd = 229` matches nothing in a non-leap year. The detector
  must widen to include `229` when its window covers Feb 28, honouring
  `organizations.feb29_observed_on`.
- **Historical hires:** `new_hire` must only fire for `hire_date >= today - 3 days`.
  Without that guard, importing 340 employees on day one fires 340 new-hire
  celebrations and 340 gift orders.

## Verification

```bash
psql "$CONN" -f docs/database/tests/smoke_bilal_birthday.sql
```

Covers: announce_at = 09:00 PKT, detector idempotency, pipeline fan-out,
`claim_due_tasks` leasing, concurrent-worker exclusion, zombie-worker rejection,
outbox idempotency, and the money floor.

Advisor-equivalent checks (all must return 0):

```sql
SELECT count(*) FROM pg_tables WHERE schemaname='moments' AND NOT rowsecurity;
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='moments' AND c.relkind='v'
   AND NOT (coalesce(c.reloptions,'{}') @> ARRAY['security_invoker=true']);
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='moments'
   AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%');
SELECT count(*) FROM information_schema.table_privileges
 WHERE table_schema='moments' AND grantee='anon';
```
