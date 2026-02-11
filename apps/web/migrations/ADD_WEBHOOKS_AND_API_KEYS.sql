-- ============================================================
-- Migration: Add Webhooks & API Keys for Integration Support
-- Version: 5.4
-- Date: 2026-02-09
-- Purpose: Enable n8n, Zapier, GHL integration via webhooks
--          and long-lived API key authentication
-- ============================================================

-- ============================================================
-- TABLE 1: api_keys
-- ============================================================
-- Stores hashed API keys that workflow tools (n8n, Zapier, GHL)
-- use to authenticate instead of short-lived JWT tokens.
-- The plaintext key is shown ONCE at creation, then only the
-- hash is stored. Think of it like a GitHub personal access token.
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,          -- Human label, e.g. "n8n Production"
  key_prefix      VARCHAR(8) NOT NULL,            -- First 8 chars of key for identification (e.g. "gw_a1b2c")
  key_hash        TEXT NOT NULL,                   -- SHA-256 hash of the full key
  scopes          JSONB DEFAULT '["read"]',        -- Allowed actions: read, write, admin
  last_used_at    TIMESTAMP WITH TIME ZONE,        -- Tracks when key was last used
  expires_at      TIMESTAMP WITH TIME ZONE,        -- Optional expiration (null = never)
  is_active       BOOLEAN DEFAULT TRUE,            -- Soft-disable without deleting
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast key lookup during authentication
-- Every API request with an API key will query by key_prefix first,
-- then verify the full hash. This avoids scanning every row.
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- ============================================================
-- TABLE 2: webhooks
-- ============================================================
-- Stores webhook subscriptions. When an event happens in GoWater
-- (e.g. employee checks in), the system looks up all active
-- webhooks subscribed to that event and sends an HTTP POST
-- to each registered URL with the event payload.
-- ============================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),  -- Admin who created it
  name            VARCHAR(255) NOT NULL,                    -- Label, e.g. "n8n Attendance Alerts"
  url             TEXT NOT NULL,                             -- The endpoint to POST to
  secret          TEXT,                                      -- Shared secret for HMAC signature verification
  events          JSONB NOT NULL DEFAULT '[]',               -- Array of event names to subscribe to
  headers         JSONB DEFAULT '{}',                        -- Custom headers to include in POST requests
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

-- ============================================================
-- TABLE 3: webhook_logs
-- ============================================================
-- Every time the system fires a webhook, the delivery attempt
-- is logged here. This lets admins debug failed deliveries
-- and see a history of what was sent.
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id              SERIAL PRIMARY KEY,
  webhook_id      INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event           VARCHAR(100) NOT NULL,           -- e.g. "attendance.checked_in"
  payload         JSONB NOT NULL,                   -- The data that was sent
  response_status INTEGER,                          -- HTTP status code (200, 404, 500, etc.)
  response_body   TEXT,                             -- First 1000 chars of response
  success         BOOLEAN DEFAULT FALSE,
  error_message   TEXT,                             -- Error if delivery failed
  duration_ms     INTEGER,                          -- How long the request took
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for viewing logs by webhook or by date range
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- ============================================================
-- Record this migration
-- ============================================================
INSERT INTO migration_log (migration_name, description, affected_records)
VALUES (
  'add_webhooks_and_api_keys',
  'Added api_keys, webhooks, and webhook_logs tables for n8n/Zapier/GHL integration support',
  0
);
