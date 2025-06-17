'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronRight, Database, Server, Key, Copy, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from './../../lib/auth/AuthContext';
import { toast } from 'sonner';
import { saveOAuthState, generateCodeVerifier, generateCodeChallenge } from './../../lib/supabaseOAuth';

// Helper function to generate random string for state
function generateRandomString(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Simple hash function for code challenge
async function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

// Base64 URL encoding for PKCE
function base64URLEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper function to get a cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Helper function to set a cookie with proper domain handling
function setCookie(name: string, value: string, maxAge: number, options: {secure?: boolean, domain?: string} = {}) {
  if (typeof document === 'undefined') return;
  
  const hostname = window.location.hostname;
  const isProd = hostname.includes('bladexlab.com');
  const domain = options.domain || (isProd ? '.bladexlab.com' : undefined);
  const domainPart = domain ? `; domain=${domain}` : '';
  const secure = options.secure ?? (window.location.protocol === 'https:');
  
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}${domainPart}`;
}

export default function SetupPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<'intro' | 'create' | 'connect' | 'loading'>('intro');
  const [isLoadingConnect, setIsLoadingConnect] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authSuccessDetected, setAuthSuccessDetected] = useState(false);
  const [originalCallbackUrl, setOriginalCallbackUrl] = useState('/dashboard'); // Default to dashboard
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRedirectAttempts = useRef(0);

  // Check if the user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check URL parameters for auth-related info
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get('auth_success') === 'true';
        const callbackParam = urlParams.get('callbackUrl');
        
        // Check for original callback URL in both cookies and URL params
        const callbackCookie = getCookie('original_callback_url');
        const callbackFromSessionStorage = sessionStorage.getItem('auth_callback_url');
        const callback = callbackParam || callbackCookie || callbackFromSessionStorage || '/dashboard';
        setOriginalCallbackUrl(callback);
        
        // Check for auth_success cookie which would indicate we just completed authentication
        const hasAuthSuccessCookie = getCookie('auth_success') === 'true';
        
        // If we just completed authentication, make sure we set the right flags
        if (authSuccess || hasAuthSuccessCookie) {
          console.log('Auth success detected, setting credentials flags');
          localStorage.setItem('has_supabase_credentials', 'true');
          setAuthSuccessDetected(true);
          
          // Clear auth_success cookie to prevent repeat detection
          setCookie('auth_success', '', 0);
          
          // Set other required flags
          setCookie('has_supabase_credentials', 'true', 60 * 60 * 24 * 30);
          
          // Clear auth in progress flags
          setCookie('auth_in_progress', '', 0);
          setCookie('auth_callback_in_progress', '', 0);
          localStorage.removeItem('auth_in_progress');
          sessionStorage.removeItem('auth_in_progress');
          
          // Use a short timeout to allow cookies to be properly set
          setTimeout(() => {
            setIsInitializing(false);
          }, 100);
          return;
        }
        
        if (!authLoading) {
          if (!user && !authSuccessDetected) {
            console.log('User not logged in, redirecting to loading page');
            setIsRedirecting(true);
            // Show loading screen first
            router.push('/loading?to=/signin&reason=auth');
            return;
          }
          
          // User is authenticated, ensure we set credentials flags
          console.log('User authenticated in setup page', user);
          localStorage.setItem('has_supabase_credentials', 'true');
          
          // Set secure cookie with proper domain handling
          setCookie('has_supabase_credentials', 'true', 60 * 60 * 24 * 30);
          
          // Clear auth_in_progress as we're now on the setup page
          setCookie('auth_in_progress', '', 0);
          localStorage.removeItem('auth_in_progress');
          sessionStorage.removeItem('auth_in_progress');
          
          // Special marker from signin page - clear it
          localStorage.removeItem('direct_signin');
          
          // Check if setup was already completed
          const hasCredentials = localStorage.getItem('has_supabase_credentials') === 'true';
          const schemaSetupCompleted = localStorage.getItem('schema_setup_completed') === 'true';
          
          if (hasCredentials && schemaSetupCompleted) {
            // Setup already completed, redirect to original callback URL or dashboard
            console.log('Setup complete, redirecting to original destination:', originalCallbackUrl);
            setIsRedirecting(true);
            setCookie('schema_setup_completed', 'true', 60 * 60 * 24 * 30);
            
            // Clear the original callback URL cookie since we're using it now
            setCookie('original_callback_url', '', 0);
            sessionStorage.removeItem('auth_callback_url');
            
            // Use loading page for smoother transition
            router.push(`/loading?to=${encodeURIComponent(originalCallbackUrl)}&reason=dashboard`);
            return;
          }
          
          // Check for existing progress
          const setupProgress = localStorage.getItem('setup_progress');
          if (setupProgress) {
            setCurrentStep(setupProgress as any);
          }
          
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Error in auth check:', error);
        // On error, show error and allow retry
        setIsInitializing(false);
        toast.error('Error checking authentication status');
      }
    };
    
    // Only execute if not already redirecting
    if (!isRedirecting) {
      checkAuth();
    }
    
    // If initialization takes too long, stop showing loading state
    const initTimeout = setTimeout(() => {
      setIsInitializing(false);
    }, 5000);
    
    return () => {
      clearTimeout(initTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, authLoading, router, isRedirecting, authSuccessDetected, originalCallbackUrl]);

  // Save progress to localStorage
  useEffect(() => {
    if (currentStep !== 'loading') {
      localStorage.setItem('setup_progress', currentStep);
    }
    
    // Clear any existing timeouts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentStep]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      
      // Reset copy status after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setCopiedCode(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleConnectSupabase = async () => {
    try {
      setIsLoadingConnect(true);
      
      // Set schema setup in progress marker in both localStorage and cookies
      localStorage.setItem('schema_setup_in_progress', 'true');
      setCookie('schema_setup_in_progress', 'true', 60 * 60 * 24);
      
      // Set redirect in progress
      setCookie('setup_redirect_in_progress', 'true', 60);
      
      // Generate state and code verifier for PKCE using imported helpers
      const codeVerifier = generateCodeVerifier();
      const state = generateRandomString(40);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Prepare redirect URI and client ID
      const redirectUri = `${window.location.origin}/setup/complete`;
      const clientId = "20d973be-a6f9-47d3-a4fa-043f9fcbbb19";
      
      // Save OAuth state using the helper function
      saveOAuthState(codeVerifier, state, redirectUri, clientId);
      
      // Also save user email in metadata for easier reference
      const oauthMetadata = {
        state,
        codeVerifier,
        redirectUri,
        timestamp: Date.now(),
        userEmail: user?.email || null
      };
      localStorage.setItem('supabase_oauth_metadata', JSON.stringify(oauthMetadata));
      
      // Construct the OAuth URL
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      const scope = encodeURIComponent('offline_access');
      
      // Use the correct endpoint
      const oauthUrl = `https://api.supabase.com/v1/oauth/authorize?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodedRedirectUri}` +
        `&scope=${scope}` +
        `&response_type=code` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&state=${state}`;
      
      console.log('Redirecting to Supabase OAuth:', oauthUrl);
      
      // Show loading animation first before redirecting to OAuth
      setCurrentStep('loading');
      
      // Show loading for a short time before redirecting to external site
      setTimeout(() => {
        // Redirect to Supabase OAuth
        window.location.href = oauthUrl;
      }, 1000);
    } catch (error) {
      console.error('Error initiating Supabase connection:', error);
      setIsLoadingConnect(false);
      setCurrentStep('connect');
      toast.error('Failed to connect to Supabase. Please try again.');
      
      // Clear redirect in progress
      setCookie('setup_redirect_in_progress', '', 0);
    }
  };

  // Animation variants for step transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.3
      } 
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  // Return loading state during initialization or redirection
  if (isInitializing || isRedirecting || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 z-0 bg-[url('/grid-pattern.svg')] bg-center opacity-10"></div>
        
        {/* Spotlight effect */}
        <div className="absolute inset-0 z-0 bg-gradient-radial from-teal-500/10 via-transparent to-transparent opacity-60"></div>
        
        {/* Loading spinner with teal glow */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(45,212,191,0.5)]"></div>
          <p className="mt-4 text-teal-300 font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 py-16 px-4 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 z-0 bg-[url('/grid-pattern.svg')] bg-center opacity-10"></div>
      
      {/* Spotlight effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-radial from-teal-500/20 via-transparent to-transparent opacity-80"></div>
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-500 bg-clip-text text-transparent mb-4 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]">
            Connect Your Supabase Project
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Set up your Supabase database to power your Bladex AI application
          </p>
        </motion.div>
        
        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="flex items-center justify-center mb-12"
        >
          {/* Step 1 */}
          <div className="flex items-center space-x-2">
            <motion.div 
              className={`w-10 h-10 rounded-full flex items-center justify-center relative 
                ${currentStep === 'intro' 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_0_10px_rgba(45,212,191,0.5)]' 
                  : 'bg-gray-800 text-teal-300 border border-teal-500/30'}`}
              whileHover={currentStep !== 'intro' ? { scale: 1.05, boxShadow: '0 0 15px rgba(45,212,191,0.7)' } : {}}
            >
              1
              {currentStep === 'intro' && (
                <motion.div 
                  className="absolute -inset-1 rounded-full bg-teal-500/20"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.2, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                ></motion.div>
              )}
            </motion.div>
            <span className={`text-sm ${currentStep === 'intro' ? 'text-teal-300' : 'text-gray-400'}`}>Introduction</span>
          </div>
          
          {/* Connector */}
          <div className="relative w-16 h-px mx-2">
            <div className="absolute inset-0 bg-gray-700"></div>
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 origin-left"
              initial={{ scaleX: currentStep === 'intro' ? 0 : 1 }}
              animate={{ scaleX: currentStep === 'intro' ? 0 : 1 }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
          
          {/* Step 2 */}
          <div className="flex items-center space-x-2">
            <motion.div 
              className={`w-10 h-10 rounded-full flex items-center justify-center relative 
                ${currentStep === 'create' 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_0_10px_rgba(45,212,191,0.5)]' 
                  : currentStep === 'connect' || currentStep === 'loading' 
                    ? 'bg-gray-800 text-teal-300 border border-teal-500/30' 
                    : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
              whileHover={currentStep !== 'create' && (currentStep === 'connect' || currentStep === 'loading') ? { scale: 1.05, boxShadow: '0 0 15px rgba(45,212,191,0.7)' } : {}}
            >
              2
              {currentStep === 'create' && (
                <motion.div 
                  className="absolute -inset-1 rounded-full bg-teal-500/20"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.2, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                ></motion.div>
              )}
            </motion.div>
            <span className={`text-sm ${currentStep === 'create' ? 'text-teal-300' : currentStep === 'connect' || currentStep === 'loading' ? 'text-gray-400' : 'text-gray-500'}`}>Create Project</span>
          </div>
          
          {/* Connector */}
          <div className="relative w-16 h-px mx-2">
            <div className="absolute inset-0 bg-gray-700"></div>
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 origin-left"
              initial={{ scaleX: currentStep === 'connect' || currentStep === 'loading' ? 1 : 0 }}
              animate={{ scaleX: currentStep === 'connect' || currentStep === 'loading' ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
          
          {/* Step 3 */}
          <div className="flex items-center space-x-2">
            <motion.div 
              className={`w-10 h-10 rounded-full flex items-center justify-center relative
                ${currentStep === 'connect' || currentStep === 'loading' 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_0_10px_rgba(45,212,191,0.5)]' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
            >
              3
              {(currentStep === 'connect' || currentStep === 'loading') && (
                <motion.div 
                  className="absolute -inset-1 rounded-full bg-teal-500/20"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.2, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                ></motion.div>
              )}
            </motion.div>
            <span className={`text-sm ${currentStep === 'connect' || currentStep === 'loading' ? 'text-teal-300' : 'text-gray-500'}`}>Connect</span>
          </div>
        </motion.div>
        
        {/* Main Content */}
        <div className="bg-slate-800/40 backdrop-blur-lg rounded-xl border border-teal-500/10 overflow-hidden shadow-[0_5px_30px_rgba(20,184,166,0.15)] relative">
          {/* Glow effects on the card */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
          </div>
          
          {/* Content sections with AnimatePresence for smooth transitions */}
          <AnimatePresence mode="wait">
            {/* Loading Step */}
            {currentStep === 'loading' && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="p-12 flex flex-col items-center justify-center relative z-10"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(45,212,191,0.5)] animate-pulse"></div>
                </div>
                <h2 className="text-2xl font-bold text-teal-300 mb-3">Connecting to Supabase</h2>
                <p className="text-gray-300 text-center max-w-md">
                  Please wait while we redirect you to Supabase for authentication...
                </p>
              </motion.div>
            )}
            
            {/* Introduction Step */}
            {currentStep === 'intro' && (
              <motion.div 
                key="intro"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="p-8 relative z-10"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-8">
                  <div className="max-w-xl">
                    <motion.h2 variants={itemVariants} className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                      Connecting Supabase is Easy
                    </motion.h2>
                    <div className="space-y-6 text-gray-300">
                      <motion.div variants={itemVariants} className="flex items-start group">
                        <div className="rounded-lg p-2 bg-teal-500/10 mr-4 flex-shrink-0 group-hover:bg-teal-500/20 transition-all duration-300">
                          <Database className="h-6 w-6 text-teal-400 group-hover:text-teal-300 transition-colors duration-300" />
                        </div>
                        <p className="group-hover:text-gray-100 transition-colors duration-300">
                          Bladex AI uses Supabase to store your customer data, chat messages, and AI configurations. It's a powerful, open-source PostgreSQL database.
                        </p>
                      </motion.div>
                      
                      <motion.div variants={itemVariants} className="flex items-start group">
                        <div className="rounded-lg p-2 bg-teal-500/10 mr-4 flex-shrink-0 group-hover:bg-teal-500/20 transition-all duration-300">
                          <Server className="h-6 w-6 text-teal-400 group-hover:text-teal-300 transition-colors duration-300" />
                        </div>
                        <p className="group-hover:text-gray-100 transition-colors duration-300">
                          You'll need your own Supabase project to use Bladex AI. Don't worry - Supabase offers a generous free tier that's perfect for getting started.
                        </p>
                      </motion.div>
                      
                      <motion.div variants={itemVariants} className="flex items-start group">
                        <div className="rounded-lg p-2 bg-teal-500/10 mr-4 flex-shrink-0 group-hover:bg-teal-500/20 transition-all duration-300">
                          <Key className="h-6 w-6 text-teal-400 group-hover:text-teal-300 transition-colors duration-300" />
                        </div>
                        <p className="group-hover:text-gray-100 transition-colors duration-300">
                          We'll help you create a project and securely connect it to Bladex AI. Your data always remains under your control.
                        </p>
                      </motion.div>
                      
                      <motion.div variants={itemVariants} className="mt-8">
                        <Button
                          onClick={() => setCurrentStep('create')}
                          className="relative bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-6 rounded-lg transform hover:scale-105 transition-all duration-300 flex items-center"
                        >
                          <span className="relative z-10">Let's Get Started</span>
                          <ChevronRight className="ml-2 h-5 w-5 relative z-10" />
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 blur transition-opacity duration-300 group-hover:opacity-70"></div>
                          <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(45,212,191,0.5)] opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* 3D Illustration - removed but kept the layout */}
                  <motion.div 
                    variants={itemVariants}
                    className="hidden lg:flex lg:items-center lg:justify-center"
                  >
                    <div className="w-64 h-64 rounded-full bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-transparent relative">
                      <motion.div 
                        className="absolute inset-0 rounded-full"
                        animate={{ 
                          boxShadow: ['0 0 20px rgba(45,212,191,0.3)', '0 0 30px rgba(45,212,191,0.5)', '0 0 20px rgba(45,212,191,0.3)'] 
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
            
            {/* Create Project Step */}
            {currentStep === 'create' && (
              <motion.div 
                key="create"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="p-8 relative z-10"
              >
                <motion.h2 variants={itemVariants} className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                  Create Your Supabase Project
                </motion.h2>
                
                <div className="space-y-10">
                  <motion.div variants={itemVariants} className="space-y-4">
                    <h3 className="text-xl font-medium text-white flex items-center">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center mr-3 text-white shadow-[0_0_10px_rgba(45,212,191,0.5)]">1</span>
                      Go to Supabase and Sign Up
                    </h3>
                    <div className="pl-11">
                      <p className="text-gray-300 mb-4">
                        Create a Supabase account if you don't already have one.
                      </p>
                      <Button 
                        onClick={() => window.open('https://supabase.com/dashboard/sign-up', '_blank')}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white flex items-center relative overflow-hidden group"
                      >
                        <span className="relative z-10">Open Supabase</span>
                        <ExternalLink className="ml-2 h-4 w-4 relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-20 transform-gpu -skew-x-30 -translate-x-full group-hover:translate-x-full transition-all duration-700 ease-out"></div>
                      </Button>
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="space-y-4">
                    <h3 className="text-xl font-medium text-white flex items-center">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center mr-3 text-white shadow-[0_0_10px_rgba(45,212,191,0.5)]">2</span>
                      Create a New Project
                    </h3>
                    <div className="pl-11">
                      <p className="text-gray-300 mb-4">
                        Once signed in, create a new project by clicking "New Project".
                      </p>
                      <ul className="space-y-2 ml-4">
                        {[
                          "Choose a project name (e.g. \"bladex-ai\")",
                          "Set a secure database password",
                          "Choose the region closest to your users",
                          "The free tier is perfect for getting started"
                        ].map((item, index) => (
                          <motion.li 
                            key={index}
                            className="flex items-center text-gray-400 group"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-teal-500 mr-2 group-hover:bg-teal-400 transition-colors"></div>
                            <span className="group-hover:text-teal-300 transition-colors">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="space-y-4">
                    <h3 className="text-xl font-medium text-white flex items-center">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center mr-3 text-white shadow-[0_0_10px_rgba(45,212,191,0.5)]">3</span>
                      Wait for Project Creation
                    </h3>
                    <div className="pl-11">
                      <p className="text-gray-300 mb-4">
                        Supabase will set up your project. This may take a few minutes.
                      </p>
                      <div className="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <Button
                          onClick={() => setCurrentStep('connect')}
                          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-6 py-5 rounded-lg shadow-[0_0_15px_rgba(45,212,191,0.3)] hover:shadow-[0_0_20px_rgba(45,212,191,0.5)] transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
                        >
                          <span className="relative z-10">I've Created My Project</span>
                          <span className="relative z-10">I've Created My Project</span>
                          <ArrowRight className="ml-2 h-5 w-5 relative z-10" />
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-20 transform-gpu -skew-x-30 -translate-x-full group-hover:translate-x-full transition-all duration-700 ease-out"></div>
                        </Button>
                        
                        <Button
                          onClick={() => setCurrentStep('intro')}
                          variant="outline"
                          className="border border-teal-500/30 text-teal-900 hover:text-white hover:bg-teal-500/10 transition-all duration-300"
                        >
                          Go Back
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
            
            {/* Connect Step */}
            {currentStep === 'connect' && (
              <motion.div 
                key="connect"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="p-8 relative z-10"
              >
                <motion.h2 variants={itemVariants} className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                  Connect Your Supabase Project
                </motion.h2>
                
                <div className="space-y-6 max-w-3xl">
                  <motion.div 
                    variants={itemVariants}
                    className="bg-teal-900/20 border border-teal-500/30 rounded-lg p-5 shadow-[0_0_20px_rgba(45,212,191,0.1)]"
                  >
                    <div className="flex items-start">
                      <AlertCircle className="h-6 w-6 text-teal-400 mt-1 mr-3 flex-shrink-0" />
                      <p className="text-teal-200 text-sm">
                        You'll need to authorize Bladex AI to access your Supabase project. We only request the permissions needed to set up your database and won't have access to your existing data.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    variants={itemVariants}
                    className="bg-slate-800/70 border border-teal-500/20 rounded-lg p-6 space-y-6 shadow-[0_0_30px_rgba(45,212,191,0.15)]"
                  >
                    <h3 className="text-xl font-medium text-white">Ready to Connect?</h3>
                    
                    <p className="text-gray-300">
                      When you click the button below, you'll be redirected to Supabase to authorize the connection. After authorization, you'll be redirected back to complete the setup.
                    </p>
                    
                    <div className="pt-4">
                      <Button
                        onClick={handleConnectSupabase}
                        disabled={isLoadingConnect}
                        className="w-full relative bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-6 rounded-lg shadow-[0_0_15px_rgba(45,212,191,0.3)] hover:shadow-[0_0_25px_rgba(45,212,191,0.5)] transition-all duration-300 font-medium text-lg overflow-hidden group"
                      >
                        {isLoadingConnect ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3 relative z-10"></div>
                            <span className="relative z-10">Connecting...</span>
                          </>
                        ) : (
                          <>
                            <span className="relative z-10">Connect to Supabase</span>
                            <ExternalLink className="ml-2 h-5 w-5 relative z-10" />
                          </>
                        )}
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"
                          initial={{ x: "-100%" }}
                          animate={{ x: isLoadingConnect ? "100%" : "-100%" }}
                          transition={{ 
                            repeat: isLoadingConnect ? Infinity : 0, 
                            duration: 1.5, 
                            ease: "linear" 
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-20 transform-gpu -skew-x-30 -translate-x-full group-hover:translate-x-full transition-all duration-700 ease-out"></div>
                      </Button>
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="mt-4 text-center">
                    <Button
                      onClick={() => setCurrentStep('create')}
                      variant="link"
                      className="text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      Go Back
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}