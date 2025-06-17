'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from './../../lib/auth/AuthContext';

// Client component that uses window.location
function LoadingContent() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [loadingMessage, setLoadingMessage] = useState('Loading');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [destination, setDestination] = useState('/dashboard');
  const [reason, setReason] = useState('authentication');

  // Use window.location instead of useSearchParams for SSG compatibility
  useEffect(() => {
    // Parse URL params when component mounts (client-side only)
    const url = new URL(window.location.href);
    const dest = url.searchParams.get('to') || '/dashboard';
    const loadReason = url.searchParams.get('reason') || 'authentication';
    setDestination(dest);
    setReason(loadReason);

    // Set appropriate loading message based on reason
    switch (loadReason) {
      case 'auth':
        setLoadingMessage('Authenticating');
        break;
      case 'setup':
        setLoadingMessage('Connecting');
        break;
      case 'dashboard':
        setLoadingMessage('Loading');
        break;
      default:
        setLoadingMessage('Redirecting');
    }

    // Setup timer to track elapsed time
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Ensure user session is properly stored
    if (session && user) {
      console.log('🔐 User authenticated, setting credentials flag');
      // Set the flag in localStorage to indicate we have valid credentials
      localStorage.setItem('has_supabase_credentials', 'true');
      
      // Get the original domain used for auth if available
      const authDomain = sessionStorage.getItem('auth_redirect_domain');
      
      // Ensure domain consistency by using empty domain
      const isSecure = window.location.protocol === 'https:';
      const secureFlagAttr = isSecure ? '; Secure' : '';
      document.cookie = `has_supabase_credentials=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secureFlagAttr}; domain=`;
      
      // If we have an auth domain stored and it doesn't match current, we'll do a redirect
      const currentHost = window.location.host.replace('www.', '');
      if (authDomain && authDomain !== currentHost) {
        console.log(`🔄 Domain change detected from ${authDomain} to ${currentHost}, fixing...`);
        // Will redirect to the original domain used for auth
        setTimeout(() => {
          const protocol = window.location.protocol;
          window.location.href = `${protocol}//${authDomain}${window.location.pathname}${window.location.search}`;
        }, 500);
      }
    }

    // Set a timeout to redirect to the destination
    const redirectTimeout = setTimeout(() => {
      // Check if we're on https for secure cookie flag
      const isSecure = window.location.protocol === 'https:';
      const secureFlagAttr = isSecure ? '; Secure' : '';
      
      // Clear auth_in_progress flag before redirecting to prevent loops
      document.cookie = `auth_in_progress=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      localStorage.removeItem('auth_in_progress');
      
      // Ensure any pending redirect is cleared
      document.cookie = `pending_redirect=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      
      // Clear auth attempt flags
      document.cookie = `auth_attempt=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      document.cookie = `auth_attempt_timestamp=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      
      // Do the redirect
      router.push(dest);
    }, 2000); // 2 second minimum loading time for smooth transition

    // Handle any errors - if we've been waiting too long, force redirect
    const errorTimeout = setTimeout(() => {
      // Check if we're on https for secure cookie flag
      const isSecure = window.location.protocol === 'https:';
      const secureFlagAttr = isSecure ? '; Secure' : '';
      
      // Clear auth flags the same way
      document.cookie = `auth_in_progress=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      localStorage.removeItem('auth_in_progress');
      document.cookie = `pending_redirect=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      document.cookie = `auth_attempt=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      document.cookie = `auth_attempt_timestamp=; path=/; max-age=0; SameSite=Lax${secureFlagAttr}`;
      
      router.push(dest);
    }, 6000); // 6 seconds max before forcing redirect

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimeout);
      clearTimeout(errorTimeout);
    };
  }, [router, session, user]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <motion.div
        animate={{ 
          boxShadow: ["0 0 10px #2dd4bf", "0 0 20px #2dd4bf", "0 0 10px #2dd4bf"] 
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="p-4 rounded-full bg-gray-900 text-teal-400"
      >
        <Loader2 className="w-12 h-12 animate-spin" />
      </motion.div>
      
      <div className="text-center">
        <motion.h2 
          className="text-xl font-extralight tracking-widest text-teal-400 uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {loadingMessage}
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ...
          </motion.span>
        </motion.h2>
        
        {elapsedTime > 5 && (
          <p className="text-xs font-thin tracking-wider text-gray-400 mt-2">Taking longer than expected</p>
        )}
      </div>
    </div>
  );
}

// Static shell component
export default function LoadingPage() {
  return (
    <>
      {/* Import Google Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@100;200;300&display=swap');
        
        body {
          font-family: 'Jost', sans-serif;
        }
      `}</style>
      
      <div className="h-screen w-full flex items-center justify-center bg-gray-950 font-['Jost']">
        <div 
          className="relative rounded-lg p-8"
          style={{
            boxShadow: "0 0 15px rgba(45, 212, 191, 0.3)",
            background: "radial-gradient(circle at center, #111827, #030712)"
          }}
        >
          <LoadingContent />
        </div>
      </div>
    </>
  );
}