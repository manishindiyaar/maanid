'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './../../components/ui/button';
import { Database, Trash2, RefreshCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClearPage() {
  const router = useRouter();
  const [clearStatus, setClearStatus] = useState<{
    [key: string]: 'pending' | 'success' | 'failed';
  }>({
    localStorage: 'pending',
    cookies: 'pending',
    redirect: 'pending'
  });
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [clearComplete, setClearComplete] = useState(false);

  const addToConsole = (message: string) => {
    setConsoleOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Get all storage items for display
  const [storageItems, setStorageItems] = useState<{
    localStorage: { key: string; value: string }[];
    cookies: { key: string; value: string }[];
  }>({
    localStorage: [],
    cookies: []
  });

  useEffect(() => {
    updateStorageDisplay();
  }, []);

  const updateStorageDisplay = () => {
    // Get localStorage items
    const localStorageItems = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        let value = localStorage.getItem(key) || '';
        // Truncate long values
        if (value && value.length > 50) {
          value = value.substring(0, 50) + '...';
        }
        localStorageItems.push({ key, value });
      }
    }

    // Get cookies
    const cookieItems = document.cookie.split(';')
      .map(cookie => {
        const [key, value] = cookie.trim().split('=');
        return { key, value: value || '' };
      })
      .filter(item => item.key);

    setStorageItems({
      localStorage: localStorageItems,
      cookies: cookieItems
    });
  };

  const clearLocalStorage = () => {
    addToConsole('Clearing localStorage...');
    try {
      // List what we're about to clear
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items.push(key);
        }
      }
      
      if (items.length > 0) {
        addToConsole(`Found ${items.length} localStorage items: ${items.join(', ')}`);
      } else {
        addToConsole('No localStorage items found');
      }
      
      // Clear all localStorage
      localStorage.clear();
      addToConsole('✓ localStorage cleared successfully');
      setClearStatus(prev => ({ ...prev, localStorage: 'success' }));
      return true;
    } catch (error) {
      addToConsole(`✗ Error clearing localStorage: ${error}`);
      setClearStatus(prev => ({ ...prev, localStorage: 'failed' }));
      return false;
    }
  };

  const clearCookies = () => {
    addToConsole('Clearing cookies...');
    try {
      // Get all cookies
      const cookies = document.cookie.split(';');
      
      if (cookies.length > 0 && cookies[0] !== '') {
        addToConsole(`Found ${cookies.length} cookies`);
        
        // List all cookies
        cookies.forEach(cookie => {
          const cookieName = cookie.trim().split('=')[0];
          addToConsole(`→ Clearing cookie: ${cookieName}`);
        });
        
        // Clear each cookie by setting expiration to past date
        cookies.forEach(cookie => {
          const cookieName = cookie.trim().split('=')[0];
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
      } else {
        addToConsole('No cookies found');
      }
      
      // Also try to clear specific known cookies
      const knownCookies = [
        'supabase-auth-token',
        'admin_session',
        'admin_token',
        'has_supabase_credentials',
        'supabase_url',
        'supabase_anon_key',
        'supabase_project_ref',
        'supabase_access_token',
        'schema_setup_completed',
        'schema_setup_in_progress'
      ];
      
      knownCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      
      addToConsole('✓ Cookies cleared successfully');
      setClearStatus(prev => ({ ...prev, cookies: 'success' }));
      return true;
    } catch (error) {
      addToConsole(`✗ Error clearing cookies: ${error}`);
      setClearStatus(prev => ({ ...prev, cookies: 'failed' }));
      return false;
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    addToConsole('=== Starting clear operation ===');
    
    // Clear localStorage
    const localStorageSuccess = clearLocalStorage();
    
    // Clear cookies
    const cookiesSuccess = clearCookies();
    
    // Clear session storage
    try {
      sessionStorage.clear();
      addToConsole('✓ Session storage cleared');
    } catch (error) {
      addToConsole(`✗ Error clearing session storage: ${error}`);
    }
    
    // Update display to show what's left
    updateStorageDisplay();
    
    // Finalize and prepare for redirect
    if (localStorageSuccess && cookiesSuccess) {
      addToConsole('All data cleared successfully!');
      setClearComplete(true);
      
      // Add a slight delay before redirect
      addToConsole('Redirecting to home page in 3 seconds...');
      setTimeout(() => {
        setClearStatus(prev => ({ ...prev, redirect: 'success' }));
        addToConsole('✓ Redirecting now');
        router.push('/');
      }, 3000);
    } else {
      addToConsole('❗ Some operations failed. You may need to try again or clear manually.');
      setIsClearing(false);
      setClearStatus(prev => ({ ...prev, redirect: 'failed' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">Clear All Session Data</h1>
          <p className="text-gray-400">
            Use this page to clean up all application state for testing purposes
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current State Panel */}
          <motion.div 
            className="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="mr-2 h-5 w-5 text-blue-400" />
              Current Storage State
            </h2>
            
            <div className="space-y-6">
              {/* localStorage items */}
              <div>
                <h3 className="text-md font-medium mb-2 text-blue-300">localStorage Items ({storageItems.localStorage.length})</h3>
                <div className="bg-gray-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {storageItems.localStorage.length > 0 ? (
                    <div className="space-y-2">
                      {storageItems.localStorage.map((item, index) => (
                        <div key={index} className="border-b border-gray-700 pb-2">
                          <div className="font-mono text-sm text-emerald-400">{item.key}</div>
                          <div className="font-mono text-xs text-gray-400 break-all">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No localStorage items found</p>
                  )}
                </div>
              </div>
              
              {/* Cookies */}
              <div>
                <h3 className="text-md font-medium mb-2 text-blue-300">Cookies ({storageItems.cookies.length})</h3>
                <div className="bg-gray-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {storageItems.cookies.length > 0 ? (
                    <div className="space-y-2">
                      {storageItems.cookies.map((item, index) => (
                        <div key={index} className="border-b border-gray-700 pb-2">
                          <div className="font-mono text-sm text-purple-400">{item.key}</div>
                          <div className="font-mono text-xs text-gray-400">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No cookies found</p>
                  )}
                </div>
              </div>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={updateStorageDisplay}
                className="w-full border-gray-600 hover:bg-gray-700"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          </motion.div>
          
          {/* Console Output */}
          <motion.div 
            className="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <RefreshCcw className="mr-2 h-5 w-5 text-green-400" />
              Operation Console
            </h2>
            
            <div className="bg-black/40 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {consoleOutput.length > 0 ? (
                <div className="space-y-1">
                  {consoleOutput.map((line, index) => (
                    <div key={index} className="text-gray-300">
                      {line.includes('✓') ? (
                        <span className="text-green-400">{line}</span>
                      ) : line.includes('✗') || line.includes('❗') ? (
                        <span className="text-red-400">{line}</span>
                      ) : line.includes('→') ? (
                        <span className="text-blue-400">{line}</span>
                      ) : line.includes('===') ? (
                        <span className="text-yellow-400 font-bold">{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Console output will appear here</p>
              )}
            </div>
            
            <div className="mt-6 space-y-4">
              {clearComplete ? (
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 text-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-green-300">Cleanup Complete</h3>
                  <p className="text-green-400 text-sm mt-1">Redirecting to home page...</p>
                </div>
              ) : (
                <Button 
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-medium py-6"
                >
                  {isClearing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Clearing All Data...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-5 w-5" />
                      Clear All Session Data
                    </>
                  )}
                </Button>
              )}
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-900/70 p-2 rounded flex flex-col items-center text-xs">
                  <div className="text-gray-400 mb-1">localStorage</div>
                  {clearStatus.localStorage === 'pending' ? (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  ) : clearStatus.localStorage === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="bg-gray-900/70 p-2 rounded flex flex-col items-center text-xs">
                  <div className="text-gray-400 mb-1">Cookies</div>
                  {clearStatus.cookies === 'pending' ? (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  ) : clearStatus.cookies === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="bg-gray-900/70 p-2 rounded flex flex-col items-center text-xs">
                  <div className="text-gray-400 mb-1">Redirect</div>
                  {clearStatus.redirect === 'pending' ? (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  ) : clearStatus.redirect === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="mt-4 text-center text-gray-400 text-sm">
          <p>This page doesn't require authentication and can be accessed at any time for debugging purposes.</p>
        </div>
      </div>
    </div>
  );
} 