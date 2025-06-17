import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Interface for memory/contact objects used in contact components
 */
interface Memory {
  id: string;
  content: string;
  memory_data?: {
    type: string;
  };
  created_at: string;
  user_id: string;
  name?: string;
  contact_info?: string;
}

/**
 * Props for the ContactFinder component
 */
interface ContactFinderProps {
  memory: Memory;
  onSelect: (id: string) => void;
}

/**
 * Props for the ContactsList component
 */
interface ContactsListProps {
  memories: Memory[];
  onSelect?: (id: string) => void;
}

/**
 * ContactFinder Component
 * 
 * Displays a single contact with a large avatar for direct navigation
 * Used when a specific contact is found and highlighted
 */
export function ContactFinder({ memory, onSelect }: ContactFinderProps) {
  const initial = memory.name?.[0]?.toUpperCase() || '?';
  
  return (
    <motion.div
      onClick={() => onSelect(memory.user_id)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-8 cursor-pointer"
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <motion.div 
        className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20"
        whileHover={{ boxShadow: '0 0 20px 5px rgba(20, 184, 166, 0.3)' }}
      >
        <span className="text-4xl font-bold text-white">{initial}</span>
      </motion.div>
      <h3 className="text-xl font-semibold text-teal-100 mb-1">{memory.name}</h3>
      {memory.contact_info && (
        <p className="text-sm text-teal-300/70">{memory.contact_info}</p>
      )}
      <motion.div 
        className="mt-6 flex items-center gap-2 text-teal-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span>Open chat</span>
        <ArrowRight className="h-4 w-4" />
      </motion.div>
    </motion.div>
  );
}

/**
 * ContactsList Component
 * 
 * Displays a grid of contacts for selection
 * Used when multiple contacts are found
 */
export function ContactsList({ memories, onSelect }: ContactsListProps) {
  return (
    <div className="customers-grid grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {memories
        .filter(memory => memory.memory_data?.type === 'contact' || memory.user_id)
        .map(memory => (
          <div 
            key={memory.id}
            onClick={() => onSelect?.(memory.user_id || memory.id)}
            className="group relative p-4 rounded-lg border border-teal-500/20 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10 hover:border-teal-500/30"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white mr-4">
                <span className="text-xl font-bold">{memory.name?.[0]?.toUpperCase() || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-teal-100 truncate">{memory.name}</h4>
                {memory.contact_info && (
                  <p className="text-sm text-teal-300/70 truncate">{memory.contact_info}</p>
                )}
                <div className="mt-1 flex items-center text-xs text-teal-400/60 gap-1">
                  <ArrowRight className="h-3 w-3" />
                  <span>View chat</span>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
} 