'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from './../../lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';
import { dynamicSupabase as supabase } from '@/lib/supabase/dynamicClient';
import { createAndSetSession } from '@/lib/auth/session';

export default function SignInPage() {
  const router = useRouter();
  const { signInWithGoogle, isLoading, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [clickedSignIn, setClickedSignIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Handle URL parameters for auth callbacks
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authSuccessParam = params.get('auth_success');
      const authErrorParam = params.get('auth_error');
      const callbackUrl = params.get('callbackUrl') || '/dashboard'; // Default to dashboard if no callback URL

      // Helper for setting cookies with consistent domain handling
      const setCookie = (name: string, value: string, maxAge: number) => {
        const hostname = window.location.hostname;
        const isProd = hostname.includes('bladexlab.com');
        const domain = isProd ? '.bladexlab.com' : undefined;
        const domainPart = domain ? `; domain=${domain}` : '';
        const secure = window.location.protocol === 'https:';
        document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}${domainPart}`;
      };

      if (authSuccessParam === 'true') {
        setAuthSuccess(true);
        // Clear any auth error flags
        setCookie('auth_in_progress', '', 0);
        setCookie('auth_callback_in_progress', '', 0);
        localStorage.removeItem('auth_in_progress');
        sessionStorage.removeItem('auth_in_progress');

        // Set success cookie with long expiration for persistent sessions
        setCookie('has_supabase_credentials', 'true', 60 * 60 * 24 * 30); // 30 days
        localStorage.setItem('has_supabase_credentials', 'true');

        // Also set auth_success cookie to help the setup page detect the successful auth
        setCookie('auth_success', 'true', 60 * 5); // 5 minutes 

        // NEW - Create a secure session token
        const userEmail = localStorage.getItem('user_email');
        const userId = localStorage.getItem('user_id');
        const isAdmin = window.location.pathname.startsWith('/admin');

        if (userEmail && userId) {
          // Call API to create session token
          fetch('/api/auth/create-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              email: userEmail,
              role: isAdmin ? 'admin' : 'user'
            }),
          }).then(res => {
            if (!res.ok) {
              console.error('Failed to create session token');
            } else {
              console.log('Secure session token created successfully');
            }
          }).catch(err => {
            console.error('Error creating session token', err);
          });
        }

        // Reset redirect count to avoid triggering redirect loop detection
        setCookie('redirect_count', '0', 0);

        // Redirect to callback URL or dashboard after a short delay
        setTimeout(() => {
          // Use direct navigation to avoid React router and break potential chains
          window.location.href = callbackUrl;
        }, 1000);
      }

      if (authErrorParam) {
        setError(authErrorParam === 'redirect_loop'
          ? 'Authentication error: Too many redirects. Please try clearing your cookies and signing in again.'
          : `Authentication error: ${authErrorParam}`);

        // Clear any auth flags
        setCookie('auth_in_progress', '', 0);
        setCookie('auth_callback_in_progress', '', 0);
        localStorage.removeItem('auth_in_progress');
        sessionStorage.removeItem('auth_in_progress');
      }

      // Clean the URL to avoid persisting error/success params in history
      if (authSuccessParam || authErrorParam) {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, []);

  // Check if already logged in - redirect to dashboard or setup
  useEffect(() => {
    // Skip this check if we just handled a callback
    if (authSuccess) return;

    if (user && !isRedirecting) {
      const hasCredentials = localStorage.getItem('has_supabase_credentials') === 'true';

      // Redirect to loading page first for smooth transition
      setIsRedirecting(true);

      if (hasCredentials) {
        // Go to dashboard if already set up
        router.push('/loading?to=/dashboard&reason=dashboard');
      } else {
        // Go to setup if not set up yet
        router.push('/loading?to=/setup&reason=setup');
      }
    }
  }, [user, router, isRedirecting, authSuccess]);

  const handleGoogleSignIn = async () => {
    try {
      // Show loading state
      setIsGoogleLoading(true);
      setClickedSignIn(true);
      setError(null);
      
      console.log('Starting Google sign-in process...');
      
      // Track auth state across redirects - this is critical
      const hostname = window.location.hostname;
      const isProd = hostname.includes('bladexlab.com');
      const domain = isProd ? '.bladexlab.com' : undefined;
      const domainPart = domain ? `; domain=${domain}` : '';
      const secure = window.location.protocol === 'https:';
      
      // Set auth_in_progress with longer timeout to allow for slower auth flows
      document.cookie = `auth_in_progress=true; path=/; max-age=${60 * 10}; SameSite=Lax${secure ? '; Secure' : ''}${domainPart}`;
      localStorage.setItem('auth_in_progress', 'true');
      sessionStorage.setItem('auth_in_progress', 'true');
      
      // Reset any redirect counters
      document.cookie = `redirect_count=0; path=/; max-age=0; SameSite=Lax${domainPart}`;
      
      // Use window.location.origin to ensure it matches the current domain exactly
      // This is critical for OAuth to work correctly in all environments
      const redirectTo = `${window.location.origin}/auth/callback`;
      
      // Save original URL if provided in query params
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl');
      if (callbackUrl) {
        sessionStorage.setItem('auth_callback_url', callbackUrl);
      }
      
      // Important: Always skip browser redirect to handle it manually for consistent cookie handling
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Always skip browser redirect to handle it manually for consistent cookie handling
          skipBrowserRedirect: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Store user info in localStorage for session creation after redirect
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          localStorage.setItem('user_email', session.user.email || '');
          localStorage.setItem('user_id', session.user.id);
        }
      });
      
      // Handle redirect manually for all environments
      if (data?.url) {
        console.log(`Supabase returned OAuth URL: ${data.url.substring(0, 50)}...`);
        
        // Set a cookie to track the redirect to Google
        document.cookie = `google_auth_redirect=true; path=/; max-age=${60 * 5}; SameSite=Lax${domainPart}`;
        
        // Force immediate redirect to the OAuth URL returned by Supabase using replace
        // Using replace instead of href to avoid adding to browser history
        console.log('Redirecting to Google auth URL immediately...');
        window.location.replace(data.url);
      } else {
        // If no URL was returned, something went wrong
        throw new Error('No OAuth URL returned from Supabase');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      
      // Clear auth state with consistent domain handling
      const hostname = window.location.hostname;
      const isProd = hostname.includes('bladexlab.com');
      const domain = isProd ? '.bladexlab.com' : undefined;
      const domainPart = domain ? `; domain=${domain}` : '';
      
      document.cookie = `auth_in_progress=; path=/; max-age=0${domainPart}`;
      document.cookie = `auth_callback_in_progress=; path=/; max-age=0${domainPart}`;
      document.cookie = `google_auth_redirect=; path=/; max-age=0${domainPart}`;
      document.cookie = `redirect_count=; path=/; max-age=0${domainPart}`;
      localStorage.removeItem('auth_in_progress');
      sessionStorage.removeItem('auth_in_progress');
      localStorage.removeItem('direct_signin');
      
      setError('Failed to connect to Google. Please try again.');
      setIsGoogleLoading(false);
      toast.error('Failed to sign in with Google');
    }
  };

  // If already redirecting, show minimal spinner
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-800 via-gray-900 to-black">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-800 via-gray-900 to-black">
      {/* Animated 3D background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-700/30 rounded-full filter blur-[100px] animate-blob"></div>
        <div className="absolute top-0 -right-20 w-80 h-80 bg-blue-700/30 rounded-full filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-teal-700/30 rounded-full filter blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Glassmorphism card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-10 space-y-8 relative z-10 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-3 font-sans">Welcome</h1>
          <p className="text-gray-300 font-light text-lg">Sign in to access Bladex AI</p>
        </div>

        <div className="space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading || clickedSignIn || isGoogleLoading}
            className={`w-full relative overflow-hidden group bg-white hover:bg-gray-100 text-gray-900 font-medium py-4 px-6 rounded-xl shadow-lg transition-all duration-300 ${(isLoading || clickedSignIn || isGoogleLoading) ? 'opacity-80 cursor-not-allowed' : 'transform hover:scale-[1.01] hover:shadow-xl'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            <div className="flex items-center justify-center space-x-2">
              {isLoading || clickedSignIn || isGoogleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
                  <span className="font-medium">Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="font-medium">Continue with Google</span>
                </>
              )}
            </div>
          </Button>

          <p className="text-center text-gray-400 text-sm mt-6 font-light">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>

      {/* Add styles for animations */}
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}