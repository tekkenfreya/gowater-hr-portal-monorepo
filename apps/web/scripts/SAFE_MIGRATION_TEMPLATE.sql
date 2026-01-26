-- ================================================================
-- SAFE MIGRATION TEMPLATE - PRESERVES EXISTING DATA
-- ================================================================
-- Use this template for all future database changes
-- This approach uses ALTER TABLE instead of DROP/CREATE
-- ================================================================

-- ================================================================
-- STEP 1: ADD NEW COLUMNS (Safe - No Data Loss)
-- ================================================================

-- Example: Adding a new column to leads table
-- ALTER TABLE leads
-- ADD COLUMN IF NOT EXISTS new_column_name TEXT DEFAULT 'default_value';

-- Example: Adding a column with constraints
-- ALTER TABLE leads
-- ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';

-- Example: Adding a nullable column
-- ALTER TABLE leads
-- ADD COLUMN IF NOT EXISTS optional_field TEXT NULL;

-- ================================================================
-- STEP 2: MODIFY EXISTING COLUMNS (Careful - Test First!)
-- ================================================================

-- Example: Change column type (requires data conversion)
-- WARNING: Test this on a copy of your data first!
-- ALTER TABLE leads
-- ALTER COLUMN existing_column TYPE new_type USING existing_column::new_type;

-- Example: Add NOT NULL constraint (ensure no nulls exist first!)
-- UPDATE leads SET column_name = 'default' WHERE column_name IS NULL;
-- ALTER TABLE leads
-- ALTER COLUMN column_name SET NOT NULL;

-- Example: Remove NOT NULL constraint
-- ALTER TABLE leads
-- ALTER COLUMN column_name DROP NOT NULL;

-- ================================================================
-- STEP 3: UPDATE EXISTING DATA (Optional)
-- ================================================================

-- Example: Set default values for existing rows
-- UPDATE leads
-- SET new_column_name = 'value'
-- WHERE new_column_name IS NULL;

-- Example: Migrate data from old column to new column
-- UPDATE leads
-- SET new_column = old_column
-- WHERE new_column IS NULL;

-- ================================================================
-- STEP 4: ADD NEW INDEXES (Performance)
-- ================================================================

-- Example: Add index for new column
-- CREATE INDEX IF NOT EXISTS idx_leads_new_column
-- ON leads(new_column_name);

-- Example: Add composite index
-- CREATE INDEX IF NOT EXISTS idx_leads_multi
-- ON leads(column1, column2);

-- ================================================================
-- STEP 5: ADD NEW CONSTRAINTS (Optional)
-- ================================================================

-- Example: Add check constraint
-- ALTER TABLE leads
-- ADD CONSTRAINT check_column_value
-- CHECK (column_name IN ('value1', 'value2'));

-- Example: Add unique constraint
-- ALTER TABLE leads
-- ADD CONSTRAINT unique_column_name
-- UNIQUE (column_name);

-- ================================================================
-- STEP 6: UPDATE ROW LEVEL SECURITY (If Needed)
-- ================================================================

-- Example: Add policy for new feature
-- CREATE POLICY "Policy name"
--   ON leads
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check if column was added successfully
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'leads' AND column_name = 'new_column_name';

-- Count rows to ensure no data loss
-- SELECT COUNT(*) FROM leads;

-- Check for null values in new column
-- SELECT COUNT(*) FROM leads WHERE new_column_name IS NULL;

-- ================================================================
-- ROLLBACK PROCEDURE (In Case of Problems)
-- ================================================================

-- To remove a column (use with caution):
-- ALTER TABLE leads DROP COLUMN IF EXISTS new_column_name;

-- To remove an index:
-- DROP INDEX IF EXISTS idx_leads_new_column;

-- To remove a constraint:
-- ALTER TABLE leads DROP CONSTRAINT IF EXISTS constraint_name;

-- ================================================================
-- MIGRATION CHECKLIST
-- ================================================================
-- Before running this migration:
-- [ ] Test on a copy of production data first
-- [ ] Back up your database
-- [ ] Review all ALTER statements
-- [ ] Check for any data dependencies
-- [ ] Verify no DROP statements are included
-- [ ] Update TypeScript types to match new schema
-- [ ] Update service layer to handle new fields
-- [ ] Test API endpoints with new fields
-- [ ] Verify frontend forms include new fields
-- [ ] Document changes in CHANGELOG or migration notes
-- ================================================================
