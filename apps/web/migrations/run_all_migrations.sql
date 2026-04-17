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

CREATE TABLE IF NOT EXISTS permissions (
  id              SERIAL PRIMARY KEY,
  permission_key  VARCHAR(100) UNIQUE NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(50),
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  granted_at    TIMESTAMPTZ DEFAULT NOW(),
  granted_by    INTEGER REFERENCES users(id),
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_key       ON permissions(permission_key);

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'add_webhooks_and_api_keys') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('add_webhooks_and_api_keys', 'Added api_keys, webhooks, and webhook_logs tables', 0);
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'ADD_SLACK_THREAD_TS_TO_ATTENDANCE') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('ADD_SLACK_THREAD_TS_TO_ATTENDANCE', 'Add slack_thread_ts column to attendance for Slack threaded messages', 0);
  END IF;
END $$;

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

-- 7. ADD_DISPATCHED_UNITS (2026-03-06)
CREATE TABLE IF NOT EXISTS dispatched_units (
  id                SERIAL PRIMARY KEY,
  serial_number     VARCHAR(100) NOT NULL UNIQUE,
  unit_type         TEXT NOT NULL CHECK (unit_type IN ('vending_machine', 'dispenser')),
  model_name        TEXT NOT NULL,
  destination       TEXT,
  status            TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'dispatched', 'verified', 'decommissioned')),
  dispatched_at     TIMESTAMPTZ,
  verified_at       TIMESTAMPTZ,
  verified_by_name  TEXT,
  notes             TEXT,
  created_by        INTEGER NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatched_units_serial ON dispatched_units(serial_number);
CREATE INDEX IF NOT EXISTS idx_dispatched_units_status ON dispatched_units(status);

CREATE TABLE IF NOT EXISTS service_requests (
  id                SERIAL PRIMARY KEY,
  unit_id           INTEGER NOT NULL REFERENCES dispatched_units(id),
  customer_name     TEXT NOT NULL,
  contact_number    TEXT NOT NULL,
  email             TEXT,
  issue_description TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  resolved_at       TIMESTAMPTZ,
  resolved_by       INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_unit   ON service_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

ALTER TABLE dispatched_units  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests  ENABLE ROW LEVEL SECURITY;

-- Unit management permissions (use upsert-safe approach without ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'can_manage_units') THEN
    INSERT INTO permissions (permission_key, display_name, description, category)
    VALUES ('can_manage_units', 'Manage Dispatched Units', 'Create, edit, dispatch, import, and print unit labels', 'units');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'can_view_service_requests') THEN
    INSERT INTO permissions (permission_key, display_name, description, category)
    VALUES ('can_view_service_requests', 'View Service Requests', 'View and manage customer service requests', 'units');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'add_dispatched_units') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('add_dispatched_units', 'Added dispatched_units, service_requests tables and unit permissions', 0);
  END IF;
END $$;

-- ============================================================
-- LEADS & LEAD ACTIVITIES (unified, 2026-04-15)
-- One table covers warm/cold/hot pipelines for lead/event/supplier types.
-- Industry is set only for cold leads (restaurants, lgu, hotel, microfinance, foundation).
-- The old cold_leads and hot_leads tables were consolidated into this one on 2026-04-15.
-- Backups renamed to leads_backup_{warm|cold|hot}_2026_04_15 in the same migration.
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id                    TEXT PRIMARY KEY,
  type                  TEXT NOT NULL CHECK (type IN ('lead', 'event', 'supplier')),
  pipeline              TEXT NOT NULL CHECK (pipeline IN ('warm', 'cold', 'hot')),
  industry              TEXT CHECK (industry IN ('restaurants', 'lgu', 'hotel', 'microfinance', 'foundation')),
  lead_type             TEXT,
  company_name          TEXT,
  number_of_beneficiary TEXT,
  location              TEXT,
  lead_source           TEXT,
  event_name            TEXT,
  event_type            TEXT,
  venue                 TEXT,
  event_start_date      DATE,
  event_end_date        DATE,
  event_time            TEXT,
  event_lead            TEXT,
  number_of_attendees   TEXT,
  event_report          TEXT,
  supplier_name         TEXT,
  supplier_location     TEXT,
  supplier_product      TEXT,
  price                 TEXT,
  unit_type             TEXT,
  contact_person        TEXT,
  mobile_number         TEXT,
  email_address         TEXT,
  product               TEXT,
  status                TEXT NOT NULL DEFAULT 'not-started',
  remarks               TEXT,
  disposition           TEXT,
  assigned_to           TEXT,
  created_by            TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id                    TEXT PRIMARY KEY,
  lead_id               TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  employee_name         TEXT NOT NULL,
  activity_type         TEXT NOT NULL,
  activity_description  TEXT NOT NULL,
  start_date            DATE,
  end_date              DATE,
  status_update         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_type              ON leads(type);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline          ON leads(pipeline);
