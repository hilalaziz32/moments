import pino from "pino";

/**
 * PII redaction is not optional here.
 *
 * Railway logs are the least-protected surface we have, and this worker handles
 * home addresses, phone numbers and tokenised links. Anything that could
 * identify or impersonate an employee is redacted at the logger, not left to
 * each call site to remember.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "*.address", "*.address_snapshot", "*.line1", "*.line2", "*.landmark",
      "*.phone", "*.phone_e164", "*.whatsapp_e164", "*.recipient_phone",
      "*.email", "*.work_email", "*.personal_email", "*.issued_to_email",
      "*.token", "*.token_hash", "*.otp", "*.access_token", "*.refresh_token",
      "payload.recipientRef", "result.recipientRef",
      "req.headers.authorization", "req.headers['x-internal-api-key']",
    ],
    censor: "[redacted]",
  },
  base: { service: "moments-worker" },
});

export type Logger = typeof logger;
