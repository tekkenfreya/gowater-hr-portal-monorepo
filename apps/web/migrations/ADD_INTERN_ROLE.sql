-- Add intern role to users table
-- Date: 2026-01-20
-- Purpose: Add OJT/Intern role with same privileges as employee

-- Step 1: Drop the old constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new constraint with intern role
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'employee', 'manager', 'intern'));
