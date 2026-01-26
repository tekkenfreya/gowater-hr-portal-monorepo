# RLS Policies Migration Guide

## Overview
This migration implements comprehensive Row Level Security (RLS) policies for all database tables to ensure users can only access data according to their role.

## Security Model

### Roles
- **Employee**: Can only view/modify their own data
- **Manager**: Can view all data, manage team members' data
- **Admin**: Full access to all data and operations
- **Boss**: Same as admin (full visibility for tracking)

### Policy Summary

| Table | Employee | Manager | Admin/Boss |
|-------|----------|---------|------------|
| **users** | View own profile | View all | Full CRUD |
| **attendance** | Own records only | View all, edit all | Full CRUD |
| **leave_requests** | Own requests only | View all, approve | Full CRUD |
| **tasks** | Assigned tasks | Create, view all | Full CRUD |
| **reports** | Own reports only | View all | Full CRUD |
| **files** | View all, edit own | View all, edit own | Full CRUD |
| **leads** | View all, edit own/assigned | Full CRUD | Full CRUD |
| **lead_activities** | View all, edit own | Full CRUD | Full CRUD |

## How to Apply

### Step 1: Backup Database
```bash
# Create backup before applying
# In Supabase dashboard: Database > Backups > Create Backup
```

### Step 2: Apply Migration
1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open `migrations/COMPREHENSIVE_RLS_POLICIES.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click **Run**

### Step 3: Verify Policies
Run this verification query in SQL Editor:
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

Expected: 8 tables with 4 policies each (32 total)

### Step 4: Test Access Control

Test with different user roles:

1. **Test as Employee** (login as employee account):
   - ✅ Should see own attendance
   - ❌ Should NOT see other employees' attendance

2. **Test as Manager** (login as manager account):
   - ✅ Should see all attendance records
   - ✅ Should be able to approve leave requests

3. **Test as Admin** (login as admin account):
   - ✅ Should have full access to everything

## Rollback

If you encounter issues, rollback instructions are at the bottom of the migration file.

## Important Notes

⚠️ **Authentication Requirement**: These policies rely on Supabase auth. Ensure:
- JWT authentication is working
- `auth.uid()` returns the user's ID
- Users table has correct role assignments

⚠️ **Existing Data**: Policies don't affect existing data, only future access control.

## Next Steps

After applying RLS policies:
1. Update application code if needed (should work transparently)
2. Test all user flows (login, attendance, leads, etc.)
3. Document any access issues
4. Update REUSABLE_REFERENCE.md with security notes
