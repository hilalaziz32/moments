-- 00012_approvals.sql
-- The T-2 "does HR/manager bless this spend?" step, answerable without a login.

BEGIN;

CREATE TABLE moments.approval_requests (
  id                   uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES moments.organizations(id) ON DELETE CASCADE,
  moment_event_id      uuid NOT NULL REFERENCES moments.moment_events(id) ON DELETE CASCADE,
  gift_order_id        uuid REFERENCES moments.gift_orders(id)  ON DELETE SET NULL,
  task_id              uuid REFERENCES moments.moment_tasks(id) ON DELETE SET NULL,
  requested_amount_paisa bigint NOT NULL CHECK (requested_amount_paisa >= 0),
  budget_paisa         bigint NOT NULL DEFAULT 0,
  summary              text,

  -- Who was asked.
  approver_kind        moments.approver_kind NOT NULL,
  approver_user_id     uuid REFERENCES auth.users(id)        ON DELETE SET NULL,
  approver_employee_id uuid REFERENCES moments.employees(id) ON DELETE SET NULL,
  approver_email       text,
  approver_phone       text,
  channel              moments.channel NOT NULL DEFAULT 'email',
  token_id             uuid REFERENCES moments.action_tokens(id) ON DELETE SET NULL,
  -- Above this amount the approve flow requires an emailed OTP: high-value
  -- approvals must not be one tap from a forwardable link.
  requires_otp         boolean NOT NULL DEFAULT false,
  otp_hash             bytea,
  otp_expires_at       timestamptz,

  status               moments.approval_decision NOT NULL DEFAULT 'pending',
  sent_at              timestamptz,
  expires_at           timestamptz NOT NULL,
  auto_approve_at      timestamptz,
  auto_approve_on_timeout boolean NOT NULL DEFAULT true,
  reminder_count       smallint NOT NULL DEFAULT 0 CHECK (reminder_count BETWEEN 0 AND 10),
  last_reminded_at     timestamptz,

  -- Who answered.
  responded_at         timestamptz,
  responded_via        moments.response_channel,
  responder_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responder_label      text,        -- email/phone captured from the token for anon responses
  responder_ip         inet,
  responder_user_agent text,
  decision_note        text,
  counter_amount_paisa bigint CHECK (counter_amount_paisa IS NULL OR counter_amount_paisa >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT approval_has_recipient CHECK (
    approver_user_id IS NOT NULL OR approver_email IS NOT NULL OR approver_phone IS NOT NULL),
  CONSTRAINT approval_decided_has_ts CHECK (
    status IN ('pending','cancelled') OR responded_at IS NOT NULL),
  CONSTRAINT approval_autoapprove_before_expiry CHECK (
    auto_approve_at IS NULL OR auto_approve_at <= expires_at)
);

CREATE UNIQUE INDEX approval_requests_event_open_uniq
  ON moments.approval_requests (moment_event_id) WHERE status = 'pending';
CREATE INDEX approval_requests_org_status_idx
  ON moments.approval_requests (org_id, status, expires_at);
-- The sweeper: which pending approvals have blown their deadline?
CREATE INDEX approval_requests_autoapprove_idx
  ON moments.approval_requests (auto_approve_at)
  WHERE status = 'pending' AND auto_approve_on_timeout;

COMMENT ON COLUMN moments.approval_requests.status IS
  'auto_approved is a DISTINCT status, never folded into approved. When a customer '
  'disputes a PKR 7,500 marriage gift you must be able to say "nobody clicked; your '
  'policy auto-approved after 24h" and prove it.';

COMMENT ON COLUMN moments.approval_requests.auto_approve_at IS
  'A real column, not computed: HR will ask for per-request extensions.';

CREATE TRIGGER trg_approval_requests_updated_at BEFORE UPDATE ON moments.approval_requests
  FOR EACH ROW EXECUTE FUNCTION moments.set_updated_at();

COMMIT;
