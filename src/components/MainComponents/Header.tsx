'use client'

import { Expand, Zap, ZapOff, Cpu, BrainCircuit, PlusSquare, Command, Terminal, CheckCircle, XCircle, AlertCircle, Database, Code, HardDrive } from "lucide-react";
import { cn } from "./../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./../theme-provider";
import { useState, useEffect } from "react";

interface HeaderProps {
  isCopilotActive: boolean;
  toggleAutopilot: () => void;
  openAgentModal: () => void;
  handleCreateBot: () => void;
  toggleFullScreen: () => void;
  isAdmin?: boolean;
  isUsingUserCredentials?: boolean;
}

const Header = ({
  isCopilotActive,
  toggleAutopilot,
  openAgentModal,
  handleCreateBot,
  toggleFullScreen,
  isAdmin = false,
  isUsingUserCredentials = false
}: HeaderProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  const [showConsole, setShowConsole] = useState(false);
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

  // Load credentials
  useEffect(() => {
    setCredentials({
      projectName: localStorage.getItem('supabase_project_name') || 'Unknown Project',
      projectRef: localStorage.getItem('supabase_project_ref') || 'N/A',
      projectUrl: localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || localStorage.getItem('supabase_url') || 'N/A',
      anonKey: localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key') || 'N/A',
      serviceRoleKey: localStorage.getItem('SUPABASE_SERVICE_ROLE_KEY') || 'Not available',
      hasSchema: localStorage.getItem('schema_setup_completed') === 'true',
      accessToken: localStorage.getItem('supabase_access_token') || 'N/A',
    });
  }, []);

  // Animation variants
  const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <motion.div 
      variants={slideUp}
      className={cn(
        "border-b backdrop-blur-xl relative z-10",
        isDarkTheme 
          ? "border-teal-700/40 bg-gradient-to-r from-teal-950/80 via-teal-900/70 to-slate-900/80" 
          : "border-teal-500/30 bg-gradient-to-r from-teal-800/90 via-teal-700/80 to-teal-900/90"
      )}
      style={{
        boxShadow: isDarkTheme 
          ? '0 4px 20px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' 
          : '0 4px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.07)'
      }}
    >
      {/* 3D Lighting Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-teal-500/20 via-teal-400/30 to-teal-500/20" />
        
        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-teal-400/5 to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <motion.div 
            className={cn(
              "flex items-center gap-3 bg-gradient-to-r p-px rounded-xl",
              isDarkTheme 
                ? "from-teal-600/50 to-teal-700/50" 
                : "from-teal-500/50 to-teal-600/50"
            )}
            whileHover={{ scale: 1.02 }}
            style={{
              boxShadow: '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.07)'
            }}
          >
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              isDarkTheme 
                ? "bg-gradient-to-br from-teal-700/80 to-teal-800/80" 
                : "bg-gradient-to-br from-teal-600/80 to-teal-700/80"
            )}
            style={{
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
            }}
            >
              <Command className="h-5 w-5 text-white" />
            </div>
            <h1 className={cn(
              "text-xl font-bold pr-3",
              isDarkTheme 
                ? "text-white" 
                : "text-white"
            )}>
              BladeX
            </h1>
          </motion.div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: '0 5px 15px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)'
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowConsole(!showConsole)}
              className={cn(
                "p-2.5 border rounded-xl transition-all",
                showConsole
                  ? (isDarkTheme 
                    ? "bg-gradient-to-br from-teal-700/70 via-teal-600/60 to-teal-700/70 text-teal-300 border-teal-500/60" 
                    : "bg-gradient-to-br from-teal-600/70 via-teal-500/60 to-teal-600/70 text-teal-100 border-teal-400/60")
                  : (isDarkTheme 
                    ? "bg-gradient-to-br from-teal-800/50 via-teal-700/40 to-teal-800/50 text-teal-300 border-teal-600/40" 
                    : "bg-gradient-to-br from-teal-700/50 via-teal-600/40 to-teal-700/50 text-teal-100 border-teal-500/40")
              )}
              style={{
                boxShadow: showConsole
                  ? '0 0 15px rgba(20, 184, 166, 0.3), 0 4px 12px rgba(0,0,0,0.15)' 
                  : '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.07)'
              }}
              title="System Console"
            >
              <Terminal className="w-5 h-5" />
            </motion.button>
            
            {/* Animated console menu buttons */}
            <AnimatePresence>
              {showConsole && (
                <>
                  <motion.button
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ 
                      scale: 1.1,
                      y: -2,
                      boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                    }}
                    onClick={() => setActiveTab('system')}
                    className={cn(
                      "absolute p-2 border rounded-full -left-2 top-12 transition-all",
                      activeTab === 'system'
                        ? "bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white border-cyan-500/60"
                        : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 text-gray-300 border-gray-700/60"
                    )}
                    style={{
                      boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                    }}
                    title="System Info"
                  >
                    <Code className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    whileHover={{ 
                      scale: 1.1,
                      y: -2,
                      boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                    }}
                    onClick={() => setActiveTab('credentials')}
                    className={cn(
                      "absolute p-2 border rounded-full left-8 top-12 transition-all",
                      activeTab === 'credentials'
                        ? "bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white border-cyan-500/60"
                        : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 text-gray-300 border-gray-700/60"
                    )}
                    style={{
                      boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                    }}
                    title="Credentials"
                  >
                    <HardDrive className="w-4 h-4" />
                  </motion.button>
                </>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 5px 15px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)'
            }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleFullScreen}
            className={cn(
              "p-2.5 border rounded-xl transition-all",
              isDarkTheme 
                ? "bg-gradient-to-br from-teal-800/50 via-teal-700/40 to-teal-800/50 text-teal-300 border-teal-600/40" 
                : "bg-gradient-to-br from-teal-700/50 via-teal-600/40 to-teal-700/50 text-teal-100 border-teal-500/40"
            )}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.07)'
            }}
            title="Full Screen Mode"
          >
            <Expand className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 5px 15px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)'
            }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleAutopilot}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border",
              isCopilotActive 
                ? (isDarkTheme 
                    ? "bg-gradient-to-r from-teal-700/50 via-teal-600/40 to-teal-700/50 text-teal-300 border-teal-600/40" 
                    : "bg-gradient-to-r from-teal-600/50 via-teal-500/40 to-teal-600/50 text-teal-100 border-teal-500/40") 
                : (isDarkTheme 
                    ? "bg-slate-800/60 text-gray-300 border-slate-700/40" 
                    : "bg-slate-800/60 text-gray-300 border-slate-700/40")
            )}
            style={{
              boxShadow: isCopilotActive 
                ? '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.07)' 
                : '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.05)'
            }}
            title={isCopilotActive ? "Deactivate Autopilot" : "Activate Autopilot"}
          >
            {isCopilotActive ? (
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <Zap className={cn("h-5 w-5", isDarkTheme ? "text-teal-300" : "text-teal-300")} />
              </motion.div>
            ) : (
              <ZapOff className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">
              {isCopilotActive ? "Autopilot Active" : "Autopilot Off"}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 5px 15px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)'
            }}
            whileTap={{ scale: 0.98 }}
            onClick={openAgentModal}
            className={cn(
              "p-2.5 border rounded-xl transition-all",
              isDarkTheme 
                ? "bg-gradient-to-br from-teal-800/50 via-teal-700/40 to-teal-800/50 text-teal-300 border-teal-600/40" 
                : "bg-gradient-to-br from-teal-700/50 via-teal-600/40 to-teal-700/50 text-teal-100 border-teal-500/40"
            )}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.07)'
            }}
            title="Setup Agent"
          >
            <BrainCircuit className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 5px 15px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)'
            }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateBot}
            className={cn(
              "p-2.5 border rounded-xl transition-all",
              isDarkTheme 
                ? "bg-gradient-to-br from-teal-800/50 via-teal-700/40 to-teal-800/50 text-teal-300 border-teal-600/40" 
                : "bg-gradient-to-br from-teal-700/50 via-teal-600/40 to-teal-700/50 text-teal-100 border-teal-500/40"
            )}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.07)'
            }}
            title="Create Bot"
          >
            <PlusSquare className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Console Panel */}
      <AnimatePresence>
        {showConsole && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: { type: "spring", stiffness: 300, damping: 25 }
            }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="absolute right-4 top-16 z-50 w-96 overflow-hidden"
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="rounded-xl overflow-hidden border border-teal-600/30">
              {/* Header */}
              <div className={cn(
                "px-4 py-3 flex items-center justify-between",
                isDarkTheme 
                  ? "bg-gradient-to-r from-teal-900/90 to-teal-800/90 border-b border-teal-600/30" 
                  : "bg-gradient-to-r from-teal-800/90 to-teal-700/90 border-b border-teal-500/30"
              )}>
                <h3 className="font-medium text-white flex items-center text-sm font-mono">
                  <Terminal className="w-4 h-4 mr-2 text-teal-400" />
                  <span>{activeTab === 'system' ? 'System Console' : 'API Credentials'}</span>
                </h3>
                <div className="flex space-x-1">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-teal-400/80"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-teal-500/80"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-teal-600/80"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  />
                </div>
              </div>
              
              {/* Console Tabs */}
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
              
              {/* Content */}
              <div className={cn(
                "max-h-[70vh] overflow-y-auto",
                isDarkTheme 
                  ? "bg-gradient-to-b from-gray-800 to-gray-900 backdrop-blur-md scrollbar-thin scrollbar-thumb-teal-700/30 scrollbar-track-transparent" 
                  : "bg-gradient-to-b from-gray-800 to-gray-900 backdrop-blur-md scrollbar-thin scrollbar-thumb-teal-600/30 scrollbar-track-transparent"
              )}>
                {activeTab === 'system' && (
                  <div className="p-4 space-y-4 font-mono">
                    {/* Mode Status */}
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase text-teal-400/90 font-medium tracking-wider">Current Mode</h4>
                      <div className={cn(
                        "p-3 rounded-lg border",
                        isDarkTheme
                          ? "bg-gray-900/80 border-teal-700/30"
                          : "bg-gray-900/80 border-teal-600/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Authentication Mode</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isAdmin 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {isAdmin ? 'Admin Mode' : 'User Mode'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-300">Credential Source</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isUsingUserCredentials 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {isUsingUserCredentials ? 'User Credentials' : 'Admin Credentials'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Credential Status */}
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase text-teal-400/90 font-medium tracking-wider">Credential Status</h4>
                      <div className={cn(
                        "p-3 rounded-lg border",
                        isDarkTheme
                          ? "bg-gray-900/80 border-teal-700/30"
                          : "bg-gray-900/80 border-teal-600/30"
                      )}>
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
                  </div>
                )}

                {activeTab === 'credentials' && (
                  <div className="p-4 space-y-4 font-mono">
                    {/* Project Info */}
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase text-cyan-400/90 font-medium tracking-wider">Project Information</h4>
                      <div className={cn(
                        "p-3 rounded-lg border",
                        isDarkTheme
                          ? "bg-gray-900/80 border-cyan-700/30"
                          : "bg-gray-900/80 border-cyan-600/30"
                      )}>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Database className="h-3.5 w-3.5 text-cyan-500" />
                            <span className="text-xs text-cyan-300 font-medium">Project Name</span>
                          </div>
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded">{credentials.projectName}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Database className="h-3.5 w-3.5 text-cyan-500" />
                            <span className="text-xs text-cyan-300 font-medium">Project Reference</span>
                          </div>
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded">{credentials.projectRef}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Database className="h-3.5 w-3.5 text-cyan-500" />
                            <span className="text-xs text-cyan-300 font-medium">Project URL</span>
                          </div>
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <p className="text-sm text-white font-mono ml-5 bg-black/40 p-1.5 rounded break-all">{credentials.projectUrl}</p>
                          </div>

                          <div className="flex items-center space-x-2 mt-4">
                            <Database className="h-3.5 w-3.5 text-cyan-500" />
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
                            <Database className="h-3.5 w-3.5 text-cyan-500" />
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
                            <Database className="h-3.5 w-3.5 text-cyan-500" />
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
                      <div className={cn(
                        "p-3 rounded-lg border",
                        isDarkTheme
                          ? "bg-gray-900/80 border-cyan-700/30"
                          : "bg-gray-900/80 border-cyan-600/30"
                      )}>
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
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Header; 