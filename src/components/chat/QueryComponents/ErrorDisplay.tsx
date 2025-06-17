import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './../../../components/ui/button';

/**
 * Props for the ErrorDisplay component
 */
interface ErrorDisplayProps {
  errorMessage?: string;
  onClose?: () => void;
}

/**
 * ErrorDisplay Component
 * 
 * Displays an error message with animation and a try again button
 * Used when a query can't be processed
 */
export function ErrorDisplay({ errorMessage, onClose }: ErrorDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1),transparent_50%)]" />
      </div>
      
      <motion.div 
        className="relative w-full max-w-md"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="relative rounded-xl border border-red-500/30 shadow-2xl shadow-red-500/10 backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95 p-6">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-red-500/20 blur-lg animate-pulse" />
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 p-0.5">
                <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center">
                  <X className="h-8 w-8 text-red-400" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Error Message */}
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-red-300">Query Not Relevant</h3>
            <p className="text-red-300/70 text-sm">
              {errorMessage || 'The query could not be processed. Please try a different query format or rephrase your question.'}
            </p>
          </div>
          
          {/* Close Button */}
          <div className="mt-6 flex justify-center">
            <Button
              onClick={onClose}
              className="relative group bg-gradient-to-r from-red-600/20 to-red-500/20 hover:from-red-500/30 hover:to-red-400/30 text-red-300 border border-red-500/30"
            >
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-red-400/0 via-white/10 to-red-400/0 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <span className="relative">Try Again</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 