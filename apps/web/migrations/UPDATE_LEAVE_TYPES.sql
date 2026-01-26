-- Update leave types to match UI categories
-- Date: 2026-01-13
-- Purpose: Clean up leave types to only the 4 categories used in the application

-- Step 1: Migrate existing data to new types
UPDATE leave_requests SET leave_type = 'vacation' WHERE leave_type = 'annual';
UPDATE leave_requests SET leave_type = 'absent' WHERE leave_type = 'personal';
UPDATE leave_requests SET leave_type = 'offset' WHERE leave_type = 'emergency';
UPDATE leave_requests SET leave_type = 'sick' WHERE leave_type = 'maternity' OR leave_type = 'paternity';
UPDATE leave_requests SET leave_type = 'vacation' WHERE leave_type = 'unpaid';

-- Step 2: Drop the old constraint
ALTER TABLE leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

-- Step 3: Add new constraint with ONLY the 4 types used in UI
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_leave_type_check
CHECK (leave_type IN ('vacation', 'sick', 'absent', 'offset'));
