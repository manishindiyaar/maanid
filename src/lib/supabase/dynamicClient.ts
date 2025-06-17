import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// Cache for clients to avoid recreating them
let userClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client using admin credentials from environment variables
 */
export const createAdminSupabaseClient = (): SupabaseClient<Database> => {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!url || !key) {
    throw new Error('Missing admin Supabase credentials in environment variables');
  }

  adminClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });

  return adminClient;
};

/**
 * Creates a Supabase client using user credentials from localStorage
 */
export const createUserSupabaseClient = (): SupabaseClient<Database> => {
  // If we're on the server, we can't access localStorage
  if (typeof window === 'undefined') {
    throw new Error('Cannot create user Supabase client on the server');
  }

  // If client already exists, return it
  if (userClient) return userClient;

  // Get credentials from localStorage
  let url = localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || localStorage.getItem('supabase_url');
  let key = localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key');

  // If not found in localStorage, use environment variables
  if (!url || !key) {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    key = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
    
    console.log('🔄 Using environment Supabase credentials');
    
    // Store these in localStorage for future use
    if (url && key) {
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('NEXT_PUBLIC_SUPABASE_URL', url);
      localStorage.setItem('supabase_anon_key', key);
      localStorage.setItem('NEXT_PUBLIC_SUPABASE_ANON_KEY', key);
    }
  }

  if (!url || !key) {
    throw new Error('Missing user Supabase credentials in localStorage and environment');
  }

  userClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });

  return userClient;
};

/**
 * Determines if the current context is admin mode based on multiple factors
 */
const isAdminMode = (): boolean => {
  // If we're on the server, we can't check localStorage or cookies directly
  if (typeof window === 'undefined') {
    return false; // Will use admin client for server components
  }

  // Check for admin mode indicators in this specific order of precedence
  
  // 1. URL path check - most explicit indication of admin context
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  
  // 2. Admin token in localStorage - persists across sessions
  const hasAdminToken = localStorage.getItem('admin_token') !== null;
  
  // 3. Admin cookies - set by the server during authentication
  const hasAdminCookie = document.cookie.includes('admin_mode=true');
  const hasAdminSession = document.cookie.includes('admin_session=true');
  
  // Log the admin mode detection factors
  if (isAdminRoute || hasAdminToken || hasAdminCookie || hasAdminSession) {
    console.log('🔐 Admin mode detected:', { 
      isAdminRoute, 
      hasAdminToken, 
      hasAdminCookie, 
      hasAdminSession 
    });
  }

  return isAdminRoute || hasAdminToken || hasAdminCookie || hasAdminSession;
};

/**
 * Checks if user has valid Supabase credentials in localStorage
 */
