import { createClient } from '@supabase/supabase-js';
import { Database } from './types';
import { dynamicSupabase } from './dynamicClient';

// ⚠️ DEPRECATED ⚠️ 
// This file is kept for backward compatibility.
// For new code, please use dynamicSupabase from './dynamicClient' 
// or useSupabase() hook from './useSupabase'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a single supabase client for interacting with your database
// This uses admin credentials by default
export const supabase = dynamicSupabase;

// Create a server-side client with service role for admin operations
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for server operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};