import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Interface for memory objects used in search results
 */
interface Memory {
  id: string;
  content: string;
  created_at: string;
  memory_data?: {
    type: string;
  };
  name?: string;
  contact_info?: string;
  user_id?: string;
}

/**
 * Props for the SearchResults component
 */
interface SearchResultsProps {
  memories: Memory[];
  onSelectContact?: (id: string) => void;
}

/**
 * SearchResults Component
 * 
 * Displays a list of search results with contact information and message content
 * Each result is clickable to navigate to the contact's chat
 */
export function SearchResults({ memories, onSelectContact }: SearchResultsProps) {
  return (
    <div className="space-y-3">
      {memories.map((memory, index) => (
        <motion.div
          key={memory.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => {
            if (memory.user_id && onSelectContact) {
              onSelectContact(memory.user_id);
            }
          }}
          className="group relative p-4 rounded-lg cursor-pointer transition-all duration-300"
        >
          {/* Enhanced background effects */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/10 opacity-75" />
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative flex items-start gap-4">
            {/* Contact Avatar */}
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-0.5">
                <div className="h-full w-full rounded-[7px] bg-slate-950 flex items-center justify-center">
                  <span className="text-lg font-semibold text-teal-300">
                    {memory.name ? memory.name[0].toUpperCase() : '?'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  {memory.name && (
                    <h4 className="text-base font-medium text-teal-100 mb-1">
                      {memory.name}
                    </h4>
                  )}
                  {memory.contact_info && (
                    <p className="text-sm text-teal-300/70">
                      {memory.contact_info}
                    </p>
                  )}
                </div>
                <motion.div
                  initial={false}
                  animate={{ x: 0, opacity: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center gap-2 text-teal-300">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </motion.div>
              </div>

              {/* Message Preview */}
              <div className="mt-3 text-sm text-teal-100/90 line-clamp-2 bg-slate-900/50 rounded-lg p-3 border border-teal-500/20">
                {memory.content}
              </div>

              {/* Metadata */}
              <div className="mt-2 flex items-center gap-3 text-xs text-teal-300/50">
                <span>{new Date(memory.created_at).toLocaleDateString()}</span>
                {memory.memory_data?.type && !memory.memory_data.type.includes('action') && (
                  <span>Type: {memory.memory_data.type}</span>
                )}
              </div>
            </div>
          </div>

          {/* Hover effect indicator */}
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
        </motion.div>
      ))}
    </div>
  );
} 