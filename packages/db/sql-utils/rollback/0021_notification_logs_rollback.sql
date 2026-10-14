-- Rollback for 0021_notification_logs.sql
-- Apply this FIRST when rolling back (LIFO order). Drops the audit table.
-- After running, delete the corresponding entry from meta/_journal.json (idx: 21).

DROP INDEX IF EXISTS idx_notification_logs_sent_by;
DROP INDEX IF EXISTS idx_notification_logs_template_started;
DROP TABLE IF EXISTS notification_logs;
