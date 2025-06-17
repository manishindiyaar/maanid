import { getSupabaseClient } from '@/lib/supabase/getSupabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client from cookie store
 * This is a wrapper around getSupabaseClient to maintain compatibility
 * with the existing API routes that use the @/utils/supabase/server path
 */
export function createClient(cookieStore: ReturnType<typeof cookies>): SupabaseClient {
  // Create a proxy to lazily evaluate and convert the async getSupabaseClient
  // into the synchronous interface expected by the existing code
  const client = {
    auth: {
      getUser: async () => {
        // We're ignoring the cookieStore parameter since getSupabaseClient
        // already uses cookies() internally to access the same cookies
        const supabase = await getSupabaseClient({ forceAdmin: false });
        return supabase.auth.getUser();
      }
    },
    from: function(table: string) {
      return {
        select: function(columns: string) {
          return {
            eq: async function(column: string, value: any) {
              const supabase = await getSupabaseClient({ forceAdmin: false });
              return supabase.from(table).select(columns).eq(column, value);
            },
            single: async function() {
              const supabase = await getSupabaseClient({ forceAdmin: false });
              return supabase.from(table).select(columns).single();
            }
          };
        },
        upsert: async function(data: any) {
          const supabase = await getSupabaseClient({ forceAdmin: false });
          return supabase.from(table).upsert(data);
        }
      };
    }
  };
  
  return client as unknown as SupabaseClient;
} 