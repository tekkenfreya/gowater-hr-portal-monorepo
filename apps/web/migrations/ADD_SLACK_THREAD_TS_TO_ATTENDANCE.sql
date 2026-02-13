-- ============================================================
-- Migration: Add slack_thread_ts to attendance table
-- Purpose: Store Slack message timestamp for threading replies
--          under the check-in message in #attendance channel
-- ============================================================

ALTER TABLE attendance ADD COLUMN slack_thread_ts TEXT DEFAULT NULL;

-- Log the migration
INSERT INTO migration_log (migration_name, description, affected_records)
VALUES (
  'ADD_SLACK_THREAD_TS_TO_ATTENDANCE',
  'Add slack_thread_ts column to attendance for Slack threaded messages',
  0
);
