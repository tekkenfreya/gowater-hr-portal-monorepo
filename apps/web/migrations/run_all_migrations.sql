-- ============================================================
-- GoWater — Complete Database Setup
-- Run this in the Supabase SQL Editor (fresh DB or existing).
-- All statements are idempotent: safe to run on any DB state.
-- ============================================================

-- ============================================================
-- BASE SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  employee_name TEXT,
  role          TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee', 'manager', 'intern')),
  department    TEXT,
  hire_date     DATE DEFAULT CURRENT_DATE,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  date               DATE NOT NULL,
  check_in_time      TIMESTAMPTZ,
  check_out_time     TIMESTAMPTZ,
  break_start_time   TIMESTAMPTZ,
  break_end_time     TIMESTAMPTZ,
  break_duration     INTEGER DEFAULT 0,
  total_hours        REAL DEFAULT 0,
  status             TEXT DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'on_duty')),
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  leave_type  TEXT NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'absent', 'offset')),
  reason      TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approver_id INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  assigned_by INTEGER REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancel', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  report_date        DATE NOT NULL,
  report_type        TEXT NOT NULL CHECK (report_type IN ('start', 'end_of_day')),
  content            TEXT NOT NULL,
  sent_to_whatsapp   BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_date, report_type)
);

CREATE TABLE IF NOT EXISTS files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  size          BIGINT NOT NULL,
  mime_type     TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('documents', 'images', 'videos', 'presentations', 'spreadsheets', 'archives')),
  uploaded_by   INTEGER NOT NULL REFERENCES users(id),
  public_url    TEXT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_log (
  id               SERIAL PRIMARY KEY,
  migration_name   TEXT NOT NULL UNIQUE,
  description      TEXT,
  affected_records INTEGER DEFAULT 0,
  applied_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Base indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_date  ON attendance (user_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user   ON leave_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user            ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_date     ON reports (user_id, report_date);
CREATE INDEX IF NOT EXISTS idx_files_user            ON files (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_category        ON files (category);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role            ON users (role);

-- Enable Row Level Security
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE files         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATIONS
-- ============================================================

-- 1. ADD_WEBHOOKS_AND_API_KEYS (2026-02-09)
CREATE TABLE IF NOT EXISTS api_keys (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  name         VARCHAR(255) NOT NULL,
  key_prefix   VARCHAR(8) NOT NULL,
  key_hash     TEXT NOT NULL,
  scopes       JSONB DEFAULT '["read"]',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at   TIMESTAMP WITH TIME ZONE,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_user   ON api_keys(user_id);

CREATE TABLE IF NOT EXISTS webhooks (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  name       VARCHAR(255) NOT NULL,
  url        TEXT NOT NULL,
  secret     TEXT,
  events     JSONB NOT NULL DEFAULT '[]',
  headers    JSONB DEFAULT '{}',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_user   ON webhooks(user_id);

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

-- 2. CREATE_ATTENDANCE_EDIT_REQUESTS (2026-01-14)
CREATE TABLE IF NOT EXISTS attendance_edit_requests (
  id                          SERIAL PRIMARY KEY,
  attendance_id               INTEGER NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  user_id                     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_check_in_time      TIMESTAMP WITH TIME ZONE,
  original_check_out_time     TIMESTAMP WITH TIME ZONE,
  original_break_start_time   TIMESTAMP WITH TIME ZONE,
  original_break_end_time     TIMESTAMP WITH TIME ZONE,
  requested_check_in_time     TIMESTAMP WITH TIME ZONE,
  requested_check_out_time    TIMESTAMP WITH TIME ZONE,
  requested_break_start_time  TIMESTAMP WITH TIME ZONE,
  requested_break_end_time    TIMESTAMP WITH TIME ZONE,
  reason                      TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approver_id                 INTEGER REFERENCES users(id),
  approved_at                 TIMESTAMP WITH TIME ZONE,
  comments                    TEXT,
  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_user_id       ON attendance_edit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_attendance_id ON attendance_edit_requests(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_status        ON attendance_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_created_at    ON attendance_edit_requests(created_at DESC);

-- 3. UPDATE_LEAVE_TYPES (2026-01-13) — no-op on fresh DB, migrates existing data
UPDATE leave_requests SET leave_type = 'vacation' WHERE leave_type = 'annual';
UPDATE leave_requests SET leave_type = 'absent'   WHERE leave_type = 'personal';
UPDATE leave_requests SET leave_type = 'offset'   WHERE leave_type = 'emergency';
UPDATE leave_requests SET leave_type = 'sick'     WHERE leave_type IN ('maternity', 'paternity');
UPDATE leave_requests SET leave_type = 'vacation' WHERE leave_type = 'unpaid';

-- 4. ADD_SLACK_THREAD_TS_TO_ATTENDANCE
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS slack_thread_ts TEXT DEFAULT NULL;

INSERT INTO migration_log (migration_name, description, affected_records)
VALUES ('ADD_SLACK_THREAD_TS_TO_ATTENDANCE', 'Add slack_thread_ts column to attendance for Slack threaded messages', 0)
ON CONFLICT (migration_name) DO NOTHING;

-- 5. ADD_PHOTO_URL_TO_ATTENDANCE (2026-01-28)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS photo_url        TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_attendance_photo_url         ON attendance (photo_url)         WHERE photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_checkout_photo_url ON attendance (checkout_photo_url) WHERE checkout_photo_url IS NOT NULL;

COMMENT ON COLUMN attendance.photo_url          IS 'URL of check-in photo stored in Cloudinary, includes watermark with location and timestamp';
COMMENT ON COLUMN attendance.checkout_photo_url IS 'URL of check-out photo stored in Cloudinary, includes watermark with location and timestamp';

-- 6. ADD_INTERN_ROLE (2026-01-20) — no-op on fresh DB (already included above)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'employee', 'manager', 'intern'));

-- ============================================================
-- Done. Verify applied migrations:
-- SELECT * FROM migration_log ORDER BY applied_at;
-- ============================================================
