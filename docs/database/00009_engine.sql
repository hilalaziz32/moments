-- 00009_engine.sql
-- moment_events + moment_tasks + action_tokens.
--
-- This file is the product. moment_tasks is a durable, leased, idempotent work
-- queue where each row says "do this thing, for this person, at this instant in
-- Asia/Karachi". Get it right and the rest is CRUD. Get it wrong and you miss
-- Bilal's birthday and lose the account.

BEGIN;

-- --------------------------------------------------------------------------
-- ONE celebration occurrence.
-- --------------------------------------------------------------------------
CREATE TABLE moments.moment_events (
  id                uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  employee_id       uuid REFERENCES moments.employees(id) ON DELETE CASCADE,   -- NULL = org-wide (Eid)
  moment_type_id    uuid NOT NULL REFERENCES moments.moment_types(id) ON DELETE RESTRICT,
  policy_id         uuid REFERENCES moments.moment_policies(id) ON DELETE SET NULL,

  -- *** IDEMPOTENCY ***
  -- Deterministic, computed by the detector. The contract:
  --   birthday / work_anniversary   '2026-09-28'   (the resolved occurrence date)
  --   new_hire                      'hire:2026-09-01'
  --   eid_ul_fitr                   'eid_ul_fitr:1448'   <-- HIJRI YEAR, not the date
  --   promotion/marriage/baby/exit  'evt:<employee_events.id>'
  --   manual                        'manual:<uuid>'
  --
  -- The Hijri-year key is the crux: when the Ruet-e-Hilal Committee moves Eid by a
  -- day, occurs_on changes but occurrence_key does NOT, so the detector's
  -- ON CONFLICT DO NOTHING recognises the same occurrence instead of duplicating it.
  occurrence_key    text NOT NULL CHECK (length(occurrence_key) BETWEEN 1 AND 120),

  occurs_on         date NOT NULL,
  occurrence_year   int GENERATED ALWAYS AS (EXTRACT(YEAR FROM occurs_on)::int) STORED,
  timezone          text NOT NULL DEFAULT 'Asia/Karachi',
  announce_local_time time NOT NULL DEFAULT '09:00',
  -- Trigger-maintained, not GENERATED: `AT TIME ZONE <column>` is STABLE, not
  -- IMMUTABLE, so it cannot back a generated column. Same semantics, one trigger.
  announce_at       timestamptz,

  status            moments.moment_status NOT NULL DEFAULT 'detected',
  title             text,
  milestone_years   smallint CHECK (milestone_years IS NULL OR milestone_years BETWEEN 0 AND 80),
  milestone_tier_id uuid REFERENCES moments.milestone_tiers(id) ON DELETE SET NULL,

  budget_paisa      bigint NOT NULL DEFAULT 0
    CHECK (budget_paisa = 0 OR budget_paisa BETWEEN 10000 AND 100000000),
  approval_required boolean NOT NULL DEFAULT false,
  delivery_target   moments.delivery_target NOT NULL DEFAULT 'home',
  gift_enabled      boolean NOT NULL DEFAULT true,
  announcement_enabled boolean NOT NULL DEFAULT true,
  announce_publicly boolean NOT NULL DEFAULT true,

  -- The policy AS OF materialisation. Never re-read live.
  -- When HR raises the birthday budget on Sept 25, Bilal's Sept 28 birthday --
  -- already through gift selection -- must not silently change. This kills an
  -- entire class of "why did this cost more than approved" tickets and makes
  -- invoices defensible.
  policy_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,

  source            moments.moment_date_source NOT NULL DEFAULT 'employee_date_field',
  source_ref_id     uuid,                     -- employee_events.id or observance_dates.id
  is_provisional    boolean NOT NULL DEFAULT false,   -- from a 'predicted' lunar date
  occurrence_note   text,                     -- 'leap_day_observed', 'compressed', ...

  gift_order_id     uuid,                     -- FK added in 00011_fulfillment.sql
  announcement_payload jsonb,                 -- pre-rendered at T-1 18:00
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT moment_events_terminal_ts CHECK (
    (status <> 'completed' OR completed_at IS NOT NULL) AND
    (status <> 'cancelled' OR cancelled_at IS NOT NULL))
);

