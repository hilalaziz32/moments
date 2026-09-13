-- 00030_sms_via_twilio.sql
--
-- SMS as a first-class channel, delivered through Twilio.
--
-- Email is on hold until there are paying customers, so SMS carries the
-- messages that have to reach a person: the address-confirmation link, its
-- reminder, the manager's note and approval requests. Company-wide
-- announcements stay off SMS -- a text to 300 phones is spam, not a celebration.
--
-- No BEGIN/COMMIT: a value added by ALTER TYPE ... ADD VALUE cannot be used in
-- the transaction that adds it, and nothing below uses it.

ALTER TYPE moments.channel              ADD VALUE IF NOT EXISTS 'sms';
ALTER TYPE moments.integration_provider ADD VALUE IF NOT EXISTS 'twilio';

-- Twilio's status callback names the message by its SID. Without this index
-- every delivery receipt is a scan of the whole outbox.
CREATE INDEX IF NOT EXISTS outbound_messages_provider_msg_idx
  ON moments.outbound_messages (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
