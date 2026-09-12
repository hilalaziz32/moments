-- 00013_messaging.sql
-- Integrations, templates, and the outbound message outbox.
--
-- ############################################################################
-- HOW SECRETS ARE STORED -- read this before touching org_integrations.
--
-- 1. NEVER store a token in a column of this table. Store vault.secrets.id.
-- 2. Write path (service_role, during the OAuth callback):
--      SELECT vault.create_secret($1, 'slack_access:' || $2::text, $3);
--    Rotation: vault.update_secret(secret_id, new_token) keeps the same pointer,
--    so no table update is needed.
-- 3. Read path: ONLY through moments.get_integration_secret(), SECURITY DEFINER,
--    granted to service_role alone, which audits every read.
-- 4. NEVER add `vault` to pgrst.db_schemas. NEVER grant SELECT on
--    vault.decrypted_secrets to anon/authenticated -- that view decrypts on read,
--    and one careless grant puts every customer's Slack token an HTTP GET away.
-- 5. Platform-wide secrets (our WhatsApp system token, Resend key) do NOT belong
--    in Vault -- those are worker environment variables. Vault is for per-tenant
--    secrets that must be row-addressable.
-- 6. The *_secret_id columns are excluded from the `authenticated` column grant
--    in 00017, so even an org owner cannot read the pointer.
-- ############################################################################

BEGIN;

CREATE TABLE moments.org_integrations (
  id                  uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  provider            moments.integration_provider NOT NULL,
  status              moments.integration_status NOT NULL DEFAULT 'pending',
  display_name        text,
  external_team_id    text,                    -- Slack team id / WABA id
  external_account_id text,                    -- WhatsApp phone_number_id, sender address
  default_channel_ref text,                    -- Slack channel id for announcements
  config_public       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- NON-SECRET config only

  -- Pointers into Supabase Vault. Never the value.
  access_token_secret_id  uuid,
  refresh_token_secret_id uuid,
  signing_secret_id       uuid,
  token_expires_at    timestamptz,
  scopes              text[] NOT NULL DEFAULT '{}',

  installed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_verified_at    timestamptz,
  last_error          text,
  last_error_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_integrations_uniq UNIQUE (org_id, provider, external_account_id)
);
CREATE INDEX org_integrations_org_idx
  ON moments.org_integrations (org_id, provider) WHERE status = 'connected';

-- --------------------------------------------------------------------------
-- WhatsApp template registry.
--
-- prepare_announcement REFUSES to proceed at T-1 if the template it needs is not
-- APPROVED -- so a template problem surfaces as an HR-visible warning 15 hours
-- early, instead of as silence at 09:00.
-- --------------------------------------------------------------------------
CREATE TABLE moments.whatsapp_templates (
  id            uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id        uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,  -- NULL = platform
  name          text NOT NULL,
  language      text NOT NULL DEFAULT 'en',
  category      text NOT NULL CHECK (category IN ('MARKETING','UTILITY','AUTHENTICATION')),
  status        text NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','APPROVED','REJECTED','PAUSED','DISABLED')),
  body          text NOT NULL,
  variable_map  jsonb NOT NULL DEFAULT '[]'::jsonb,   -- positional {{1}} -> field path
  external_id   text,
  rejected_reason text,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_uniq UNIQUE (org_id, name, language) 
);
CREATE INDEX whatsapp_templates_status_idx ON moments.whatsapp_templates (status);

COMMENT ON COLUMN moments.whatsapp_templates.category IS
  'A birthday greeting is MARKETING, not UTILITY -- frequency-capped, opt-in required, '
  'counts against quality rating. File address confirmation as UTILITY with wording '
  'that earns it ("Confirm your delivery address for an upcoming delivery").';

-- 24-hour session window: an inbound message allows freeform replies for 24h.
CREATE TABLE moments.whatsapp_sessions (
  id                uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  employee_id       uuid REFERENCES moments.employees(id) ON DELETE CASCADE,
  wa_id             text NOT NULL,
  window_expires_at timestamptz NOT NULL,
  last_inbound_at   timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_sessions_uniq UNIQUE (org_id, wa_id)
);
CREATE INDEX whatsapp_sessions_window_idx ON moments.whatsapp_sessions (window_expires_at);

