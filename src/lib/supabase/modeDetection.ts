import { cookies } from 'next/headers';

export type SupabaseClientMode = 'ADMIN' | 'USER';

/**
 * Returns current Supabase mode ('USER' or 'ADMIN') based on available cookies.
 * No parameters needed — reads from cookie store.
 */
export function getSupabaseMode(): SupabaseClientMode {
  const cookieStore = cookies();
  const userUrl = cookieStore.get('user-supabase-url')?.value;
  const userKey = cookieStore.get('user-supabase-key')?.value;

  const isUserMode = Boolean(userUrl && userKey);
  return isUserMode ? 'USER' : 'ADMIN';
}
