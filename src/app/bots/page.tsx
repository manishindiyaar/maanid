'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, ToggleLeft, ToggleRight, Trash2, Search, Check, AlertCircle, Bot } from 'lucide-react';
import { supabase } from './../../lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { BackButton } from "./../../components/ui/back-button"

interface Bot {
  id: string;
  name: string;
  platform: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

// Actual SVG logos for messaging platforms
const TelegramSVG = () => (
  <svg viewBox="0 0 512 512" width="100%" height="100%" fill="#27A7E5">
    <path d="M256,0c141.4,0 256,114.6 256,256c0,141.4 -114.6,256 -256,256c-141.4,0 -256,-114.6 -256,-256c0,-141.4 114.6,-256 256,-256Z"/>
    <path fill="#FFFFFF" d="M199,404c-11,0 -10,-4 -13,-14l-32,-105l245,-144"/>
    <path fill="#FFFFFF" d="M199,404c7,0 11,-4 16,-8l45,-43l-56,-34"/>
    <path fill="#FFFFFF" d="M204,319l135,99c14,9 26,4 30,-14l55,-258c5,-22 -9,-32 -24,-25l-323,125c-21,8 -21,21 -4,26l83,26l190,-121c9,-5 17,-3 11,4"/>
  </svg>
);

const WhatsAppSVG = () => (
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
<g fill="#04bb5b" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" ><g transform="scale(5.12,5.12)"><path d="M25,2c-12.682,0 -23,10.318 -23,23c0,3.96 1.02289,7.85306 2.96289,11.28906l-2.92578,10.44141c-0.096,0.343 -0.00386,0.70984 0.24414,0.96484c0.191,0.197 0.45175,0.30469 0.71875,0.30469c0.08,0 0.16123,-0.0103 0.24023,-0.0293l10.89648,-2.69922c3.327,1.786 7.07328,2.72852 10.86328,2.72852c12.682,0 23,-10.318 23,-23c0,-12.682 -10.318,-23 -23,-23zM16.64258,14c0.394,0 0.78586,0.00548 1.13086,0.02148c0.363,0.018 0.85108,-0.138 1.33008,1c0.492,1.168 1.67236,4.03708 1.81836,4.33008c0.148,0.292 0.24678,0.63248 0.05078,1.02148c-0.196,0.389 -0.29384,0.63361 -0.58984,0.97461c-0.296,0.341 -0.62072,0.75948 -0.88672,1.02148c-0.296,0.291 -0.60377,0.60545 -0.25977,1.18945c0.344,0.584 1.52916,2.49306 3.28516,4.03906c2.255,1.986 4.15805,2.60253 4.74805,2.89453c0.59,0.292 0.9353,0.24252 1.2793,-0.14648c0.344,-0.39 1.47614,-1.70216 1.86914,-2.28516c0.393,-0.583 0.78613,-0.48797 1.32813,-0.29297c0.542,0.194 3.44516,1.60448 4.03516,1.89648c0.59,0.292 0.98481,0.43864 1.13281,0.68164c0.148,0.242 0.14825,1.40853 -0.34375,2.76953c-0.492,1.362 -2.85233,2.60644 -3.98633,2.77344c-1.018,0.149 -2.3067,0.21158 -3.7207,-0.23242c-0.857,-0.27 -1.95623,-0.62752 -3.36523,-1.22852c-5.923,-2.526 -9.79189,-8.41569 -10.08789,-8.80469c-0.295,-0.389 -2.41016,-3.1603 -2.41016,-6.0293c0,-2.869 1.52441,-4.27928 2.06641,-4.86328c0.542,-0.584 1.18217,-0.73047 1.57617,-0.73047z"></path></g></g>
</svg>
);

export default function BotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBots();
  }, []);

  // Filter bots based on search query
  const filteredBots = bots.filter(bot =>
    bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bot.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bot.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchBots = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setBots(data || []);
    } catch (err: any) {
      console.error('Error fetching bots:', err);
      setError(err.message || 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  const toggleBotActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('bots')
        .update({ is_active: !currentState })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setBots((prev) => 
        prev.map((bot) => 
          bot.id === id ? { ...bot, is_active: !currentState } : bot
        )
      );
    } catch (err: any) {
      console.error('Error toggling bot state:', err);
      alert(`Failed to update bot: ${err.message}`);
    }
  };

  const deleteBot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }
    
    try {
      // First, get the bot token using the ID
      const { data: botData, error: fetchError } = await supabase
        .from('bots')
        .select('token, name')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!botData?.token) {
        throw new Error('Bot token not found');
      }
      
      // Show deleting state
      const botName = botData.name;
      alert(`Deleting bot "${botName}"... This will remove it from both your database and the central registry.`);
      
      // Call the new API endpoint to delete from both user DB and registry
      const response = await fetch('/api/bots/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: botData.token }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete bot completely');
      }
      
      // Detailed results feedback
      if (result.userDbDeleted && result.registryDeleted) {
        alert(`✅ Bot "${botName}" was successfully deleted from your database and the registry.`);
      } else if (result.userDbDeleted) {
        alert(`⚠️ Bot "${botName}" was deleted from your database but not from the registry. The backend team has been notified.`);
      } else if (result.registryDeleted) {
        alert(`⚠️ Bot "${botName}" was deleted from the registry but not from your database. The bot will no longer receive webhooks.`);
      } else {
        alert(`❌ Something went wrong during deletion. Please contact support.`);
        console.error('Bot deletion failed with result:', result);
      }
      
      // Update local state
      setBots((prev) => prev.filter((bot) => bot.id !== id));
    } catch (err: any) {
      console.error('Error deleting bot:', err);
      alert(`Failed to delete bot: ${err.message}`);
    }
  };

  const getPlatformIcon = (platform: string, className = "") => {
    if (platform === 'telegram') {
      return (
        <div className={`relative ${className}`}>
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md"></div>
          <TelegramSVG />
        </div>
      );
    } else if (platform === 'whatsapp') {
      return (
        <div className={`relative ${className}`}>
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-md"></div>
          <WhatsAppSVG />
        </div>
      );
    }
    
    return (
      <div className={`bg-gray-100 text-gray-500 rounded-full flex items-center justify-center ${className}`}>
        <Bot size={16} />
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header with glassmorphism effect */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10"
      >
        <div className="container mx-auto py-4 px-6 flex justify-between items-center">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-white/90 hover:text-white gap-2 py-2 px-3 rounded-lg hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/create-bot')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus size={18} />
            Create Bot
          </motion.button>
        </div>
      </motion.div>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="container mx-auto py-12 px-6"
      >
        <div className="mb-12">
          <BackButton />
        </div>
        <motion.div variants={fadeInUp} className="flex justify-between items-center mb-8">
          <motion.h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Manage Bots
          </motion.h1>
          
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="py-2 pl-10 pr-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent w-64"
              placeholder="Search bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>
        
        {error && (
          <motion.div 
            variants={fadeInUp}
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 backdrop-blur-md flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          </motion.div>
        )}
        
        {loading ? (
          <motion.div 
            variants={fadeInUp}
            className="flex justify-center py-20"
          >
            <div className="relative">
              <div className="w-16 h-16 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </motion.div>
        ) : bots.length === 0 ? (
          <motion.div 
            variants={fadeInUp}
            className="bg-white/5 backdrop-blur-lg p-12 rounded-2xl shadow-lg border border-white/10 text-center"
          >
            <div className="bg-blue-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bot className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">No bots registered yet</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Create your first bot to start receiving messages from your customers and automate your conversations.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/create-bot')}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-blue-500/20 mx-auto"
            >
              <Plus size={20} />
              Create Your First Bot
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            variants={fadeInUp}
            className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-lg border border-white/10 overflow-hidden"
          >
            {/* Table header with search */}
            <div className="p-6 border-b border-white/10">
              <p className="text-sm text-gray-300">
                {filteredBots.length} {filteredBots.length === 1 ? 'bot' : 'bots'} found
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead>
                  <tr className="bg-white/5">
                    {["Bot", "Platform", "Username", "Created", "Status", "Actions"].map((header, index) => (
                      <th key={index} className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <AnimatePresence>
                    {filteredBots.map((bot, index) => (
                      <motion.tr 
                        key={bot.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                        exit={{ opacity: 0, y: -20 }}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                        className="transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-white">{bot.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getPlatformIcon(bot.platform, "w-8 h-8")}
                            <span className="capitalize text-gray-300">{bot.platform}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-300">@{bot.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{formatDate(bot.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleBotActive(bot.id, bot.is_active)}
                            className="flex items-center gap-2 py-1 px-3 rounded-full"
                            style={{ 
                              backgroundColor: bot.is_active ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            {bot.is_active ? (
                              <>
                                <ToggleRight className="text-green-400" size={18} />
                                <span className="text-green-400 font-medium">Active</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="text-gray-400" size={18} />
                                <span className="text-gray-400">Inactive</span>
                              </>
                            )}
                          </motion.button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <motion.button
                            whileHover={{ scale: 1.1, color: '#ef4444' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => deleteBot(bot.id)}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
                            title="Delete bot"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {filteredBots.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <p>No bots match your search.</p>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Information card */}
        {bots.length > 0 && (
          <motion.div
            variants={fadeInUp}
            className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <h3 className="text-xl font-medium mb-3 text-blue-300">Bot Management Tips</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 mt-0.5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Toggle bots on/off instead of deleting them to preserve settings and history</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 mt-0.5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Each bot can be assigned to different teams or departments</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 mt-0.5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Review analytics in the dashboard to optimize bot performance</span>
              </li>
            </ul>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
} 