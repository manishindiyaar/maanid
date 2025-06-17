'use client';

import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { dynamicSupabase } from '../supabase/dynamicClient';
import { Session, User, Provider } from '@supabase/supabase-js';

type OrganizationData = {
  id: string;
  name: string;
};

type ProfileData = {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string | null;
  is_admin: boolean;
};

interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  organization: OrganizationData | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Add a helper function for consistent cookie handling
function setCookieWithDomain(name: string, value: string, maxAge: number) {
  if (typeof window === 'undefined') return;
  
  const hostname = window.location.hostname;
  const isProd = hostname.includes('bladexlab.com');
  const domain = isProd ? '.bladexlab.com' : undefined;
  const domainPart = domain ? `; domain=${domain}` : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${domainPart}${secure}`;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if user is in admin mode
  useEffect(() => {
    const checkAdminMode = () => {
      const adminMode = document.cookie.includes('admin_mode=true');
      const adminSession = document.cookie.includes('admin_session=true');
      const adminToken = localStorage.getItem('admin_token');

      const isAdminMode = adminMode || adminSession || !!adminToken;
      console.log('👤 User mode check:', isAdminMode ? 'ADMIN MODE' : 'USER MODE');

      setIsAdmin(isAdminMode);

      // Ensure all admin indicators are in sync
      if (isAdminMode) {
        // Set all admin indicators if any one is true
        localStorage.setItem('admin_token', 'true');
        if (!adminMode) {
          setCookieWithDomain('admin_mode', 'true', 60 * 60 * 24 * 30);
        }
        if (!adminSession) {
          setCookieWithDomain('admin_session', 'true', 60 * 60 * 24 * 30);
        }
      }
    };

    // Check on component mount
    checkAdminMode();

    // Check on every path change by setting up an interval
    // This is a workaround since AppRouter doesn't expose events
    const pathChangeChecker = setInterval(() => {
      // Store the last path to detect changes
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const storedPath = sessionStorage.getItem('lastPath');

        if (storedPath !== currentPath) {
          sessionStorage.setItem('lastPath', currentPath);
          checkAdminMode();
        }
      }
    }, 300);

    return () => {
      clearInterval(pathChangeChecker);
    };
  }, []);

  useEffect(() => {
    const setupAuth = async () => {
      setIsLoading(true);

      // Get current session
      const { data: sessionData } = await dynamicSupabase.auth.getSession();
      setSession(sessionData.session);
      setUser(sessionData.session?.user || null);

      // If we have a session, set the has_supabase_credentials flag
      if (sessionData.session?.user) {
        localStorage.setItem('has_supabase_credentials', 'true');
        setCookieWithDomain('has_supabase_credentials', 'true', 60 * 60 * 24 * 30);
        await loadUserProfile(sessionData.session.user.id);
      }

      // Setup auth state change listener
      const { data: authListener } = dynamicSupabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log(`Auth state change event: ${event}`);

        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'INITIAL_SESSION' && !newSession) {
          console.log('🔄 Initial session with no user');

          // Check if we're in an auth attempt
          const authAttempt = document.cookie.includes('auth_attempt=true') ||
                              window.sessionStorage.getItem('supabase.auth.token') === 'pending';

          if (authAttempt) {
            console.log('🔍 Auth attempt in progress, waiting for completion');
            // Don't do any redirects or state changes while auth is in progress
            return;
          }

          // Continue with normal flow...
        }

        if (newSession?.user) {
          console.log('✅ User signed in successfully!');

          // Clear auth attempt tracking since we succeeded
          document.cookie = `auth_attempt=; path=/; max-age=0; SameSite=Lax; Secure`;
          document.cookie = `auth_attempt_timestamp=; path=/; max-age=0; SameSite=Lax; Secure`;
          window.sessionStorage.removeItem('supabase.auth.token');
          
          // Set the has_supabase_credentials flag when user is authenticated
          localStorage.setItem('has_supabase_credentials', 'true');
          setCookieWithDomain('has_supabase_credentials', 'true', 60 * 60 * 24 * 30);

          // Continue with loading profile, etc.
          await loadUserProfile(newSession.user.id);
        } else {
          console.log('❌ No user session found');
          setProfile(null);
          setOrganization(null);
          
          // Clear the has_supabase_credentials flag when user is not authenticated
          localStorage.removeItem('has_supabase_credentials');
          setCookieWithDomain('has_supabase_credentials', '', 0);
        }

        // Update route based on authentication state
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession) {
          console.log(`🔄 Redirecting after ${event} event`);

          // Don't redirect if in admin mode
          if (isAdmin) {
            console.log('👑 Admin mode detected, skipping standard redirect flow');
            return;
          }

          // Check if setup is complete
          const hasSupabaseCredentials = localStorage.getItem('supabase_access_token') &&
                                         localStorage.getItem('supabase_project_ref');
          const schemaSetupCompleted = localStorage.getItem('schema_setup_completed') === 'true';

          // Get current path to avoid redirect loops
          const currentPath = window.location.pathname;
          console.log('📍 Current path:', currentPath);

          if (hasSupabaseCredentials) {
            if (schemaSetupCompleted) {
              // Only redirect if not already on dashboard
              if (!currentPath.startsWith('/dashboard')) {
                console.log('Supabase credentials and schema found, redirecting to dashboard');
                router.push('/dashboard');
              } else {
                console.log('Already on dashboard, no redirect needed');
              }
            } else {
              // Only redirect if not already on setup or dashboard
              if (!currentPath.startsWith('/setup') && !currentPath.startsWith('/dashboard')) {
                console.log('Supabase credentials found but schema incomplete, redirecting to setup');
                router.push('/setup');
              } else {
                console.log('Already on setup or dashboard with incomplete schema, no redirect needed');
              }
            }
          } else {
            // Only redirect if not already on setup
            if (!currentPath.startsWith('/setup')) {
              console.log('No Supabase credentials found, redirecting to setup');
              router.push('/setup');
            } else {
              console.log('Already on setup, no redirect needed');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔄 Redirecting to login after sign out');

          // If in admin mode and signed out, clear admin cookies
          if (isAdmin) {
            setCookieWithDomain('admin_mode', '', 0);
            setCookieWithDomain('admin_session', '', 0);
            localStorage.removeItem('admin_token');
            setIsAdmin(false);
          }

          router.push('/login');
        }
      });

      setIsLoading(false);

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    setupAuth();
  }, [router, isAdmin]);

  const loadUserProfile = async (userId: string) => {
    try {
      // Get user profile
      try {
        const { data: profileData, error: profileError } = await dynamicSupabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          // If the error is due to the profiles table not existing, just log it and continue
          if (profileError.code === '42P01') {
            console.info('Profiles table does not exist yet. This is normal for new setups.');
            // Set a minimal profile to continue the flow
            setProfile({
              id: userId,
              email: user?.email || '',
              full_name: user?.user_metadata?.full_name || null,
              organization_id: null,
              is_admin: false
            });
            return;
          }

          throw profileError;
        }

        setProfile(profileData);

        // If profile has an organization, load it
        if (profileData && profileData.organization_id) {
          try {
            const { data: orgData, error: orgError } = await dynamicSupabase
              .from('organizations')
              .select('*')
              .eq('id', profileData.organization_id)
              .single();

            if (orgError) {
              if (orgError.code === '42P01') {
                console.info('Organizations table does not exist yet. This is normal for new setups.');
              } else {
                throw orgError;
              }
            } else if (orgData) {
              setOrganization(orgData);
            }
          } catch (err) {
            console.error('Error loading organization:', err);
            // Continue without organization data
          }
        }
      } catch (profileError) {
        // Log the error but don't throw, as authentication can still work without profile
        console.error('Error loading user profile:', profileError);

        // Set up a basic profile based on the user auth data
        setProfile({
          id: userId,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || null,
          organization_id: null,
          is_admin: false
        });
      }
    } catch (error) {
      console.error('Error in loadUserProfile flow:', error);
      // Don't throw errors from here to prevent breaking auth flow
    }
  };

  const refreshSession = async () => {
    setIsLoading(true);
    const { data } = await dynamicSupabase.auth.refreshSession();
    setSession(data.session);
    setUser(data.session?.user || null);

    if (data.session?.user) {
      await loadUserProfile(data.session.user.id);
    }

    setIsLoading(false);
  };

  const signIn = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await dynamicSupabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get correct redirect URL based on environment 
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isProduction = origin.includes('bladexlab.com');
      const redirectTo = isProduction 
        ? 'https://www.bladexlab.com/auth/callback'
        : `${origin}/auth/callback`;

      const { data, error } = await dynamicSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          // Ensure we request the user's email
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      if (data?.provider && data?.url) {
        // Set a cookie to track auth in progress
        document.cookie = "auth_in_progress=true; path=/; max-age=300";
        // Redirect to the OAuth provider
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dynamicSupabase.auth]);

  const signOut = async () => {
    setIsLoading(true);
    try {
      // If in admin mode, call the admin logout endpoint
      if (isAdmin) {
        console.log('👑 Admin logout flow');
        const response = await fetch('/api/admin/logout', {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.clearAdminToken) {
            localStorage.removeItem('admin_token');
          }
          setCookieWithDomain('admin_mode', '', 0);
          setCookieWithDomain('admin_session', '', 0);
          setIsAdmin(false);
        }

        router.push('/admin');
      } else {
        // Regular user logout
        console.log('👤 User logout flow');
        const { error } = await dynamicSupabase.auth.signOut();
        if (error) throw error;
      }

      setProfile(null);
      setOrganization(null);

    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organization,
        session,
        isLoading,
        isAdmin,
        signIn,
        signInWithGoogle,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};