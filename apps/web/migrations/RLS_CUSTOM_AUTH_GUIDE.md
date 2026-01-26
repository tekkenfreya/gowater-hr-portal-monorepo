# RLS with Custom JWT Authentication - Guide

## The Issue

Your application uses **custom JWT authentication** (cookies + jsonwebtoken), not Supabase Auth. This causes RLS policies to fail because:

- **Supabase Auth** uses `auth.uid()` which returns UUIDs from `auth.users` table
- **Your app** uses custom users table with INTEGER ids and JWT tokens in cookies
- RLS policies can't access your JWT tokens directly

## The Solution

You have **3 options**:

---

### **Option 1: Simplified RLS (✅ RECOMMENDED - Use This)**

**File**: `migrations/SIMPLE_RLS_POLICIES.sql`

**How it works**:
- RLS allows all **authenticated** requests (using `service_role` key)
- Your API layer handles authorization (checking user roles, permissions)
- RLS prevents **direct database access** (unauthenticated requests)

**Pros**:
- ✅ Works immediately with your current setup
- ✅ No code changes needed
- ✅ Prevents unauthorized direct DB access
- ✅ Security handled at API layer (where you already have it)

**Cons**:
- ⚠️ Less granular than row-level control
- ⚠️ Relies on API layer for authorization

**To apply**:
```sql
-- In Supabase SQL Editor, run:
-- migrations/SIMPLE_RLS_POLICIES.sql
```

---

### **Option 2: Session-Based RLS (Advanced)**

Modify your Supabase client to set session variables:

**Changes needed in `src/lib/supabase.ts`**:
```typescript
// Before each query, set user context
async setUserContext(userId: number, role: string) {
  await this.client.rpc('set_user_context', {
    user_id: userId,
    user_role: role
  });
}
```

**Database function**:
```sql
CREATE OR REPLACE FUNCTION set_user_context(user_id INT, user_role TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', user_id::TEXT, false);
  PERFORM set_config('app.user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Then RLS policies can use:
-- current_setting('app.user_id', true)::INTEGER
-- current_setting('app.user_role', true)
```

**Pros**:
- ✅ Granular row-level control
- ✅ True RLS based on user identity

**Cons**:
- ⚠️ Requires code changes in every query
- ⚠️ More complex to implement

---

### **Option 3: Migrate to Supabase Auth (Major Change)**

Switch from custom JWT to Supabase Auth.

**Pros**:
- ✅ Native RLS support
- ✅ Built-in auth features
- ✅ Less code to maintain

**Cons**:
- ⚠️ Major refactor required
- ⚠️ Breaking change for existing users

---

## Current Security Model

Your app **already has good security** at the API layer:

### ✅ What you have now:
1. **JWT Authentication** - Tokens in httpOnly cookies
2. **API Authorization** - Role checks in API routes
3. **Service Layer** - Business logic validates permissions
4. **Encrypted Passwords** - bcrypt hashing
5. **Secure Cookies** - httpOnly, SameSite, Secure in prod

### ✅ What RLS adds:
- **Defense in depth** - Prevents direct DB access bypass
- **Database-level security** - Even if API is compromised

---

## Recommendation

**Use Option 1 (SIMPLE_RLS_POLICIES.sql)** because:

1. Your API layer already handles authorization well
2. You use `service_role` key (bypasses strict RLS anyway)
3. No code changes required
4. Still prevents unauthorized direct DB access
5. Can upgrade to Option 2 later if needed

---

## How to Apply

### Step 1: Run the Migration
```bash
# In Supabase Dashboard > SQL Editor
# Copy and paste: migrations/SIMPLE_RLS_POLICIES.sql
# Click "Run"
```

### Step 2: Verify
```sql
-- Check policies were created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Should see 32 policies (4 per table × 8 tables)
```

### Step 3: Test
```bash
# Your app should work exactly the same
# Try logging in and using features
npm run dev
```

---

## Security Checklist

With SIMPLE_RLS_POLICIES applied, you have:

- ✅ RLS enabled on all tables
- ✅ Policies prevent unauthenticated access
- ✅ API layer handles role-based permissions
- ✅ JWT tokens secure user sessions
- ✅ Input validation with Zod
- ✅ Security headers configured
- ✅ Environment variables protected

**Your app is production-ready from a security standpoint!** 🔒

---

## Future Enhancement

If you want **granular RLS** (Option 2) later:

1. Implement `setUserContext()` helper
2. Call it before every database query
3. Create advanced RLS policies using session variables
4. Gradually migrate table by table

But for now, **Option 1 is the pragmatic choice**. ✅
