'use client'

import { useState, useEffect } from "react";
import { Search, ArrowRight, Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isProcessing?: boolean;
  queryText?: string;
}

const QueryInput = ({ onSubmit, isProcessing = false, queryText }: QueryInputProps) => {
  const [query, setQuery] = useState("");
  const [gradientPos, setGradientPos] = useState(0);

  // Animate gradient border while processing
  useEffect(() => {
    if (!isProcessing) return;
    
    const interval = setInterval(() => {
      setGradientPos(prev => (prev + 1) % 360);
    }, 20);
    
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (query.trim() && !isProcessing) {
      onSubmit(query);
      setQuery("");
    }
  };

  return (
    <div className="flex-1">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className={`spotlight-container p-3 w-full transition-all duration-300 ${isProcessing ? 'ring-2 ring-primary/30' : ''}`}>
          <div className="flex items-center gap-3">
            {/* Icon Container */}
            <div className="spotlight-icon-container">
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Search className="h-5 w-5 text-gray-400" />
                </motion.div>
              ) : (
                <Search className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            {/* Input Field */}
            <div className="flex-1 relative">
              {isProcessing ? (
                <div className="w-full relative overflow-hidden rounded-lg">
                  {/* Animated gradient border */}
                  <div 
                    className="absolute -inset-0.5 rounded-lg z-0 opacity-75"
                    style={{
                      background: `linear-gradient(${gradientPos}deg, #10b981, #0ea5e9, #8b5cf6, #10b981)`,
                      backgroundSize: "400% 400%",
                    }}
                  />
                  
                  {/* Progress bar at the top */}
                  <div className="absolute top-0 left-0 h-0.5 w-full bg-transparent z-10">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-primary via-blue-500 to-primary"
                      animate={{ 
                        x: ["-100%", "100%"],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        ease: "easeInOut" 
                      }}
                    />
                  </div>
                  
                  {/* Input display during processing */}
                  <input
                    type="text"
                    value={queryText || query}
                    readOnly
                    className="w-full p-3 rounded-lg spotlight-input relative z-10"
                  />
                  
                  {/* Processing indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="text-xs font-medium text-primary"
                    >
                      Processing...
                    </motion.div>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                      }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </motion.div>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything (e.g., 'Show me contacts who said Hello')"
                  className="w-full p-3 rounded-lg spotlight-input"
                  disabled={isProcessing}
                />
              )}
            </div>
            
            {/* Submit button */}
            <button
              type="submit"
              className={`spotlight-icon-container ${!query.trim() || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-70'}`}
              disabled={!query.trim() || isProcessing}
            >
              <Send className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QueryInput;