CREATE INDEX IF NOT EXISTS idx_leads_industry          ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_type_pipeline     ON leads(type, pipeline);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead    ON lead_activities(lead_id);

ALTER TABLE leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'unify_leads_2026_04_15') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('unify_leads_2026_04_15', 'Unified leads/cold_leads/hot_leads into one leads table with pipeline+industry', 0);
  END IF;
END $$;

-- ============================================================
-- 9. HOT LEADS & HOT LEAD ACTIVITIES (2026-03-30)
-- Same schema as cold_leads/cold_lead_activities but for hot leads
-- ============================================================

CREATE TABLE IF NOT EXISTS hot_leads (
  id                    TEXT PRIMARY KEY,
  category              TEXT NOT NULL CHECK (category IN ('lead', 'event', 'supplier')),
  date_of_interaction   DATE,
  lead_type             TEXT,
  company_name          TEXT,
  number_of_beneficiary TEXT,
  location              TEXT,
  lead_source           TEXT,
  event_name            TEXT,
  event_type            TEXT,
  venue                 TEXT,
  event_date            DATE,
  event_start_date      DATE,
  event_end_date        DATE,
  event_time            TEXT,
  event_lead            TEXT,
  number_of_attendees   TEXT,
  event_report          TEXT,
  supplier_name         TEXT,
  supplier_location     TEXT,
  supplier_product      TEXT,
  price                 TEXT,
  unit_type             TEXT,
  contact_person        TEXT,
  mobile_number         TEXT,
  email_address         TEXT,
  product               TEXT,
  status                TEXT NOT NULL DEFAULT 'not-started',
  remarks               TEXT,
  disposition           TEXT,
  assigned_to           TEXT,
  hot_category          TEXT DEFAULT NULL,
  created_by            TEXT NOT NULL,
  created_at            TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_lead_activities (
  id                    TEXT PRIMARY KEY,
  lead_id               TEXT NOT NULL REFERENCES hot_leads(id) ON DELETE CASCADE,
  employee_name         TEXT NOT NULL,
  activity_type         TEXT NOT NULL,
  activity_description  TEXT NOT NULL,
  start_date            DATE,
  end_date              DATE,
  status_update         TEXT,
  created_at            TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE hot_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hot_leads_category ON hot_leads(category);
CREATE INDEX IF NOT EXISTS idx_hot_leads_hot_category ON hot_leads(hot_category);
CREATE INDEX IF NOT EXISTS idx_hot_lead_activities_lead_id ON hot_lead_activities(lead_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'add_hot_leads') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('add_hot_leads', 'Added hot_leads and hot_lead_activities tables for hot lead tracking', 0);
  END IF;
END $$;

-- ============================================================
-- Add participation column for event participation tracking
-- (Exhibitor / Visitor / None — event-only, nullable)
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS participation TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'add_participation_to_leads') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('add_participation_to_leads', 'Added participation column for event Exhibitor/Visitor/None tracking', 0);
  END IF;
END $$;

-- ============================================================
-- Add supplier_category column for supplier sub-categorization
-- (Water Testing / Printing Service / Logistics / Filters — supplier-only, nullable)
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS supplier_category TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'add_supplier_category_to_leads') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('add_supplier_category_to_leads', 'Added supplier_category column for Water Testing / Printing / Logistics / Filters', 0);
  END IF;
END $$;

-- ============================================================
-- Add not_interested flag for archive/trash functionality
-- Rows with not_interested=true appear only in the Not Interested view;
-- all other views filter them out.
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS not_interested BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_leads_not_interested ON leads(not_interested);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'add_not_interested_flag') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('add_not_interested_flag', 'Added not_interested boolean flag for archive/trash functionality', 0);
  END IF;
END $$;

-- ============================================================
-- Expand industry enum with 5 new values:
-- property-development, hospital, schools, offices, sme
-- (Drops any existing industry CHECK constraint and re-adds with the
--  expanded set. Idempotent — re-running is safe.)
-- ============================================================

DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'leads'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ~ 'industry.*(IN|ANY)'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE leads DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE leads ADD CONSTRAINT leads_industry_check
    CHECK (industry IS NULL OR industry IN (
      'restaurants', 'lgu', 'hotel', 'microfinance', 'foundation',
      'property-development', 'hospital', 'schools', 'offices', 'sme'
    ));
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'expand_industry_enum_2026_04_17') THEN
    INSERT INTO migration_log (migration_name, description, affected_records)
    VALUES ('expand_industry_enum_2026_04_17', 'Added 5 industry values: property-development, hospital, schools, offices, sme', 0);
  END IF;
END $$;

-- ============================================================
-- Done. Verify applied migrations:
-- SELECT * FROM migration_log ORDER BY applied_at;
-- ============================================================