-- --------------------------------------------------------------------------
-- What we say: per moment type x channel x audience x locale.
-- org_id IS NULL = platform default, which orgs may override.
-- --------------------------------------------------------------------------
CREATE TABLE moments.message_templates (
  id             uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id         uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  moment_type_id uuid REFERENCES moments.moment_types(id) ON DELETE CASCADE,
  channel        moments.channel NOT NULL,
  audience       moments.message_audience NOT NULL,
  locale         text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ur','ur-Latn')),
  tone           text NOT NULL DEFAULT 'warm' CHECK (tone IN ('warm','professional','playful')),
  subject        text,
  body           text NOT NULL,
  whatsapp_template_id uuid REFERENCES moments.whatsapp_templates(id) ON DELETE SET NULL,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX message_templates_uniq
  ON moments.message_templates (org_id, moment_type_id, channel, audience, locale, tone)
  NULLS NOT DISTINCT;
CREATE INDEX message_templates_lookup_idx
  ON moments.message_templates (moment_type_id, channel, audience, locale) WHERE is_active;

-- --------------------------------------------------------------------------
-- The outbox.
--
-- idempotency_key = sha256(moment_event_id : task_type : channel : target), and
-- the row is written BEFORE the network call. A crash between the call and the
-- write leaves a 'sending' row that the reaper resolves by QUERYING THE PROVIDER
-- (Slack conversations.history by ts, Meta by message id) rather than blindly
-- resending. This is the real defence against a duplicated 09:00 announcement.
-- --------------------------------------------------------------------------
CREATE TABLE moments.outbound_messages (
  id               uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  moment_event_id  uuid REFERENCES moments.moment_events(id) ON DELETE CASCADE,
  task_id          uuid REFERENCES moments.moment_tasks(id)  ON DELETE SET NULL,
  employee_id      uuid REFERENCES moments.employees(id)     ON DELETE SET NULL,
  channel          moments.channel NOT NULL,
  audience         moments.message_audience NOT NULL,
  template_id      uuid REFERENCES moments.message_templates(id) ON DELETE SET NULL,

  idempotency_key  text NOT NULL,
  recipient_ref    text NOT NULL,              -- email / E.164 / Slack channel or user id
  rendered_subject text,
  rendered_body    text,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,

  status           moments.message_status NOT NULL DEFAULT 'queued',
  scheduled_for    timestamptz,
  sent_at          timestamptz,
  delivered_at     timestamptz,
  read_at          timestamptz,
  failed_at        timestamptz,
  provider_message_id text,                    -- Slack ts / Meta wamid
  provider_response   jsonb,
  error_code       text,
  error_message    text,
  is_preview       boolean NOT NULL DEFAULT false,   -- dry-run mode
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbound_messages_idem_uniq UNIQUE (idempotency_key)
);
CREATE INDEX outbound_messages_event_idx  ON moments.outbound_messages (moment_event_id);
CREATE INDEX outbound_messages_org_idx    ON moments.outbound_messages (org_id, created_at DESC);
CREATE INDEX outbound_messages_stuck_idx  ON moments.outbound_messages (updated_at)
  WHERE status = 'sending';
CREATE INDEX outbound_messages_provider_idx ON moments.outbound_messages (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE moments.outbound_message_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id  uuid NOT NULL REFERENCES moments.outbound_messages(id) ON DELETE CASCADE,
  org_id      uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  status      moments.message_status NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbound_message_events_msg_idx
  ON moments.outbound_message_events (message_id, occurred_at DESC);

-- Suppression list: hard bounces and complaints. Checked before every send.
CREATE TABLE moments.suppressions (
  id         uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id     uuid REFERENCES moments.organizations(id) ON DELETE CASCADE,
  channel    moments.channel NOT NULL,
  target     text NOT NULL,
  reason     text NOT NULL CHECK (reason IN ('hard_bounce','complaint','unsubscribed','opted_out','invalid')),
  detail     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppressions_uniq UNIQUE (org_id, channel, target) 
);

CREATE TRIGGER trg_org_integrations_updated_at   BEFORE UPDATE ON moments.org_integrations
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_whatsapp_templates_updated_at BEFORE UPDATE ON moments.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_whatsapp_sessions_updated_at  BEFORE UPDATE ON moments.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_message_templates_updated_at  BEFORE UPDATE ON moments.message_templates
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();
CREATE TRIGGER trg_outbound_messages_updated_at  BEFORE UPDATE ON moments.outbound_messages
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
