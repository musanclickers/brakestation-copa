-- 0021_notification_logs.sql
-- Audit trail for admin mass notifications.

CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID NOT NULL REFERENCES users(id),
  template_key TEXT NOT NULL,
  audience_spec JSONB NOT NULL,
  recipient_count INTEGER NOT NULL,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  is_test BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_logs_template_started
  ON notification_logs(template_key, started_at DESC)
  WHERE is_test = FALSE;

CREATE INDEX idx_notification_logs_sent_by
  ON notification_logs(sent_by, started_at DESC);
