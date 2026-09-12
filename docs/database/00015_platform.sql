-- 00015_platform.sql
-- audit_log, job_runs, task_attempts, alerts, rate limiting, feature flags.
--
-- job_runs and task_attempts are queried directly by /ops -- no external job
-- dashboard is needed, which is one of the real payoffs of a DB-backed queue.

BEGIN;

CREATE TABLE moments.audit_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id         uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  actor_kind     moments.actor_kind NOT NULL DEFAULT 'user',
  actor_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label    text,
  action         text NOT NULL,
  entity         text NOT NULL,
  entity_id      uuid,
  before         jsonb,
  after          jsonb,
  reason         text,                   -- required for sensitive ops actions
  ip             inet,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_org_idx    ON moments.audit_log (org_id, created_at DESC);
CREATE INDEX audit_log_entity_idx ON moments.audit_log (entity, entity_id, created_at DESC);
CREATE INDEX audit_log_actor_idx  ON moments.audit_log (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

-- One row per cron invocation.
CREATE TABLE moments.job_runs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind         text NOT NULL,            -- 'detector' | 'watchdog' | 'reaper' | 'billing'
  org_id       uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running','succeeded','failed')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  duration_ms  int,
  counts       jsonb NOT NULL DEFAULT '{}'::jsonb,
  error        text,
  worker_id    text
);
CREATE INDEX job_runs_kind_idx ON moments.job_runs (kind, started_at DESC);

-- Append-only: one row per execution attempt. The forensic record when a
-- customer asks why something was late.
CREATE TABLE moments.task_attempts (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id     uuid NOT NULL REFERENCES moments.moment_tasks(id) ON DELETE CASCADE,
  org_id      uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  attempt     int NOT NULL,
  worker_id   text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int,
  outcome     text CHECK (outcome IN ('succeeded','retry','skipped','failed','dead','timeout')),
  error_class text,
  error       text,
  result      jsonb
);
CREATE INDEX task_attempts_task_idx ON moments.task_attempts (task_id, attempt);

-- Dead letters, replayable from /ops with one button.
CREATE TABLE moments.dead_letters (
  id           uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  task_id      uuid REFERENCES moments.moment_tasks(id) ON DELETE SET NULL,
  org_id       uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  task_type    moments.task_type NOT NULL,
  moment_event_id uuid REFERENCES moments.moment_events(id) ON DELETE SET NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors       jsonb NOT NULL DEFAULT '[]'::jsonb,
  replayed_at  timestamptz,
  replayed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dead_letters_org_idx ON moments.dead_letters (org_id, created_at DESC);

-- --------------------------------------------------------------------------
-- Alerts. The partial unique index on dedupe_key is what stops a flapping
-- condition creating 400 alerts instead of one.
-- --------------------------------------------------------------------------
CREATE TABLE moments.alerts (
  id          uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  severity    moments.alert_severity NOT NULL,
  status      moments.alert_status NOT NULL DEFAULT 'open',
  kind        text NOT NULL,
  org_id      uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  entity      text,
  entity_id   uuid,
  title       text NOT NULL,
  body        text,
  dedupe_key  text NOT NULL,
  acked_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acked_at    timestamptz,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX alerts_open_dedupe_uniq ON moments.alerts (dedupe_key) WHERE status = 'open';
CREATE INDEX alerts_open_idx ON moments.alerts (severity, created_at DESC) WHERE status = 'open';

-- --------------------------------------------------------------------------
-- Rate limiting for the tokenised public routes. Postgres, not Redis -- adding
-- Upstash for this is not worth the dependency at v1 scale.
-- --------------------------------------------------------------------------
CREATE TABLE moments.rate_limit_buckets (
  bucket_key   text NOT NULL,
  window_start timestamptz NOT NULL,
  count        int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
CREATE INDEX rate_limit_window_idx ON moments.rate_limit_buckets (window_start);

CREATE OR REPLACE FUNCTION moments.check_rate_limit(
  p_key text, p_limit int, p_window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window timestamptz;
  v_count  int;
BEGIN
  -- date_part, not EXTRACT(x FROM y): the latter is SQL syntax and cannot be
  -- schema-qualified, which SET search_path = '' requires.
  v_window := pg_catalog.to_timestamp(
    pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.now()) / p_window_seconds)
      * p_window_seconds);

  INSERT INTO moments.rate_limit_buckets (bucket_key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET count = moments.rate_limit_buckets.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END $$;

COMMENT ON FUNCTION moments.check_rate_limit(text, int, int) IS
  'Sliding-window rate limit. Returns true if the call is allowed. Callers: '
  'tok:ip 30/5min, tok:miss:<ip> 10/10min, tok:sub:<tokenId> 20/hour, tok:org:<id> 500/hour.';

REVOKE EXECUTE ON FUNCTION moments.check_rate_limit(text, int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION moments.check_rate_limit(text, int, int) TO service_role;

CREATE TABLE moments.feature_flags (
  key         text PRIMARY KEY,
  description text,
  is_enabled  boolean NOT NULL DEFAULT false,
  org_ids     uuid[] NOT NULL DEFAULT '{}',   -- empty = applies globally when enabled
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_alerts_updated_at        BEFORE UPDATE ON moments.alerts
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON moments.feature_flags
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
