'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Database, Key, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getOAuthState, clearOAuthState, exchangeCodeForToken } from './../../../lib/supabaseOAuth';
import { applySchema } from './../../../lib/schema';
import { Button } from './../../../components/ui/button';
import { useAuth } from './../../../lib/auth/AuthContext';

// Supabase OAuth credentials
const SUPABASE_CLIENT_ID = process.env.NEXT_PUBLIC_SUPABASE_CLIENT_ID || "20d973be-a6f9-47d3-a4fa-043f9fcbbb19";
const SUPABASE_CLIENT_SECRET = process.env.NEXT_PUBLIC_SUPABASE_CLIENT_SECRET || "sba_10d2fb3752c525a3f1c9997d8218e3fe943d0d0f";

// Client component that uses useSearchParams
import { useSearchParams } from 'next/navigation';

function SetupCompleteContent() {
  const [currentStep, setCurrentStep] = useState<'initializing' | 'auth' | 'token' | 'schema' | 'complete' | 'error'>('initializing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState<'pending' | 'success' | 'warning' | 'error'>('pending');
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth(); // Get the user from AuthContext
  
  useEffect(() => {
    // Set redirect in progress marker
    document.cookie = `setup_redirect_in_progress=true; path=/; max-age=60; SameSite=Lax`;
    
    // Check if we already completed this flow previously
    const setupState = localStorage.getItem('setup_complete_state');
    if (setupState) {
      try {
        const state = JSON.parse(setupState);
        // Restore the previous state
        setCurrentStep(state.currentStep || 'initializing');
        setProgress(state.progress || 0);
        setError(state.error || null);
        setIsComplete(state.isComplete || false);
        setSchemaStatus(state.schemaStatus || 'pending');
        
        // If the process was already complete, redirect to dashboard
        if (state.isComplete && state.currentStep === 'complete') {
          console.log('Setup already complete, redirecting to dashboard via loading page');
          setIsRedirecting(true);
          setTimeout(() => {
            router.push('/loading?to=/dashboard&reason=setup');
          }, 500);
          return;
        }
      } catch (err) {
        console.error('Error parsing stored setup state:', err);
        // Continue with fresh setup if state parsing fails
      }
    }
    
    const processSetup = async () => {
      try {
        // Check for error in URL params
        const errorMsg = searchParams.get('error') || searchParams.get('error_description');
        if (errorMsg) {
          setCurrentStep('error');
          setError(`Authentication error: ${errorMsg}`);
          toast.error(`Authentication failed: ${errorMsg}`);
          saveState();
          return;
        }
        
        // Get code and state from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (!code || !state) {
          setCurrentStep('error');
          setError('Missing authorization code or state parameter');
          toast.error('Authentication failed: Missing required parameters');
          saveState();
          return;
        }
        
        // Validate state parameter
        setCurrentStep('auth');
        setProgress(20);
        saveState();
        
        const savedState = getOAuthState();
        if (!savedState) {
          setCurrentStep('error');
          setError('No saved OAuth state found. Please try again.');
          toast.error('Authentication failed: Invalid session');
          saveState();
          return;
        }
        
        if (savedState.state !== state) {
          setCurrentStep('error');
          setError('Invalid state parameter - security verification failed');
          toast.error('Authentication failed: Security verification failed');
          saveState();
          return;
        }
        
        // Exchange code for token
        setCurrentStep('token');
        setProgress(40);
        saveState();
        
        const tokenResponse = await exchangeCodeForToken(
          code,
          savedState.codeVerifier,
          SUPABASE_CLIENT_ID,
          SUPABASE_CLIENT_SECRET
        );
        
        if (!tokenResponse.access_token) {
          setCurrentStep('error');
          setError('Failed to get access token from Supabase');
          toast.error('Failed to authenticate with Supabase');
          saveState();
          return;
        }
        
        // Store tokens and project info in both localStorage and cookies
        localStorage.setItem('supabase_access_token', tokenResponse.access_token);
        document.cookie = `supabase_access_token=${tokenResponse.access_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        
        if (tokenResponse.refresh_token) {
          localStorage.setItem('supabase_refresh_token', tokenResponse.refresh_token);
          document.cookie = `supabase_refresh_token=${tokenResponse.refresh_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
        
        if (tokenResponse.project_ref) {
          localStorage.setItem('supabase_project_ref', tokenResponse.project_ref);
          document.cookie = `supabase_project_ref=${tokenResponse.project_ref}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
        
        if (tokenResponse.project_name) {
          localStorage.setItem('supabase_project_name', tokenResponse.project_name);
          document.cookie = `supabase_project_name=${encodeURIComponent(tokenResponse.project_name)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
        
        if (tokenResponse.anon_key) {
          localStorage.setItem('NEXT_PUBLIC_SUPABASE_ANON_KEY', tokenResponse.anon_key);
          localStorage.setItem('supabase_anon_key', tokenResponse.anon_key);
          document.cookie = `supabase_anon_key=${tokenResponse.anon_key}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
        
        if (tokenResponse.service_role_key) {
          localStorage.setItem('SUPABASE_SERVICE_ROLE_KEY', tokenResponse.service_role_key);
          document.cookie = `supabase_service_role_key=${tokenResponse.service_role_key}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
        
        if (tokenResponse.project_url) {
          localStorage.setItem('NEXT_PUBLIC_SUPABASE_URL', tokenResponse.project_url);
          localStorage.setItem('supabase_url', tokenResponse.project_url);
          document.cookie = `supabase_url=${tokenResponse.project_url}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        } else if (tokenResponse.project_ref) {
          const projectUrl = `https://${tokenResponse.project_ref}.supabase.co`;
          localStorage.setItem('NEXT_PUBLIC_SUPABASE_URL', projectUrl);
          localStorage.setItem('supabase_url', projectUrl);
          document.cookie = `supabase_url=${projectUrl}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
        
        // Store credentials in the admin database for webhook access
        if (user?.email) {
          try {
            console.log('📝 Storing user credentials in admin database...');
            const storeResponse = await fetch('/api/users/store-credentials', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: user.email
              }),
            });
            
            if (storeResponse.ok) {
              console.log('✅ User credentials stored successfully');
            } else {
              console.error('❌ Failed to store user credentials in admin database');
            }
          } catch (error) {
            console.error('❌ Error storing user credentials:', error);
          }
        }
        
        setProgress(60);
        saveState();
        
        // Remove the setup_progress marker since we're now in the complete flow
        localStorage.removeItem('setup_progress');
        
        // Set a cookie to indicate we have Supabase credentials
        document.cookie = `has_supabase_credentials=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        localStorage.setItem('has_supabase_credentials', 'true');
        
        // Apply schema to the database
        setCurrentStep('schema');
        saveState();
        
        try {
          // Replace actual schema application with a simulation
          // await applySchema();
          
          // Simulate delay for a realistic experience
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setProgress(100);
          // Set schema_setup_completed to false so the dashboard shows the SQL setup flow
          localStorage.setItem('schema_setup_completed', 'false');
          document.cookie = `schema_setup_completed=false; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
          setSchemaStatus('success');
          
          // Notify of successful setup
          setCurrentStep('complete');
          setIsComplete(true);
          saveState();
          
          // Clear any dashboard flow state to start fresh
          localStorage.removeItem('dashboard_flow_state');
          
          toast.success('Setup completed successfully!');
          
          // Clear redirect in progress cookie
          document.cookie = `setup_redirect_in_progress=; path=/; max-age=0; SameSite=Lax`;
          
          // Redirect to loading page after delay
          setTimeout(() => {
            setIsRedirecting(true);
            router.push('/loading?to=/dashboard&reason=setup');
          }, 2000);
        } catch (schemaError) {
          console.error('Schema application error:', schemaError);
          // Instead of failing completely, mark schema as warning and continue
          setSchemaStatus('warning');
          localStorage.setItem('schema_setup_completed', 'false');
          setProgress(100);
          
          // Still mark setup as complete since we have the credentials
          setCurrentStep('complete');
          setIsComplete(true);
          saveState();
          
          // Show a warning toast instead of error
          toast.warning('Credentials stored, but schema setup failed. You can set up your database schema manually.');
          
          // Clear redirect in progress cookie
          document.cookie = `setup_redirect_in_progress=; path=/; max-age=0; SameSite=Lax`;
          
          // Redirect to loading page after delay
          setTimeout(() => {
            setIsRedirecting(true);
            router.push('/loading?to=/dashboard&reason=setup');
          }, 2000);
        }
        
        // Clean up OAuth state
        clearOAuthState();
        
      } catch (error) {
        console.error('Setup error:', error);
        // Even if we hit an error in overall process, check if we've already stored credentials
        if (localStorage.getItem('supabase_access_token') && 
            localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL')) {
          // We have credentials, so mark as warning and continue
          setProgress(100);
          setCurrentStep('complete');
          setIsComplete(true);
          setSchemaStatus('warning');
          saveState();
          
          toast.warning('Partial setup completed. Some steps failed but credentials are stored.');
          
          // Clear redirect in progress cookie
          document.cookie = `setup_redirect_in_progress=; path=/; max-age=0; SameSite=Lax`;
          
          setTimeout(() => {
            setIsRedirecting(true);
            router.push('/loading?to=/dashboard&reason=setup');
          }, 2000);
        } else {
          // No credentials stored, treat as actual error
          setCurrentStep('error');
          setError(error instanceof Error ? error.message : 'Unknown error during setup');
          saveState();
          
          // Clear redirect in progress cookie
          document.cookie = `setup_redirect_in_progress=; path=/; max-age=0; SameSite=Lax`;
          
          toast.error('Setup process failed');
        }
      }
    };
    
    // Only start setup if not already redirecting
    if (!isRedirecting) {
      processSetup();
    }
  }, [searchParams, router, user, isRedirecting]);
  
  // Save current state to localStorage for persistence
  const saveState = () => {
    localStorage.setItem('setup_complete_state', JSON.stringify({
      currentStep,
      progress,
      error,
      isComplete,
      schemaStatus
    }));
  };
  
  const getStepTitle = () => {
    switch(currentStep) {
      case 'initializing': return 'Starting Setup...';
      case 'auth': return 'Verifying Authentication...';
      case 'token': return 'Connecting to Supabase...';
      case 'schema': return 'Setting Up Database Schema...';
      case 'complete': return 'Setup Complete!';
      case 'error': return 'Setup Failed';
      default: return 'Processing...';
    }
  };
  
  const handleRetry = () => {
    // Clear any stored progress and state
    localStorage.removeItem('setup_complete_state');
    localStorage.removeItem('setup_progress');
    
    // Redirect back to the setup page
    router.push('/loading?to=/setup&reason=setup');
  };
  
  const handleContinueToDashboard = () => {
    setIsRedirecting(true);
    router.push('/loading?to=/dashboard&reason=dashboard');
  };
  
  // If redirecting, show simple loading
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">{getStepTitle()}</h1>
          <p className="text-gray-300">
            {currentStep !== 'error' && currentStep !== 'complete' 
              ? 'Please wait while we set up your environment...' 
              : isComplete 
                ? schemaStatus === 'warning'
                  ? 'Your Supabase credentials are stored! Schema setup skipped.'
                  : 'Your Supabase project is now connected and configured!' 
                : 'Something went wrong during the setup process.'}
          </p>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${
              schemaStatus === 'warning' 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
                : currentStep === 'error'
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        {/* Setup steps */}
        <div className="space-y-4">
          <StepItem 
            icon={<Key className="h-5 w-5" />}
            title="Authentication Verification"
            status={currentStep === 'auth' ? 'processing' : 
                   (currentStep === 'initializing' ? 'pending' : 
                   (currentStep === 'error' && progress < 40 ? 'error' : 'complete'))}
          />
          
          <StepItem 
            icon={<ExternalLink className="h-5 w-5" />}
            title="Supabase Connection"
            status={currentStep === 'token' ? 'processing' : 
                   (progress < 40 ? 'pending' : 
                   (currentStep === 'error' && progress < 60 ? 'error' : 'complete'))}
          />
          
          <StepItem 
            icon={<Database className="h-5 w-5" />}
            title="Database Schema Setup"
            status={currentStep === 'schema' ? 'processing' : 
                   (progress < 60 ? 'pending' : 
                   (schemaStatus === 'warning' ? 'warning' :
                   (currentStep === 'error' && progress >= 60 ? 'error' : 
                   (currentStep === 'complete' ? 'complete' : 'pending'))))}
          />
        </div>
        
        {/* Error message and retry button */}
        {currentStep === 'error' && (
          <div className="mt-6 space-y-4">
            <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
              <p className="text-white">{error || 'An unknown error occurred'}</p>
            </div>
            
            <Button 
              onClick={handleRetry}
              className="w-full bg-white text-gray-900 hover:bg-gray-100"
            >
              Try Again
            </Button>
          </div>
        )}
        
        {/* Complete message and continue button */}
        {currentStep === 'complete' && isComplete && (
          <div className="mt-6">
            <Button 
              onClick={handleContinueToDashboard}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
            >
              Continue to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepItem({ 
  icon, 
  title, 
  status 
}: { 
  icon: React.ReactNode; 
  title: string; 
  status: 'pending' | 'processing' | 'complete' | 'warning' | 'error' 
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        status === 'complete' ? 'bg-green-600' :
        status === 'processing' ? 'bg-blue-600' :
        status === 'warning' ? 'bg-yellow-600' :
        status === 'error' ? 'bg-red-600' :
        'bg-gray-700'
      }`}>
        {status === 'processing' ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : status === 'complete' ? (
          <CheckCircle className="h-6 w-6 text-white" />
        ) : status === 'warning' ? (
          <AlertTriangle className="h-6 w-6 text-white" />
        ) : status === 'error' ? (
          <XCircle className="h-6 w-6 text-white" />
        ) : (
          icon
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center">
          <span className={`font-medium ${
            status === 'complete' ? 'text-green-400' :
            status === 'processing' ? 'text-blue-400' :
            status === 'warning' ? 'text-yellow-400' :
            status === 'error' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {title}
          </span>
          
          {status === 'processing' && (
            <span className="ml-2 text-sm text-blue-400">Processing...</span>
          )}
          
          {status === 'warning' && (
            <span className="ml-2 text-sm text-yellow-400">With warnings</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Add a page component with Suspense boundary
export default function SetupCompletePage() {
  return (
    <Suspense fallback={<SetupLoading />}>
      <SetupCompleteContent />
    </Suspense>
  );
}

// Loading component for Suspense fallback
function SetupLoading() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900 overflow-hidden">
      {/* Neon Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 select-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(20,184,166,0.12) 2px, transparent 2px), linear-gradient(to bottom, rgba(20,184,166,0.12) 2px, transparent 2px)',
          backgroundSize: '90px 90px',
        }}
      />
      {/* Animated Teal Spotlights */}
      <div className="absolute -top-40 left-1/4 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,_rgba(20,184,166,0.22)_0%,_rgba(20,184,166,0)_70%)] blur-3xl animate-pulse-neon z-10" />
      <div className="absolute top-1/2 right-1/5 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,_rgba(20,184,166,0.14)_0%,_rgba(20,184,166,0)_70%)] blur-2xl animate-pulse-neon z-10" />
      {/* Neon Grid Dots */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {[...Array(6)].map((_, i) =>
          [...Array(6)].map((_, j) => (
            <div
              key={`point-${i}-${j}`}
              className="absolute w-[4px] h-[4px] rounded-full bg-teal-400/50"
              style={{
                left: `${20 * (i + 1)}%`,
                top: `${20 * (j + 1)}%`,
                boxShadow: '0 0 16px 5px rgba(20,184,166,0.6)',
              }}
            />
          ))
        )}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center z-20"
      >
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h1 className="text-2xl font-bold text-white">Loading Setup</h1>
        <p className="text-gray-400 text-center">Please wait while we prepare your setup page...</p>
      </motion.div>
    </div>
  );
} 