-- THE idempotency backbone. NULLS NOT DISTINCT so org-wide events
-- (employee_id IS NULL) dedupe too. The detector can run hourly and not double-fire.
CREATE UNIQUE INDEX moment_events_occurrence_uniq
  ON moments.moment_events (org_id, employee_id, moment_type_id, occurrence_key)
  NULLS NOT DISTINCT;

CREATE INDEX moment_events_org_calendar_idx ON moments.moment_events (org_id, occurs_on DESC);
CREATE INDEX moment_events_org_status_idx   ON moments.moment_events (org_id, status, occurs_on);
CREATE INDEX moment_events_employee_idx     ON moments.moment_events (employee_id, occurs_on DESC);
CREATE INDEX moment_events_provisional_idx  ON moments.moment_events (source_ref_id)
  WHERE is_provisional;
CREATE INDEX moment_events_open_idx         ON moments.moment_events (occurs_on)
  WHERE status NOT IN ('completed','cancelled','skipped','rejected');

CREATE OR REPLACE FUNCTION moments.set_moment_announce_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.announce_at := (NEW.occurs_on + NEW.announce_local_time) AT TIME ZONE NEW.timezone;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_moment_events_announce_at
  BEFORE INSERT OR UPDATE OF occurs_on, announce_local_time, timezone
  ON moments.moment_events
  FOR EACH ROW EXECUTE FUNCTION moments.set_moment_announce_at();

-- --------------------------------------------------------------------------
-- The queue. Also the T-7/T-4/T-2/T-0 timeline the HR dashboard renders --
-- which is exactly why it is product data and not pgmq/pgboss.
-- --------------------------------------------------------------------------
CREATE TABLE moments.moment_tasks (
  id               uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  moment_event_id  uuid NOT NULL REFERENCES moments.moment_events(id) ON DELETE CASCADE,
  task_type        moments.task_type NOT NULL,
  lane             moments.task_lane NOT NULL DEFAULT 'default',
  status           moments.task_status NOT NULL DEFAULT 'pending',

  -- scheduled_for is the PRODUCT-MEANINGFUL instant: what the UI shows and what
  -- the SLO measures. next_attempt_at is the OPERATIONAL due time that backoff
  -- mutates. Conflating them makes a retried task's timeline display lie.
  scheduled_for    timestamptz NOT NULL,
  next_attempt_at  timestamptz NOT NULL,

  priority         smallint NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 1000),
  attempts         int NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts     int NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 50),
  late_threshold_seconds int NOT NULL DEFAULT 3600 CHECK (late_threshold_seconds > 0),

  locked_by        text,
  locked_at        timestamptz,
  lease_expires_at timestamptz,

  last_error       text,
  error_class      text,
  last_error_at    timestamptz,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  result           jsonb,
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Makes task scheduling safely re-runnable: a detector re-run or a policy change
  -- can ON CONFLICT DO UPDATE SET scheduled_for = ... instead of spawning a
  -- duplicate T-7.
  CONSTRAINT moment_tasks_event_type_uniq UNIQUE (moment_event_id, task_type),
  CONSTRAINT moment_tasks_running_has_lease
    CHECK (status <> 'running' OR (locked_by IS NOT NULL AND lease_expires_at IS NOT NULL))
) WITH (
  -- status is indexed, which blocks HOT updates on every state transition.
  fillfactor = 80,
  autovacuum_vacuum_scale_factor  = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);

-- *** THE POLLER INDEX *** -- matches claim_due_tasks' ORDER BY exactly.
CREATE INDEX moment_tasks_due_idx
  ON moments.moment_tasks (lane, priority, next_attempt_at, id)
  WHERE status = 'pending';

