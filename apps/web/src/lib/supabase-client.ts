/**
 * Supabase Client Configuration (Client-Side Safe)
 *
 * This file contains ONLY the public Supabase client that can be safely
 * imported in client-side components. It uses the anon key which respects
 * Row Level Security (RLS) policies.
 *
 * IMPORTANT: Never import supabaseAdmin in client-side code!
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

/**
 * Public Supabase client for client-side operations
 * - Uses anon key (safe to expose)
 * - Respects Row Level Security (RLS) policies
 * - Can be used in React components
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
