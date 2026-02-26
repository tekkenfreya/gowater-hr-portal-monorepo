-- ============================================================
-- GoWater — Full Migration Script
-- Run this in the Supabase SQL Editor to apply all migrations.
-- All statements are idempotent: safe to run on any DB state.
-- ============================================================

-- ============================================================
-- PREREQUISITE: migration_log table
-- Required by ADD_WEBHOOKS_AND_API_KEYS and ADD_SLACK_THREAD_TS
-- ============================================================
CREATE TABLE IF NOT EXISTS migration_log (
  id              SERIAL PRIMARY KEY,
  migration_name  TEXT NOT NULL UNIQUE,
  description     TEXT,
  affected_records INTEGER DEFAULT 0,
  applied_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 1. ADD_WEBHOOKS_AND_API_KEYS (2026-02-09)
-- Creates api_keys, webhooks, webhook_logs tables
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  key_prefix      VARCHAR(8) NOT NULL,
  key_hash        TEXT NOT NULL,
  scopes          JSONB DEFAULT '["read"]',
  last_used_at    TIMESTAMP WITH TIME ZONE,
  expires_at      TIMESTAMP WITH TIME ZONE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

CREATE TABLE IF NOT EXISTS webhooks (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  url             TEXT NOT NULL,
  secret          TEXT,
  events          JSONB NOT NULL DEFAULT '[]',
  headers         JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id              SERIAL PRIMARY KEY,
  webhook_id      INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event           VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  response_status INTEGER,
  response_body   TEXT,
  success         BOOLEAN DEFAULT FALSE,
  error_message   TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

INSERT INTO migration_log (migration_name, description, affected_records)
VALUES ('add_webhooks_and_api_keys', 'Added api_keys, webhooks, and webhook_logs tables', 0)
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================
-- 2. CREATE_ATTENDANCE_EDIT_REQUESTS (2026-01-14)
-- Creates attendance_edit_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_edit_requests (
  id SERIAL PRIMARY KEY,
  attendance_id INTEGER NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_check_in_time TIMESTAMP WITH TIME ZONE,
  original_check_out_time TIMESTAMP WITH TIME ZONE,
  original_break_start_time TIMESTAMP WITH TIME ZONE,
  original_break_end_time TIMESTAMP WITH TIME ZONE,
  requested_check_in_time TIMESTAMP WITH TIME ZONE,
  requested_check_out_time TIMESTAMP WITH TIME ZONE,
  requested_break_start_time TIMESTAMP WITH TIME ZONE,
  requested_break_end_time TIMESTAMP WITH TIME ZONE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approver_id INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_user_id ON attendance_edit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_attendance_id ON attendance_edit_requests(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_status ON attendance_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_created_at ON attendance_edit_requests(created_at DESC);

-- ============================================================
-- 3. UPDATE_LEAVE_TYPES (2026-01-13)
-- Migrates leave types to match UI categories
-- ============================================================
UPDATE leave_requests SET leave_type = 'vacation' WHERE leave_type = 'annual';
UPDATE leave_requests SET leave_type = 'absent'   WHERE leave_type = 'personal';
UPDATE leave_requests SET leave_type = 'offset'   WHERE leave_type = 'emergency';
UPDATE leave_requests SET leave_type = 'sick'     WHERE leave_type IN ('maternity', 'paternity');
UPDATE leave_requests SET leave_type = 'vacation' WHERE leave_type = 'unpaid';

ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN ('vacation', 'sick', 'absent', 'offset'));

-- ============================================================
-- 4. ADD_SLACK_THREAD_TS_TO_ATTENDANCE
-- Adds slack_thread_ts column for Slack message threading
-- ============================================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS slack_thread_ts TEXT DEFAULT NULL;

INSERT INTO migration_log (migration_name, description, affected_records)
VALUES ('ADD_SLACK_THREAD_TS_TO_ATTENDANCE', 'Add slack_thread_ts column to attendance for Slack threaded messages', 0)
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================
-- 5. ADD_PHOTO_URL_TO_ATTENDANCE (2026-01-28)
-- Adds photo URL columns for Cloudinary check-in/out photos
-- ============================================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_attendance_photo_url ON attendance (photo_url) WHERE photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_checkout_photo_url ON attendance (checkout_photo_url) WHERE checkout_photo_url IS NOT NULL;

COMMENT ON COLUMN attendance.photo_url IS 'URL of check-in photo stored in Cloudinary, includes watermark with location and timestamp';
COMMENT ON COLUMN attendance.checkout_photo_url IS 'URL of check-out photo stored in Cloudinary, includes watermark with location and timestamp';

-- ============================================================
-- 6. ADD_INTERN_ROLE (2026-01-20)
-- Adds intern to users role constraint
-- ============================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'employee', 'manager', 'intern'));

-- ============================================================
-- Done. Verify applied migrations:
-- SELECT * FROM migration_log ORDER BY applied_at;
-- ============================================================