-- *** THE REAPER INDEX *** -- tasks whose worker died mid-flight.
CREATE INDEX moment_tasks_lease_idx
  ON moments.moment_tasks (lease_expires_at)
  WHERE status = 'running';

-- Dashboard timeline for one moment.
CREATE INDEX moment_tasks_event_idx  ON moments.moment_tasks (moment_event_id, scheduled_for);
-- Ops: what is failing right now.
CREATE INDEX moment_tasks_failed_idx ON moments.moment_tasks (org_id, updated_at DESC)
  WHERE status IN ('failed','dead');

COMMENT ON INDEX moments.moment_tasks_due_idx IS
  'Partial on status=pending, so a succeeded task leaves the index entirely. Keeps the '
  'hot index proportional to PENDING WORK rather than total history -- the difference '
  'between a 3 MB index and a 3 GB one after two years.';

-- --------------------------------------------------------------------------
-- ONE table for every tokenised, login-free link. One security review, one
-- revocation path.
--
-- RLS: ENABLED WITH ZERO POLICIES (see 00016). Not anon, not authenticated, not
-- even org admins. The only access path is SECURITY DEFINER RPCs. A token row
-- that is never selectable through PostgREST can never leak through PostgREST.
-- --------------------------------------------------------------------------
CREATE TABLE moments.action_tokens (
  id              uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id          uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  purpose         moments.token_purpose NOT NULL,
  -- sha256 of the plaintext. The plaintext is never stored.
  token_hash      bytea NOT NULL,
  -- First 12 chars, indexed, for O(1) lookup before the timing-safe hash compare.
  token_lookup    text NOT NULL,
  subject_type    text NOT NULL CHECK (subject_type IN
                    ('employee','moment_event','approval_request','invitation','address')),
  subject_id      uuid NOT NULL,
  moment_event_id uuid REFERENCES moments.moment_events(id) ON DELETE CASCADE,
  issued_to_email text,
  issued_to_phone text,
  expires_at      timestamptz NOT NULL,
  max_uses        smallint NOT NULL DEFAULT 5 CHECK (max_uses BETWEEN 1 AND 100),
  use_count       smallint NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  first_used_at   timestamptz,
  last_used_at    timestamptz,
  consumed_at     timestamptz,
  revoked_at      timestamptz,
  revoked_reason  text,
  last_ip         inet,
  last_user_agent text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT action_tokens_hash_uniq  UNIQUE (token_hash),
  CONSTRAINT action_tokens_uses_bounded CHECK (use_count <= max_uses)
);
CREATE INDEX action_tokens_lookup_idx  ON moments.action_tokens (token_lookup);
CREATE INDEX action_tokens_subject_idx ON moments.action_tokens (subject_type, subject_id);
CREATE INDEX action_tokens_expiry_idx  ON moments.action_tokens (expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE moments.invitations
  ADD CONSTRAINT invitations_token_id_fkey
  FOREIGN KEY (token_id) REFERENCES moments.action_tokens(id) ON DELETE CASCADE;

-- --------------------------------------------------------------------------
-- Append-only audit of every token access. Gives HR a trail and gives us the
-- forensic record when a customer asks "who changed this address".
-- --------------------------------------------------------------------------
CREATE TABLE moments.token_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_id    uuid NOT NULL REFERENCES moments.action_tokens(id) ON DELETE CASCADE,
  org_id      uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('viewed','submitted','rejected','expired','revoked')),
  ip          inet,
  user_agent  text,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX token_events_token_idx ON moments.token_events (token_id, occurred_at DESC);

CREATE TRIGGER trg_moment_events_updated_at BEFORE UPDATE ON moments.moment_events
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_moment_tasks_updated_at  BEFORE UPDATE ON moments.moment_tasks
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
