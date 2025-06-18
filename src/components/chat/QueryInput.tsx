'use client'

import { useState, useEffect } from "react";
import { Search, ArrowRight, Loader2, Send, Phone } from "lucide-react";
import { motion } from "framer-motion";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isProcessing?: boolean;
  queryText?: string;
}

interface CallResult {
  contact: string;
  phoneNumber: string;
  callId: string | null;
  status: 'initiated' | 'failed';
  error?: string;
}

interface CallResponse {
  success: boolean;
  message: string;
  parsedQuery: {
    type: string;
    contacts: string[];
    message: string;
  };
  assistantId: string;
  calls: CallResult[];
  demo?: boolean;
}

const QueryInput = ({ onSubmit, isProcessing = false, queryText }: QueryInputProps) => {
  const [query, setQuery] = useState("");
  const [gradientPos, setGradientPos] = useState(0);
  const [callResult, setCallResult] = useState<CallResponse | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isCallProcessing, setIsCallProcessing] = useState(false);

  // Animate gradient border while processing
  useEffect(() => {
    if (!isProcessing && !isCallProcessing) return;
    
    const interval = setInterval(() => {
      setGradientPos(prev => (prev + 1) % 360);
    }, 20);
    
    return () => clearInterval(interval);
  }, [isProcessing, isCallProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (query.trim() && !isProcessing && !isCallProcessing) {
      // Check if this is a call-related query
      const callPatterns = [
        // Original patterns
        /call\s+(.+?)\s+and\s+say\s+(.+)/i,
        /call\s+(.+?)\s+and\s+tell\s+(?:them|him|her)\s+(.+)/i,
        /call\s+(.+?)\s+and\s+inform\s+(?:them|him|her)\s+(.+)/i,
        /call\s+(.+?)\s+(?:to\s+)?say\s+(.+)/i,
        /call\s+(.+?)\s+(?:to\s+)?tell\s+(?:them|him|her)\s+(.+)/i,
        
        // Additional patterns for "make a call" and similar variations
        /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+and\s+say\s+(.+)/i,
        /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+and\s+tell\s+(?:them|him|her)\s+(.+)/i,
        /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+(?:to\s+)?say\s+(.+)/i,
        /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+(?:to\s+)?tell\s+(?:them|him|her)\s+(.+)/i,
        /phone\s+(.+?)\s+(?:and|to)\s+(?:say|tell|inform)\s+(.+)/i,
        /dial\s+(.+?)\s+(?:and|to)\s+(?:say|tell|inform)\s+(.+)/i
      ];
      
      // Log the query for debugging
      console.log("Processing query:", query);
      
      // Check if any pattern matches
      let isCallQuery = false;
      for (const pattern of callPatterns) {
        if (pattern.test(query)) {
          console.log("Matched call pattern:", pattern);
          isCallQuery = true;
          break;
        }
      }
      
      if (isCallQuery) {
        // Process as a call request
        console.log("Processing as call request");
        setIsCallProcessing(true);
        setCallResult(null);
        setCallError(null);
        
        try {
          const response = await fetch('/api/make-call', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });

          const data = await response.json();
          console.log("Call API response:", data);

          if (!response.ok) {
            throw new Error(data.error || 'Failed to process call request');
          }

          setCallResult(data);
          
          // Don't send to normal query handler since we're handling it here
          // onSubmit(`[Call Request] ${query}`);
        } catch (err) {
          console.error("Call error:", err);
          setCallError(err instanceof Error ? err.message : 'An error occurred with the call');
          // Only send error to normal query handler
          onSubmit(`[Call Error] ${query} - ${err instanceof Error ? err.message : 'An error occurred'}`);
        } finally {
          setIsCallProcessing(false);
          setQuery("");
        }
      } else {
        // Process as a normal query
        console.log("Processing as normal query");
        onSubmit(query);
        setQuery("");
      }
    }
  };

  // Render call results if any
  const renderCallResults = () => {
    if (!callResult) return null;
    
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg p-4 z-50 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="h-4 w-4 text-green-500" />
          <span className="font-medium text-green-500">Call Results</span>
          {callResult.demo && (
            <span className="text-xs bg-yellow-800 text-yellow-200 px-2 py-0.5 rounded">Demo Mode</span>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-gray-400">Message:</span> 
            <span className="text-white ml-2">"{callResult.parsedQuery.message}"</span>
          </div>
          
          <div className="text-sm">
            <span className="text-gray-400">Contacts:</span>
            <div className="ml-2 space-y-1 mt-1">
              {callResult.calls.map((call, idx) => (
                <div key={idx} className="flex items-center justify-between border border-gray-700 rounded p-2">
                  <div>
                    <div className="text-white">{call.contact}</div>
                    <div className="text-gray-400 text-xs">{call.phoneNumber}</div>
                  </div>
                  <div>
                    {call.status === 'initiated' ? (
                      <span className="text-xs bg-green-800 text-green-200 px-2 py-0.5 rounded">
                        {callResult.demo ? 'Demo Call' : 'Call'} Initiated
                      </span>
                    ) : (
                      <span className="text-xs bg-red-800 text-red-200 px-2 py-0.5 rounded">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-sm text-gray-300 mt-2">
            {callResult.message}
          </div>
        </div>
        
        <button 
          onClick={() => setCallResult(null)} 
          className="mt-3 text-xs text-gray-400 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 relative">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className={`spotlight-container p-3 w-full transition-all duration-300 ${(isProcessing || isCallProcessing) ? 'ring-2 ring-primary/30' : ''}`}>
          <div className="flex items-center gap-3">
            {/* Icon Container */}
            <div className="spotlight-icon-container">
              {isProcessing || isCallProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  {isCallProcessing ? (
                    <Phone className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Search className="h-5 w-5 text-gray-400" />
                  )}
                </motion.div>
              ) : (
                <Search className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            {/* Input Field */}
            <div className="flex-1 relative">
              {isProcessing || isCallProcessing ? (
                <div className="w-full relative overflow-hidden rounded-lg">
                  {/* Animated gradient border */}
                  <div 
                    className="absolute -inset-0.5 rounded-lg z-0 opacity-75"
                    style={{
                      background: `linear-gradient(${gradientPos}deg, ${isCallProcessing ? '#3b82f6, #10b981, #3b82f6' : '#10b981, #0ea5e9, #8b5cf6, #10b981'})`,
                      backgroundSize: "400% 400%",
                    }}
                  />
                  
                  {/* Progress bar at the top */}
                  <div className="absolute top-0 left-0 h-0.5 w-full bg-transparent z-10">
                    <motion.div 
                      className={`h-full ${isCallProcessing ? 'bg-gradient-to-r from-blue-500 via-blue-300 to-blue-500' : 'bg-gradient-to-r from-primary via-blue-500 to-primary'}`}
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
                      {isCallProcessing ? 'Processing Call...' : 'Processing...'}
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
                  placeholder="Ask anything or make a call (e.g., 'Make a phone call to Manish and say hello')"
                  className="w-full p-3 rounded-lg spotlight-input"
                  disabled={isProcessing || isCallProcessing}
                />
              )}
            </div>
            
            {/* Submit button */}
            <button
              type="submit"
              className={`spotlight-icon-container ${!query.trim() || isProcessing || isCallProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-70'}`}
              disabled={!query.trim() || isProcessing || isCallProcessing}
            >
              <Send className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </form>
      
      {/* Call Results Popup */}
      {callResult && renderCallResults()}
      
      {/* Call Error Message */}
      {callError && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-900/80 border border-red-700 text-white p-3 rounded-lg z-50">
          <div className="flex items-center gap-2">
            <span className="font-medium">Call Error:</span>
            <span>{callError}</span>
          </div>
          <button 
            onClick={() => setCallError(null)} 
            className="mt-2 text-xs text-red-200 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default QueryInput;