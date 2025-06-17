import { useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

/**
 * Hook to use Supabase client with proper credentials based on mode
 * Supports both ADMIN MODE and USER MODE
 */
export function useSupabase() {
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [isUserMode, setIsUserMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUsingUserCredentials, setIsUsingUserCredentials] = useState(false);
  
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    const checkAuthStatus = () => {
      // Check admin status with multiple indicators
      const adminToken = localStorage.getItem('admin_token');
      const adminCookie = document.cookie.includes('admin_mode=true');
      const adminSessionCookie = document.cookie.includes('admin_session=true');
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      
      const adminMode = !!adminToken || adminCookie || adminSessionCookie || isAdminRoute;
      
      setIsAdmin(adminMode);
      
      // Check if user has their own valid Supabase credentials
      const hasProjectUrl = localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || localStorage.getItem('supabase_url');
      const hasAnonKey = localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key');
      const hasAccessToken = localStorage.getItem('supabase_access_token');
      
      const hasValidUserCredentials = !!hasProjectUrl && !!hasAnonKey && !!hasAccessToken;
      
      // Only consider using user credentials if they exist AND not in admin mode
      const usingUserCreds = hasValidUserCredentials && !adminMode;
      setIsUsingUserCredentials(usingUserCreds);
      setIsUserMode(!adminMode);
      
      // Create appropriate Supabase client
      if (adminMode) {
        // Admin mode - use environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        
        const client = createClient<Database>(url, key);
        setSupabase(client);
        console.log('👑 Using ADMIN credentials for Supabase client');
      } else if (hasValidUserCredentials) {
        // User mode with credentials - use localStorage values
        const url = hasProjectUrl || '';
        const key = hasAnonKey || '';
        
        const client = createClient<Database>(url, key);
        setSupabase(client);
        console.log('👤 Using USER credentials for Supabase client');
      } else {
        // Fallback with empty client
        console.log('⚠️ No valid credentials found, creating placeholder client');
        // Use default URL and key or environment variables as fallback
        const fallbackUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase.co';
        const fallbackKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-for-initialization-only';
        const client = createClient<Database>(fallbackUrl, fallbackKey);
        setSupabase(client);
      }
    };
    
    // Check on component mount
    checkAuthStatus();
    
    // Re-check on route changes
    const handleRouteChange = () => {
      checkAuthStatus();
    };
    
    // Set up a light-weight router change detection
    // Since Next.js App Router doesn't expose router events directly
    const interval = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== localStorage.getItem('last_path')) {
        localStorage.setItem('last_path', currentPath);
        handleRouteChange();
      }
    }, 300);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return {
    supabase,
    isAdmin,
    isUserMode,
    isUsingUserCredentials
  };
}

// Also export helper functions for saved credentials
export function getUserCredentials() {
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
  
  // Store when credentials were last updated for reference
  localStorage.setItem('supabase_credentials_updated_at', new Date().toISOString());
  
  console.log('✅ User credentials saved successfully');
}

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
  
  console.log('🗑️ User credentials cleared from localStorage');
}
