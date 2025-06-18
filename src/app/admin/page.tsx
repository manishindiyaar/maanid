'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './../../components/ui/button';
import { Input } from './../../components/ui/input'
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import TelegramLoginScreen from '@/components/bots/TelegramLoginScreen';

// Hardcoded admin credentials - in production these should be securely stored
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showTelegramQR, setShowTelegramQR] = useState(false);

  // Check if admin is already logged in
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        console.log('🔍 Checking admin session...');
        setIsCheckingSession(true);
        
        // First check localStorage for admin token
        const adminToken = localStorage.getItem('admin_token');
        
        if (adminToken) {
          console.log('✅ Admin token found in localStorage, verifying with server...');
          
          // Verify token with server to ensure it's still valid
          const response = await fetch('/api/admin/check-session');
          
          if (response.ok) {
            // Both localStorage token and server session are valid
            console.log('✅ Admin session verified by server, redirecting to dashboard');
            router.push('/dashboard');
            return;
          } else {
            // Token in localStorage but server session expired
            console.log('❌ Admin token in localStorage but server session invalid');
            localStorage.removeItem('admin_token');
          }
        } else {
          // No token in localStorage, check server session anyway
          const response = await fetch('/api/admin/check-session');
          
          if (response.ok) {
            // Server session valid but missing localStorage token
            console.log('⚠️ Server session valid but missing localStorage token, setting it');
            localStorage.setItem('admin_token', 'true');
            router.push('/dashboard');
            return;
          } else {
            // No valid session anywhere
            console.log('❌ No valid admin session found, staying on login page');
          }
        }
      } catch (error) {
        console.error('❌ Error checking admin session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkAdminSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Client-side validation first
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        console.log('✅ Client-side credentials validated');
        
        // Instead of making the API call, show the Telegram QR screen
        setShowTelegramQR(true);
        
        // For demo purposes, store the admin token in localStorage
        localStorage.setItem('admin_token', 'demo-token');
        
      } else {
        setError('Invalid credentials');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle skip button click in Telegram QR screen
  const handleSkipTelegram = () => {
    toast.success('Successfully logged in as admin');
    router.push('/dashboard');
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Show Telegram QR screen if login was successful
  if (showTelegramQR) {
    return <TelegramLoginScreen onSkip={handleSkipTelegram} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 space-y-8 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-gray-300">Enter your admin credentials</p>
          <p className="text-yellow-300 mt-2 text-sm">For judges: Use the credentials displayed below each field</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              required
            />
            <p className="text-blue-400 text-xs">Email: {ADMIN_EMAIL}</p>
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              required
            />
            <p className="text-blue-400 text-xs">Password: {ADMIN_PASSWORD}</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-gray-900 hover:bg-gray-100"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
          
          <Button
            type="button"
            onClick={() => router.push('/signin')}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-white/5"
          >
            Back to User Login
          </Button>
        </form>
      </motion.div>
    </div>
  );
} 