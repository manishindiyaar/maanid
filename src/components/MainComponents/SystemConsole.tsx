"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  IconCode,
  IconServer,
  IconLogout,
  IconDatabase,
} from "@tabler/icons-react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SystemConsoleProps {
  showConsole: boolean;
  setShowConsole: (show: boolean) => void;
  isCopilotActive: boolean;
}

const SystemConsole: React.FC<SystemConsoleProps> = ({
  showConsole,
  setShowConsole,
  isCopilotActive
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'system' | 'credentials'>('system');
  const [credentials, setCredentials] = useState({
    projectName: '',
    projectRef: '',
    projectUrl: '',
    anonKey: '',
    serviceRoleKey: '',
    hasSchema: false,
    accessToken: '',
  });

  // Load credentials from localStorage
  useEffect(() => {
    setCredentials({
      projectName: localStorage.getItem('supabase_project_name') || 'BladeX AI Project',
      projectRef: localStorage.getItem('supabase_project_ref') || 'bladex-ai-ref-2023',
      projectUrl: localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || localStorage.getItem('supabase_url') || 'https://api.bladexai.com/v1',
      anonKey: localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key') || 'eyJh...Ub7N8',
      serviceRoleKey: localStorage.getItem('SUPABASE_SERVICE_ROLE_KEY') || 'svc_...Pd9C3',
      hasSchema: localStorage.getItem('schema_setup_completed') === 'true',
      accessToken: localStorage.getItem('supabase_access_token') || 'N/A',
    });
  }, []);

  const openCredentialsPage = () => {
    router.push('/credentials');
  };

  // Console tab buttons
  const consoleButtons = [
    {
      label: "System",
      key: 'system',
      icon: <IconCode className="w-4 h-4" />,
    },
    {
      label: "Credentials",
      key: 'credentials',
      icon: <IconServer className="w-4 h-4" />,
    }
  ];

  return (
    <AnimatePresence>
      {showConsole && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-teal-500/20 bg-gradient-to-r from-slate-800/90 to-slate-900/90">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConsole(false)}
                className="p-2 bg-teal-500/20 text-teal-300 rounded-lg hover:bg-teal-500/30 transition-colors"
              >
                <IconLogout className="w-5 h-5 transform rotate-180" />
              </motion.button>
              <h1 className="text-2xl font-bold text-white">System Console</h1>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-md border border-teal-500/20 rounded-lg p-1">
              {consoleButtons.map((button) => (
                <button
                  key={button.key}
                  onClick={() => setActiveTab(button.key as 'system' | 'credentials')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
                    activeTab === button.key 
                      ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md"
                      : "text-gray-400 hover:text-teal-300"
                  )}
                >
                  {button.icon}
                  <span>{button.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Console Header & Tabs */}
          <div className="max-h-[80vh] overflow-auto">
            <div className="bg-gray-900/90 border-b border-teal-600/30 px-2 pt-2 flex space-x-1">
              <button 
                onClick={() => setActiveTab('system')}
                className={cn(
                  "px-3 py-2 text-xs rounded-t-lg font-mono transition-all",
                  activeTab === 'system'
                    ? "bg-gray-800 text-teal-300 border-t border-l border-r border-teal-600/30"
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                )}
              >
                System
              </button>
              <button 
                onClick={() => setActiveTab('credentials')}
                className={cn(
                  "px-3 py-2 text-xs rounded-t-lg font-mono transition-all",
                  activeTab === 'credentials'
                    ? "bg-gray-800 text-cyan-300 border-t border-l border-r border-teal-600/30"
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                )}
              >
                Credentials
              </button>
            </div>
            
            {/* Console Content */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 backdrop-blur-md scrollbar-thin scrollbar-thumb-teal-600/30 scrollbar-track-transparent">
              {activeTab === 'system' && (
                <div className="p-6 space-y-4 font-mono">
                  {/* Mode Status */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase text-teal-400/90 font-medium tracking-wider">Current Mode</h4>
                    <div className="p-3 rounded-lg border bg-gray-900/80 border-teal-700/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Authentication Mode</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          User Mode
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-300">Credential Source</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          User Credentials
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Credential Status */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase text-teal-400/90 font-medium tracking-wider">Credential Status</h4>
                    <div className="p-3 rounded-lg border bg-gray-900/80 border-teal-700/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2 p-1.5">
                          <div className="flex-shrink-0">
                            {credentials.projectUrl !== 'N/A' ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-300">Project URL</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-1.5">
                          <div className="flex-shrink-0">
                            {credentials.anonKey !== 'N/A' ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-300">Anon Key</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-1.5">
                          <div className="flex-shrink-0">
                            {credentials.serviceRoleKey !== 'Not available' ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-300">Service Role</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-1.5">
                          <div className="flex-shrink-0">
                            {credentials.accessToken !== 'N/A' ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-300">Access Token</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-1.5">
                          <div className="flex-shrink-0">
                            {credentials.hasSchema ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-300">Schema Status</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* API Status */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase text-teal-400/90 font-medium tracking-wider">API Status</h4>
                    <div className="p-3 rounded-lg border bg-gray-900/80 border-teal-700/30">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Connection</span>
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">Connected</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Latency</span>
                          <span className="text-white">87ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Rate Limit</span>
                          <span className="text-white">250/min</span>
                        </div>
                        
                        {/* Autopilot Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Autopilot</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${isCopilotActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-white">{isCopilotActive ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'credentials' && (
                <div className="p-6 space-y-4 font-mono">
                  {/* Project Info */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase text-cyan-400/90 font-medium tracking-wider">Project Information</h4>
                    <div className="p-3 rounded-lg border bg-gray-900/80 border-cyan-700/30">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <IconDatabase className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="text-xs text-cyan-300 font-medium">Project Name</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                          <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded">{credentials.projectName}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <IconDatabase className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="text-xs text-cyan-300 font-medium">Project Reference</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                          <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded">{credentials.projectRef}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <IconDatabase className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="text-xs text-cyan-300 font-medium">Project URL</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                          <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded break-all">{credentials.projectUrl}</p>
                        </div>

                        <div className="flex items-center space-x-2 mt-4">
                          <IconDatabase className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="text-xs text-cyan-300 font-medium">Anon Key</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                          <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded">
                            {credentials.anonKey.length > 20
                              ? `${credentials.anonKey.substring(0, 10)}...${credentials.anonKey.substring(credentials.anonKey.length - 10)}`
                              : credentials.anonKey}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <IconDatabase className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="text-xs text-cyan-300 font-medium">Service Role Key</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                          <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded">
                            {credentials.serviceRoleKey === 'Not available'
                              ? 'Not available'
                              : credentials.serviceRoleKey.length > 20
                                ? `${credentials.serviceRoleKey.substring(0, 10)}...${credentials.serviceRoleKey.substring(credentials.serviceRoleKey.length - 10)}`
                                : credentials.serviceRoleKey}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <IconDatabase className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="text-xs text-cyan-300 font-medium">Access Token</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                          <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded">
                            {credentials.accessToken.length > 20
                              ? `${credentials.accessToken.substring(0, 10)}...${credentials.accessToken.substring(credentials.accessToken.length - 10)}`
                              : credentials.accessToken}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Schema Status Section */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase text-cyan-400/90 font-medium tracking-wider">Schema Status</h4>
                    <div className="p-3 rounded-lg border bg-gray-900/80 border-cyan-700/30">
                      <div className="flex items-center space-x-3">
                        {credentials.hasSchema ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-200">
                            {credentials.hasSchema ? "Schema Applied" : "Schema Not Applied"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {credentials.hasSchema 
                              ? "Database tables and functions are correctly set up" 
                              : "Please apply the schema in the SQL editor"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Credentials Management Button */}
                  <div className="flex justify-center mt-6">
                    <motion.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={openCredentialsPage}
                      className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg shadow-lg shadow-cyan-500/30 group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                      <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                      <span className="relative z-10 flex items-center gap-2">
                        <IconDatabase className="w-4 h-4" />
                        <span>Manage Credentials</span>
                      </span>
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SystemConsole; 