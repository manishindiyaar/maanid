'use client'

import { useEffect, useState } from 'react';
import { useSupabase } from './../../lib/supabase/useSupabase';
import { Bot, ExternalLink, RefreshCcw, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './../../lib/utils';

interface Bot {
  id: string;
  name: string;
  platform: string;
  username: string;
  is_active: boolean;
}

export default function BotIndicator({ selectedContactId }: { selectedContactId?: string | null }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBot, setCurrentBot] = useState<Bot | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchBots = async (retryCount = 0) => {
    if (!supabase) {
      console.warn('Supabase client not initialized yet, using empty bots array');
      setBots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      const { data, error } = await supabase
        .from('bots')
        .select('id, name, platform, username, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error fetching bots:', error);
        
        // Retry logic for transient errors
        if (retryCount < 2) {
          console.log(`Retrying bot fetch (attempt ${retryCount + 1})...`);
          setTimeout(() => fetchBots(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        
        throw error;
      }
      
      // If we get here, the request was successful
      setBots(data || []);
      
      // If we have a selected contact, try to determine which bot is associated with it
      if (selectedContactId && data && data.length > 0) {
        try {
          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('contact_info')
            .eq('id', selectedContactId)
            .single();
          
          if (contactError) {
            console.warn('Error fetching contact info:', contactError);
            // Non-critical error, don't throw
          }
          
          if (contact) {
            // For Telegram contacts, any bot can be used
            if (data.some(bot => bot.platform === 'telegram')) {
              setCurrentBot(data.find(bot => bot.platform === 'telegram') || null);
            }
          }
        } catch (contactErr) {
          console.warn('Error processing contact bot association:', contactErr);
          // This is non-critical, so we won't set the error state
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching bots:', err);
      // Don't show error for empty bot list, treat as empty instead
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
    
    // Set up a subscription to bot changes, but only if supabase is available
    if (supabase) {
      const channel = supabase
        .channel('bots-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bots' },
          () => {
            fetchBots();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedContactId, supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-300/70 px-2 py-1.5 bg-teal-900/20 rounded-lg border border-teal-800/30 backdrop-blur-sm">
        <RefreshCcw className="animate-spin w-3.5 h-3.5" />
        <span>Loading bots...</span>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 text-sm text-teal-300/70 px-2 py-1.5 bg-teal-900/20 rounded-lg border border-teal-800/30 backdrop-blur-sm cursor-pointer"
        onClick={() => fetchBots()}
      >
        <Bot className="w-4 h-4" />
        <span>No bots available</span>
        <RefreshCcw className="w-3 h-3 ml-1 hover:animate-spin" />
      </motion.div>
    );
  }

  if (bots.length === 0) {
    return (
      <motion.div 
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 text-sm text-gray-300 px-3 py-2 cursor-pointer rounded-lg bg-teal-900/10 hover:bg-teal-900/20 border border-teal-800/20 transition-all"
        onClick={() => router.push('/create-bot')}
      >
        <Bot className="w-4 h-4 text-teal-400" />
        <span>No active bots</span>
        <ExternalLink className="w-3 h-3 ml-1 text-teal-500" />
      </motion.div>
    );
  }

  return (
    <div className="relative w-full">
      <motion.div 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 rounded-lg cursor-pointer transition-all",
          isOpen 
            ? "bg-gradient-to-r from-teal-600/30 to-teal-500/20 border border-teal-500/40"
            : "bg-gradient-to-r from-teal-900/20 to-teal-800/20 border border-teal-800/30 hover:from-teal-800/30 hover:to-teal-700/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <Bot className="w-4 h-4 text-teal-400" />
            {/* Pulse animation */}
            <motion.div
              className="absolute -inset-0.5 rounded-full bg-teal-500/20" 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.7, 0, 0.7]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "loop" 
              }}
            />
          </div>
          <span className="text-sm font-medium text-teal-100">
            {selectedContactId && currentBot 
              ? `@${currentBot.username}` 
              : `${bots.length} bot${bots.length > 1 ? 's' : ''} active`}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-teal-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </motion.div>
      
      {/* Dropdown with bot details */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 w-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md shadow-xl rounded-lg border border-teal-800/40 overflow-hidden z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-teal-800/30 bg-teal-900/20">
              <div className="text-xs font-semibold text-teal-400">Connected Bots</div>
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-800/40 scrollbar-track-transparent">
              {bots.map(bot => (
                <motion.div 
                  key={bot.id} 
                  whileHover={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}
                  className={cn(
                    "py-2 px-3", 
                    selectedContactId && currentBot?.id === bot.id && "bg-teal-900/30 border-l-2 border-teal-400"
                  )}
                >
                  <div className="flex items-start">
                    {bot.platform === 'telegram' && (
                      <div className="mr-2 text-blue-400 mt-1 relative">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 0 1-2.849 1.09c-.42.147-.99.332-1.473.901-.728.968.193 1.798.919 2.286 1.61.516 3.275 1.009 4.654 1.472.846 1.467 1.618 2.996 2.513 4.52.545.935 1.146 1.982 2.149 2.428 1.454.565 2.463-.7 2.731-1.963.603-1.447 1.2-2.896 1.803-4.328 1.21-2.604 2.55-6.118 3.314-7.946.996-2.365 2.298-5.444 2.045-6.469-.127-1.027-.756-1.748-1.928-1.753-1.26-.056-1.5.085-2.5.263z" />
                        </svg>
                        {/* Small green dot for active status */}
                        <div className="absolute -right-1 -bottom-1 w-2 h-2 bg-green-500 rounded-full border border-gray-900"></div>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-xs font-medium text-teal-100">{bot.name}</div>
                      <div className="text-xs text-teal-300/60">@{bot.username}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-[10px] bg-gradient-to-r from-green-900/40 to-green-800/40 border border-green-700/30 text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                        <span>Active</span>
                      </div>
                      {selectedContactId && currentBot?.id === bot.id && (
                        <div className="text-[10px] bg-gradient-to-r from-blue-900/40 to-blue-800/40 border border-blue-700/30 text-blue-400 px-1.5 py-0.5 rounded-full">
                          Current
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div 
              whileHover={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}
              className="text-xs text-teal-400 flex items-center justify-center py-2 border-t border-teal-800/30 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/bots');
              }}
            >
              Manage bots <ExternalLink className="w-3 h-3 ml-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