const hasValidUserCredentials = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // First check: explicit has_supabase_credentials flag
  if (localStorage.getItem('has_supabase_credentials') === 'true') {
    console.log('🔑 Found has_supabase_credentials flag, using it');
    return true;
  }
  
  // Second check: Check for Supabase auth token
  const hasAuthToken = document.cookie.includes('supabase-auth-token') || 
                      document.cookie.includes('sb-access-token');
                      
  if (hasAuthToken) {
    console.log('🔑 Found Supabase auth token in cookies, setting has_supabase_credentials flag');
    localStorage.setItem('has_supabase_credentials', 'true');
    document.cookie = `has_supabase_credentials=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    return true;
  }
  
  // Third check: Check for our own Supabase credentials format
  const projectUrl = localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || localStorage.getItem('supabase_url');
  const anonKey = localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key');
  const accessToken = localStorage.getItem('supabase_access_token');
  
  // Use system default Supabase credentials from environment if user credentials not found
  if (!projectUrl || !anonKey) {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
    
    if (envUrl && envKey) {
      console.log('🔧 Using default Supabase credentials from environment');
      
      // Save default credentials to localStorage for future use
      localStorage.setItem('supabase_url', envUrl);
      localStorage.setItem('NEXT_PUBLIC_SUPABASE_URL', envUrl);
      localStorage.setItem('supabase_anon_key', envKey);
      localStorage.setItem('NEXT_PUBLIC_SUPABASE_ANON_KEY', envKey);
      
      return true;
    }
  }
  
  return !!projectUrl && !!anonKey;
};

/**
 * Save user Supabase credentials to localStorage
 * @param credentials Object containing user's Supabase credentials
 */
export function saveUserCredentials(credentials: {
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_access_token?: string;
  project_ref?: string;
  refresh_token?: string;
}): void {
  if (typeof window === 'undefined') {
    console.warn('Cannot save user credentials on server side');
    return;
  }

  console.log('💾 Saving user Supabase credentials to localStorage');
  
  // Save all provided credentials to localStorage with validation
  if (credentials.supabase_url) {
    localStorage.setItem('supabase_url', credentials.supabase_url);
    localStorage.setItem('NEXT_PUBLIC_SUPABASE_URL', credentials.supabase_url);
  }
  
  if (credentials.supabase_anon_key) {
    localStorage.setItem('supabase_anon_key', credentials.supabase_anon_key);
    localStorage.setItem('NEXT_PUBLIC_SUPABASE_ANON_KEY', credentials.supabase_anon_key);
  }
  
  if (credentials.supabase_access_token) {
    localStorage.setItem('supabase_access_token', credentials.supabase_access_token);
  }
  
  if (credentials.project_ref) {
    localStorage.setItem('supabase_project_ref', credentials.project_ref);
  }
  
  if (credentials.refresh_token) {
    localStorage.setItem('supabase_refresh_token', credentials.refresh_token);
  }
  
  // Reset the client cache so it will be recreated with new credentials
  userClient = null;
  
  // Store when credentials were last updated for reference
  localStorage.setItem('supabase_credentials_updated_at', new Date().toISOString());
  
  console.log('✅ User credentials saved successfully');
}

/**
 * Get current user credentials from localStorage
 */
export function getUserCredentials(): {
  supabase_url: string | null;
  supabase_anon_key: string | null;
  supabase_access_token: string | null;
  project_ref: string | null;
  refresh_token: string | null;
  last_updated: string | null;
} {
  if (typeof window === 'undefined') {
    return {
      supabase_url: null,
      supabase_anon_key: null,
      supabase_access_token: null,
      project_ref: null,
      refresh_token: null,
      last_updated: null
    };
  }
  
  return {
    supabase_url: localStorage.getItem('supabase_url'),
    supabase_anon_key: localStorage.getItem('supabase_anon_key'),
    supabase_access_token: localStorage.getItem('supabase_access_token'),
    project_ref: localStorage.getItem('supabase_project_ref'),
    refresh_token: localStorage.getItem('supabase_refresh_token'),
    last_updated: localStorage.getItem('supabase_credentials_updated_at')
  };
}

/**
 * Clear user credentials from localStorage
 */
export function clearUserCredentials(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('NEXT_PUBLIC_SUPABASE_URL');
  localStorage.removeItem('supabase_anon_key');
  localStorage.removeItem('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  localStorage.removeItem('supabase_access_token');
  localStorage.removeItem('supabase_project_ref');
  localStorage.removeItem('supabase_refresh_token');
  localStorage.removeItem('supabase_credentials_updated_at');
  
  // Reset the client cache
  userClient = null;
  
  console.log('🗑️ User credentials cleared from localStorage');
}

/**
 * Dynamic client that selects between admin or user credentials
 * based on authentication context and available credentials
 */
export const getDynamicSupabaseClient = (): SupabaseClient<Database> => {
  // If we're on the server, we must use admin credentials
  if (typeof window === 'undefined') {
    return createAdminSupabaseClient();
  }

  // First check: Is this admin mode?
  if (isAdminMode()) {
    console.log('🔐 Using admin credentials (admin mode detected)');
    return createAdminSupabaseClient();
  }

  // Check for Supabase session in localStorage
  const authKey = 'sb-' + (process.env.NEXT_PUBLIC_SUPABASE_URL || '').match(/^https:\/\/(.*?)\.supabase/)?.[1] + '-auth-token';
  const hasSession = localStorage.getItem(authKey) !== null;
  
  if (hasSession) {
    console.log('🔐 Found Supabase session, setting has_supabase_credentials flag');
    localStorage.setItem('has_supabase_credentials', 'true');
    document.cookie = `has_supabase_credentials=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  }

  // Second check: Does user have valid Supabase credentials?
  if (hasValidUserCredentials()) {
    try {
      console.log('👤 User mode check: USER MODE');
      return createUserSupabaseClient();
    } catch (error) {
      console.error('Error creating user Supabase client, falling back to admin:', error);
      
      // Instead of falling back to admin client, redirect to setup
      // This ensures users go through the setup process
      if (typeof window !== 'undefined' && 
          window.location.pathname.startsWith('/dashboard') &&
          !window.location.pathname.startsWith('/setup')) {
        console.log('🔄 Redirecting to setup page due to missing credentials');
        window.location.href = '/setup';
        
        // Return a temporary client that will be replaced after redirect
        // This prevents the application from crashing during redirect
        try {
          return createAdminSupabaseClient();
        } catch (e) {
          // If even admin client fails, create a minimal client just to prevent crashes
          // during navigation/redirect
          const dummyUrl = 'https://placeholder.supabase.co';
          const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';
          return createClient(dummyUrl, dummyKey);
        }
      }
      
      return createAdminSupabaseClient();
    }
  }

  // If we're on a dashboard page but don't have credentials, redirect to setup
  if (typeof window !== 'undefined' && 
      window.location.pathname.startsWith('/dashboard') &&
      !window.location.pathname.startsWith('/setup')) {
    console.log('📋 No credentials found on dashboard page, redirecting to setup');
    window.location.href = '/setup';
    
    // Return a temporary client that will be replaced after redirect
    try {
      return createAdminSupabaseClient();
    } catch (e) {
      // If even admin client fails, create a minimal client just to prevent crashes
      // during navigation/redirect
      const dummyUrl = 'https://placeholder.supabase.co';
      const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';
      return createClient(dummyUrl, dummyKey);
    }
  }

  // Default to admin client if no user credentials or in admin mode
  console.log('⚠️ No user credentials found, defaulting to admin client');
  return createAdminSupabaseClient();
};

// Export a single instance for direct use
export const dynamicSupabase = (() => {
  // Create a function to get the current client
  const getClient = () => getDynamicSupabaseClient();
  
  // Return a proxy that forwards all method calls to the appropriate client
  return new Proxy({} as SupabaseClient<Database>, {
    get: (target, prop) => {
      // Get the current client
      const client = getClient();
      // Forward the property access to the client
      return client[prop as keyof typeof client];
    }
  });
})(); 