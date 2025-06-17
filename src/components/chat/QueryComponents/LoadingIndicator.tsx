import React from 'react';
import { Brain } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Props for the LoadingIndicator component
 */
interface LoadingIndicatorProps {
  message?: string;
  isSummaryQuery?: boolean;
  isActionQuery?: boolean;
}

/**
 * LoadingIndicator Component
 * 
 * Displays an animated loading indicator when waiting for results
 * Shows different messages based on the query type
 */
export function LoadingIndicator({ 
  message, 
  isSummaryQuery = false, 
  isActionQuery = false 
}: LoadingIndicatorProps) {
  // Set appropriate loading message based on query type
  const loadingMessage = message || (
    isSummaryQuery 
      ? "Building comprehensive profile..." 
      : isActionQuery 
        ? "Preparing action..." 
        : "Searching..."
  );

  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          >
            <Brain className="h-8 w-8 text-teal-400" />
          </motion.div>
        </motion.div>
        <p className="text-teal-300">{loadingMessage}</p>
      </div>
    </div>
  );
} 