// @/app/dashboard/page.tsx
"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './../../components/ui/button';
import { LogOut, CheckCircle } from 'lucide-react'; // Added CheckCircle for animation
import { motion, AnimatePresence } from 'framer-motion';
import DashboardContainer from './../../components/MainComponents/DashboardContainer';
import SupaSetup from './../../components/SupaSetup'; 
import { useSupabase } from './../../lib/supabase/useSupabase';

// Define the Step types shared between page.tsx and SupaSetup.tsx
type FlowStep =
  | 'loading'
  | 'connected'         // Handled by SupaSetup
  | 'schema-setup'      // Handled by SupaSetup
  | 'verification'      // Handled by SupaSetup
  | 'verified'          // Handled by SupaSetup
  | 'complete'          // Intermediate state after SupaSetup finishes
  | 'final-animation'   // Added step for the final success animation
  | 'dashboard';        // Final state showing the dashboard

// Define the structure for saved flow state
interface SavedFlowState {
    currentStep: FlowStep;
    verificationStatus?: 'idle' | 'checking' | 'success' | 'failed';
    showConnectionSuccess?: boolean;
    showSchemaInstructions?: boolean;
    showSuccessAnimation?: boolean;
    showFinalSuccess?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAdmin } = useSupabase(); // Removed supabase, isUsingUserCredentials as they seem unused here now
  const [projectInfo, setProjectInfo] = useState<{
    ref: string | null;
    schemaApplied: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Overall flow step management
  const [currentStep, setCurrentStep] = useState<FlowStep>('loading');
  // State to hold the restored flow state for SupaSetup
  const [restoredFlowState, setRestoredFlowState] = useState<SavedFlowState | null>(null);

  // State for final success animation
  const [showFinalAnimation, setShowFinalAnimation] = useState(false);

  // Removed animation state controls as they are now managed within SupaSetup
  // Removed copiedToClipboard, timeoutRef as they are managed within SupaSetup
  // Removed verificationStatus as it's managed within SupaSetup (via restoredFlowState)

  // Check credentials and determine initial step
  useEffect(() => {
    const checkCredentialsAndState = () => {
      try {
        // Get all relevant state from localStorage and cookies
        const projectRef = localStorage.getItem('supabase_project_ref');
        const accessToken = localStorage.getItem('supabase_access_token');
        const supabaseUrl = localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || localStorage.getItem('supabase_url');
        const anonKey = localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key');
        const schemaSetupCompleted = localStorage.getItem('schema_setup_completed') === 'true';
        const schemaSetupInProgress = localStorage.getItem('schema_setup_in_progress') === 'true';
        const adminToken = localStorage.getItem('admin_token');
        const adminMode = document.cookie.includes('admin_mode=true');
        const adminSession = document.cookie.includes('admin_session=true');

        // Determine if user is in admin mode
        const isAdminUser = adminToken || adminMode || adminSession;

        console.log('Dashboard initial check:');
        console.log('Project Ref:', projectRef);
        console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Not present');
        console.log('Anon Key:', anonKey ? 'Present' : 'Not present');
        console.log('Schema setup completed:', schemaSetupCompleted);
        console.log('Schema setup in progress:', schemaSetupInProgress);
        console.log('Admin mode:', isAdminUser ? 'Yes' : 'No');

        // Redirect if not admin and missing basic Supabase connection details
        if (!isAdminUser && (!projectRef || !accessToken || !supabaseUrl || !anonKey)) {
          console.log('Missing essential credentials and not admin, redirecting to setup');
          router.push('/setup');
          return;
        }

        // Admin user, allow access even without Supabase setup
        if (isAdminUser) {
          console.log('Admin user detected, showing dashboard');
          setProjectInfo({ ref: projectRef, schemaApplied: schemaSetupCompleted });
          setCurrentStep('dashboard');
          setIsLoading(false);
          return;
        }

        // Regular user or admin with Supabase details
        setProjectInfo({ ref: projectRef, schemaApplied: schemaSetupCompleted });
        setIsLoading(false);

        // --- Determine the correct step ---

        // 1. If schema is already completed, go straight to dashboard
        if (schemaSetupCompleted) {
          console.log('Schema already completed, setting step to dashboard');
          setCurrentStep('dashboard');
          localStorage.removeItem('dashboard_flow_state'); // Clean up any old state
          return;
        }

        // 2. Check for saved flow state in localStorage
        const savedStateRaw = localStorage.getItem('dashboard_flow_state');
        if (savedStateRaw) {
          try {
            const state: SavedFlowState = JSON.parse(savedStateRaw);
            console.log('Found saved flow state:', state.currentStep);

            // Validate the saved step - ensure it's part of the setup flow
            const validSetupSteps: FlowStep[] = ['connected', 'schema-setup', 'verification', 'verified'];
            if (validSetupSteps.includes(state.currentStep)) {
                console.log('Restoring flow state:', state);
                setRestoredFlowState(state); // Pass the full state to SupaSetup
                setCurrentStep(state.currentStep); // Set the current step for SupaSetup initialization
                return; // State restored, SupaSetup will handle rendering
            } else {
                console.log('Invalid saved step found, clearing state.');
                localStorage.removeItem('dashboard_flow_state');
            }
          } catch (err) {
            console.error('Error parsing saved flow state:', err);
            localStorage.removeItem('dashboard_flow_state'); // Clear invalid state
          }
        }

        // 3. If setup was marked as 'in progress' but no valid saved state, restart flow
        if (schemaSetupInProgress) {
          console.log('Schema setup marked "in progress", starting flow from connected');
          setCurrentStep('connected');
          // Don't set restoredFlowState, SupaSetup will start fresh
          return;
        }

        // 4. Default: If no completion, no saved state, no 'in progress', start fresh
        console.log('No prior state found, starting setup flow from connected');
        setCurrentStep('connected');
        // Mark as in progress
        localStorage.setItem('schema_setup_in_progress', 'true');
        document.cookie = `schema_setup_in_progress=true; path=/; max-age=${60 * 60}; SameSite=Lax`; // Mark for 1 hour


      } catch (error) {
        console.error('Error checking credentials/state:', error);
        router.push('/setup'); // Fallback redirect
      }
    };

    checkCredentialsAndState();
  }, [router]); // Only run on initial mount

  // Callback for SupaSetup to signal completion
  const handleSetupComplete = () => {
    console.log('Setup complete signal received from SupaSetup');
    setProjectInfo(prev => prev ? { ...prev, schemaApplied: true } : { ref: localStorage.getItem('supabase_project_ref'), schemaApplied: true });
    setCurrentStep('final-animation');
    setShowFinalAnimation(true);
    // SupaSetup handles clearing some localStorage state before calling this
  };

  const handleContinueToDashboard = () => {
    // Clear remaining setup flow state
    localStorage.removeItem('dashboard_flow_state');
    localStorage.removeItem('schema_setup_in_progress');
    document.cookie = 'schema_setup_in_progress=false; path=/; max-age=0; SameSite=Lax';

    // Hide the animation and show dashboard
    setShowFinalAnimation(false);
    setCurrentStep('dashboard');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        localStorage.removeItem('admin_token');
        // Clear potential Supabase details if logging out as admin
        localStorage.removeItem('supabase_project_ref');
        localStorage.removeItem('NEXT_PUBLIC_SUPABASE_URL');
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        localStorage.removeItem('supabase_anon_key');
        localStorage.removeItem('SUPABASE_SERVICE_ROLE_KEY');
        localStorage.removeItem('supabase_access_token');
        localStorage.removeItem('supabase_project_name');
        localStorage.removeItem('schema_setup_completed');
        localStorage.removeItem('schema_setup_in_progress');
        localStorage.removeItem('dashboard_flow_state');
        document.cookie = `schema_setup_completed=false; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `schema_setup_in_progress=false; path=/; max-age=0; SameSite=Lax`;
        router.push('/');
      } else {
        console.error('Failed to logout');
        // Optionally show an error toast
      }
    } catch (error) {
      console.error('Error during logout:', error);
       // Optionally show an error toast
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative">
      {/* Admin Logout Button - Always visible in bottom left when admin is logged in */}
      {isAdmin && (
        <motion.div
          className="fixed bottom-4 left-4 z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-red-900/50 hover:bg-red-800 text-white border-red-800"
            title="Admin Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      {/* Conditional Rendering: Show SupaSetup or DashboardContainer */}
      {currentStep !== 'dashboard' && currentStep !== 'loading' && currentStep !== 'final-animation' && (
        <SupaSetup
          key={currentStep} // Force re-render if initial step changes due to restoration logic
          onSetupComplete={handleSetupComplete}
          initialProjectRef={projectInfo?.ref ?? null}
          initialStep={currentStep as any} // Cast because filtered steps are excluded
        />
      )}

      {/* Final Success Animation */}
      <AnimatePresence>
        {showFinalAnimation && currentStep === 'final-animation' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full mx-4 p-12 bg-gradient-to-br from-purple-800 via-indigo-900 to-blue-900 rounded-2xl shadow-2xl text-center border border-white/10"
            >
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 15,
                  delay: 0.3
                }}
                className="mx-auto w-36 h-36 bg-gradient-to-br from-white to-blue-100 rounded-full flex items-center justify-center mb-10 shadow-xl"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 360],
                  }}
                  transition={{
                    scale: { duration: 2, repeat: Infinity, repeatType: "reverse" },
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                  }}
                >
                  <CheckCircle className="h-24 w-24 text-green-600" />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-4xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-indigo-100 to-blue-200"
              >
                Setup Complete!
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-xl text-indigo-100 mb-10"
              >
                You're all set to use the dashboard.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8"
              >
                <Button
                  onClick={handleContinueToDashboard}
                  className="px-8 py-3 bg-white text-indigo-700 hover:bg-white/90 font-medium rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  Continue to Dashboard
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Container - Show only when in dashboard step */}
      {currentStep === 'dashboard' && (
        <DashboardContainer />
      )}

      {/* Removed all the setup flow JSX (animations, verification UI) as it's now in SupaSetup */}

    </div>
  );
}