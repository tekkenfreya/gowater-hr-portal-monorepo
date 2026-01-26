/**
 * Supabase Server Configuration (Server-Side Only)
 *
 * This file contains the Supabase admin client with service role key.
 * This client BYPASSES Row Level Security (RLS) and should ONLY be used
 * in server-side code (API routes, server components, server actions).
 *
 * ⚠️  SECURITY WARNING ⚠️
 * NEVER import this file in client-side components!
 * The service role key has unrestricted database access.
 *
 * Safe to use in:
 * - API routes (src/app/api/**)
 * - Server Components (with 'use server' or default server components)
 * - Server Actions
 * - Middleware
 *
 * DO NOT use in:
 * - Client Components (with 'use client')
 * - Browser-executed code
 * - Any code that could be bundled for the client
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Strict validation - fail fast if not configured
if (!supabaseUrl) {
  throw new Error(
    'CRITICAL: NEXT_PUBLIC_SUPABASE_URL environment variable is required for server operations'
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'CRITICAL: SUPABASE_SERVICE_ROLE_KEY environment variable is required for server operations. ' +
    'This is a server-only secret and should never be exposed to clients.'
  );
}

// Validate that service role key is not accidentally using anon key
if (supabaseServiceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    'CRITICAL: SUPABASE_SERVICE_ROLE_KEY is set to the anon key. ' +
    'This is a security misconfiguration. Use the service_role key from Supabase settings.'
  );
}

/**
 * Admin Supabase client for server-side operations
 * - Uses service role key (MUST be kept secret)
 * - Bypasses Row Level Security (RLS) policies
 * - ONLY use in server-side code
 * - DO NOT import in client components
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabaseAdmin;
