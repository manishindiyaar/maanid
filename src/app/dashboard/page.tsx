// @/app/dashboard/page.tsx
"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './../../components/ui/button';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardContainer from './../../components/MainComponents/DashboardContainer';
import { useSupabase } from './../../lib/supabase/useSupabase';

export default function DashboardPage() {
  const router = useRouter();
  const { isAdmin } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple initialization - no auth checks
    setIsLoading(false);
  }, []);

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
      }
    } catch (error) {
      console.error('Error during logout:', error);
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

      {/* Main Dashboard Container */}
      <DashboardContainer />
    </div>
  );
}