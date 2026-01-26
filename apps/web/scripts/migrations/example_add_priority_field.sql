-- ================================================================
-- EXAMPLE SAFE MIGRATION: Add Priority Field to Leads
-- ================================================================
-- Date: 2025-01-29
-- Purpose: Add priority tracking to help sales team prioritize leads
-- Safe: YES - Uses ALTER TABLE, preserves all existing data
-- ================================================================

-- ================================================================
-- STEP 1: Add Priority Column
-- ================================================================

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS priority TEXT
CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
DEFAULT 'medium';

-- ================================================================
-- STEP 2: Set Default Values for Existing Leads
-- ================================================================

-- All existing leads get 'medium' priority by default
-- New leads with status 'closed' or 'rejected' get 'low' priority
UPDATE leads
SET priority = 'low'
WHERE status IN ('closed', 'rejected')
AND priority = 'medium';

-- Leads that were recently contacted get 'high' priority
UPDATE leads
SET priority = 'high'
WHERE status = 'contacted'
AND updated_at > NOW() - INTERVAL '7 days'
AND priority = 'medium';

-- ================================================================
-- STEP 3: Add Index for Performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_leads_priority
ON leads(priority);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_leads_status_priority
ON leads(status, priority);

-- ================================================================
-- STEP 4: Verify Migration Success
-- ================================================================

-- Check that column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'priority'
  ) THEN
    RAISE EXCEPTION 'Migration failed: priority column not created';
  END IF;
END $$;

-- Check no NULL values (should all have defaults)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM leads WHERE priority IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % leads have NULL priority', null_count;
  END IF;
END $$;

-- Show distribution of priorities
SELECT
  priority,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM leads), 2) as percentage
FROM leads
GROUP BY priority
ORDER BY
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

-- ================================================================
-- ROLLBACK PROCEDURE (If Needed)
-- ================================================================

-- To undo this migration:
-- ALTER TABLE leads DROP COLUMN IF EXISTS priority;
-- DROP INDEX IF EXISTS idx_leads_priority;
-- DROP INDEX IF EXISTS idx_leads_status_priority;

-- ================================================================
-- NEXT STEPS FOR CODE UPDATES
-- ================================================================

-- 1. Update TypeScript Type (src/types/leads.ts):
--    export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
--    export interface Lead {
--      ...
--      priority: LeadPriority;
--      ...
--    }

-- 2. Update Lead Service (src/lib/leads.ts):
--    Add priority to createLead and updateLead methods

-- 3. Update API Route (src/app/api/leads/route.ts):
--    Include priority in validation and responses

-- 4. Update AddLeadModal (src/components/leads/AddLeadModal.tsx):
--    Add priority dropdown:
--    <select name="priority">
--      <option value="low">Low</option>
--      <option value="medium">Medium</option>
--      <option value="high">High</option>
--      <option value="urgent">Urgent</option>
--    </select>

-- 5. Update Leads Table Display (src/app/dashboard/leads/page.tsx):
--    Add priority column with color-coded badges

-- ================================================================
-- MIGRATION COMPLETE ✅
-- ================================================================
