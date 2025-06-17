import { createClient } from '@supabase/supabase-js';
import { dynamicSupabase } from './supabase/dynamicClient';

// ⚠️ DEPRECATED ⚠️ 
// This file is kept for backward compatibility.
// For new code, please use dynamicSupabase from './supabase/dynamicClient' 
// or useSupabase() hook from './supabase/useSupabase'

// Environment variables for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Determine if we're on the server or client side
const isServer = typeof window === 'undefined';

// Use the appropriate key based on environment
const key = isServer ? supabaseServiceKey : supabaseAnonKey;

// Default client using environment variables (for development)
// Now just forwards to the dynamic client
export const supabase = dynamicSupabase;

// Helper to check credentials availability
function getCredentialsFromStorage() {
  if (typeof window === 'undefined') return null;
  
  try {
    // Get URLs from storage
    const userSupabaseUrl = 
      localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || 
      localStorage.getItem('supabase_url');
      
    // Get keys from storage (try both common names)
    const userSupabaseAnonKey = 
      localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
      localStorage.getItem('supabase_anon_key') ||
      localStorage.getItem('supabase_key');
      
    // Validate we have basic credentials
    if (!userSupabaseUrl || !userSupabaseAnonKey) {
      return null;
    }
    
    return {
      url: userSupabaseUrl,
      key: userSupabaseAnonKey
    };
  } catch (error) {
    console.error('Error reading credentials from storage:', error);
    return null;
  }
}

// Function to create a client using user-provided credentials
export function createUserSupabaseClient() {
  // Only run on client side
  if (typeof window === 'undefined') {
    console.warn('Attempted to create user Supabase client on server side');
    return supabase; // Fallback to default client
  }

  try {
    // Check for credentials in storage
    const credentials = getCredentialsFromStorage();
    
    // If credentials not found in storage, fallback to default
    if (!credentials) {
      console.warn('No user Supabase credentials found in storage');
      return supabase;
    }
    
    // Create and return the client
    console.log(`Creating Supabase client with user credentials, URL: ${credentials.url.substring(0, 15)}...`);
    return createClient(credentials.url, credentials.key);
  } catch (error) {
    console.error('Error creating user Supabase client:', error);
    return supabase; // Fallback to default client
  }
}

// Helper function to check if a user has valid Supabase credentials
export function hasValidSupabaseCredentials(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for credentials
  const credentials = getCredentialsFromStorage();
  if (!credentials) return false;
  
  // Additionally check for access token if needed
  const token = localStorage.getItem('supabase_access_token') || 
                localStorage.getItem('access_token');
  
  // Return true if we have basic credentials
  return !!credentials.url && !!credentials.key;
}

// Helper to check if schema setup is completed
export function isSchemaSetupComplete(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('schema_setup_completed') === 'true';
}
