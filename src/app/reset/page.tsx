'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './../../components/ui/button';
import { Trash, ArrowLeft } from 'lucide-react';

export default function ResetPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  const resetLocalStorage = () => {
    // Clear items related to setup flow
    localStorage.removeItem('setup_complete_state');
    localStorage.removeItem('schema_setup_completed');
    localStorage.removeItem('dashboard_flow_state');
    localStorage.removeItem('setup_progress');

    // Keep credential items to avoid re-auth, but clear if needed
    // localStorage.removeItem('supabase_access_token');
    // localStorage.removeItem('supabase_refresh_token');
    // localStorage.removeItem('supabase_project_ref');
    // localStorage.removeItem('supabase_project_name');
    // localStorage.removeItem('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    // localStorage.removeItem('NEXT_PUBLIC_SUPABASE_URL');

    // Set message
    setMessage('Local storage reset successfully! You can now go back and try the setup flow again.');
  };

  const resetEverything = () => {
    // Clear all setup flow items
    localStorage.removeItem('setup_complete_state');
    localStorage.removeItem('schema_setup_completed');
    localStorage.removeItem('dashboard_flow_state');
    localStorage.removeItem('setup_progress');

    // Clear all credential items
    localStorage.removeItem('supabase_access_token');
    localStorage.removeItem('supabase_refresh_token');
    localStorage.removeItem('supabase_project_ref');
    localStorage.removeItem('supabase_project_name');
    localStorage.removeItem('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    localStorage.removeItem('supabase_anon_key');
    localStorage.removeItem('NEXT_PUBLIC_SUPABASE_URL');
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('SUPABASE_SERVICE_ROLE_KEY');
    localStorage.removeItem('admin_token');

    // Set message
    setMessage('Everything reset successfully! You will need to re-authenticate with Supabase.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Setup Flow</h1>
          <p className="text-gray-300">Use these options to reset the setup flow state.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-2">Options:</h2>
            <ul className="text-gray-300 space-y-2">
              <li><strong>Reset Flow Only</strong>: Clears setup progress but keeps credentials</li>
              <li><strong>Reset Everything</strong>: Clears all data including Supabase credentials</li>
            </ul>
          </div>
          
          {message && (
            <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30 text-white">
              {message}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Button
              onClick={resetLocalStorage}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Trash className="mr-2 h-4 w-4" />
              Reset Flow Only
            </Button>
            
            <Button
              onClick={resetEverything}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash className="mr-2 h-4 w-4" />
              Reset Everything
            </Button>
            
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full mt-4 bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 