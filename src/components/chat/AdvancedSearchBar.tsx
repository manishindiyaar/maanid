"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Search, Send, Bot, Plus, Zap, Eye, Moon, Sun, Phone } from "lucide-react"
import useDebounce from "../../hooks/use-debounce"
import { useTheme } from "./../theme-provider"
import QueryInput from "./QueryInput"
import { useRouter } from "next/navigation"

interface Action {
  id: string
  label: string
  icon: React.ReactNode
  description?: string
  short?: string
  end?: string
  onClick?: () => void
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

interface AdvancedSearchBarProps {
  onSubmit: (query: string) => void
  isProcessing?: boolean
  onCreateAgent?: () => void
  onConnectAccount?: () => void
  onBotView?: () => void
  onAutopilotToggle?: () => void
  isAutopilotActive?: boolean
}

const AdvancedSearchBar = ({
  onSubmit,
  isProcessing = false,
  onCreateAgent,
  onConnectAccount,
  onBotView,
  onAutopilotToggle,
  isAutopilotActive = false
}: AdvancedSearchBarProps) => {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [showOriginalQueryInput, setShowOriginalQueryInput] = useState(false)
  const debouncedQuery = useDebounce(query, 200)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [callResult, setCallResult] = useState<CallResponse | null>(null)
  const [callError, setCallError] = useState<string | null>(null)
  const [isCallProcessing, setIsCallProcessing] = useState(false)

  // Define actions with their handlers
  const getActions = (): Action[] => [
    {
      id: "1",
      label: "QueryInput",
      icon: <Search className="h-4 w-4 text-blue-400" />,
      description: "Search and filter data",
      end: "Default",
      onClick: () => {
        // Show the original QueryInput component
        setShowOriginalQueryInput(true)
        setSelectedAction(null)
        setIsFocused(false)
      }
    },
    {
      id: "2",
      label: "Create Agent",
      icon: <Bot className="h-4 w-4 text-purple-400" />,
      description: "Set up a new agent",
      end: "Action",
      onClick: onCreateAgent
    },
    {
      id: "3",
      label: "Connect Account",
      icon: <Plus className="h-4 w-4 text-green-400" />,
      description: "Link a new account",
      end: "Action",
      onClick: onConnectAccount
    },
    {
      id: "4",
      label: "Bot View",
      icon: <Eye className="h-4 w-4 text-orange-400" />,
      description: "View connected bots",
      end: "View",
      onClick: () => {
        // Redirect to the bots page
        router.push('/bots')
      }
    },
    {
      id: "5",
      label: `${isAutopilotActive ? 'Deactivate' : 'Activate'} Autopilot`,
      icon: <Zap className={`h-4 w-4 ${isAutopilotActive ? 'text-yellow-400' : 'text-gray-400'}`} />,
      description: `${isAutopilotActive ? 'Turn off' : 'Turn on'} automated responses`,
      end: isAutopilotActive ? "Active" : "Inactive",
      onClick: () => {
        if (onAutopilotToggle) {
          console.log("Toggling autopilot from AdvancedSearchBar");
          onAutopilotToggle();
        }
      }
    },
    {
      id: "6",
      label: `${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: theme === 'dark' 
        ? <Sun className="h-4 w-4 text-amber-400" /> 
        : <Moon className="h-4 w-4 text-indigo-400" />,
      description: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
      end: theme === 'dark' ? "Dark" : "Light",
      onClick: () => {
        console.log("Theme toggle clicked in AdvancedSearchBar");
        toggleTheme();
      }
    },
    {
      id: "7",
      label: "Make a Call",
      icon: <Phone className="h-4 w-4 text-green-400" />,
      description: "Call contacts with a message",
      end: "Action",
      onClick: () => {
        setQuery("make a phone call to Manish and say ");
        setIsFocused(false);
      }
    }
  ]

  const [filteredActions, setFilteredActions] = useState<Action[]>(getActions())

  useEffect(() => {
    // Update actions when autopilot or theme status changes
    setFilteredActions(getActions())
  }, [isAutopilotActive, theme])

  useEffect(() => {
    if (!isFocused) {
      return
    }

    if (!debouncedQuery) {
      setFilteredActions(getActions())
      return
    }

    const normalizedQuery = debouncedQuery.toLowerCase().trim()
    const filtered = getActions().filter((action) => {
      const searchableText = `${action.label} ${action.description || ''}`.toLowerCase()
      return searchableText.includes(normalizedQuery)
    })

    setFilteredActions(filtered)
  }, [debouncedQuery, isFocused, isAutopilotActive, theme])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      console.log("AdvancedSearchBar - Processing query:", query);
      
      // Check if any pattern matches
      let isCallQuery = false;
      for (const pattern of callPatterns) {
        if (pattern.test(query)) {
          console.log("AdvancedSearchBar - Matched call pattern:", pattern);
          isCallQuery = true;
          break;
        }
      }
      
      if (isCallQuery) {
        // Process as a call request
        console.log("AdvancedSearchBar - Processing as call request");
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
          console.log("AdvancedSearchBar - Call API response:", data);

          if (!response.ok) {
            throw new Error(data.error || 'Failed to process call request');
          }

          setCallResult(data);
          
          // Don't send to normal query handler since we're handling it here
          // onSubmit(`[Call Request] ${query}`);
        } catch (err) {
          console.error("AdvancedSearchBar - Call error:", err);
          setCallError(err instanceof Error ? err.message : 'An error occurred with the call');
          // Only send error to normal query handler
          onSubmit(`[Call Error] ${query} - ${err instanceof Error ? err.message : 'An error occurred'}`);
        } finally {
          setIsCallProcessing(false);
          setQuery("");
        }
      } else {
        // Process as a normal query
        console.log("AdvancedSearchBar - Processing as normal query");
        onSubmit(query)
        setQuery("")
      }
      setIsFocused(false)
    }
  }

  const handleActionClick = (action: Action) => {
    setSelectedAction(action)
    if (action.onClick) {
      action.onClick()
    }
    setIsFocused(false)
  }

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

  // Animation variants
  const container = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: {
          duration: 0.4,
        },
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: {
          duration: 0.3,
        },
        opacity: {
          duration: 0.2,
        },
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  }

  return (
    <div className="flex-1 relative">
      {showOriginalQueryInput ? (
        // Render the original QueryInput component
        <div className="relative">
          <QueryInput 
            onSubmit={(query) => {
              onSubmit(query)
              // After submission, we can optionally switch back to the advanced search
              // setShowOriginalQueryInput(false)
            }}
            isProcessing={isProcessing}
          />
          <button 
            onClick={() => setShowOriginalQueryInput(false)}
            className="absolute right-0 top-0 -mt-8 text-xs text-gray-400 hover:text-white"
          >
            Switch to Advanced Search
          </button>
        </div>
      ) : (
        // Render the Spotlight-inspired search
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 items-center">
          <div className="w-full max-w-2xl spotlight-container p-3">
            <div className="flex items-center gap-3">
              <div className="spotlight-icon-container">
                {isProcessing || isCallProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  placeholder="Start prompting to our AI"
                  className="w-full p-3 rounded-lg spotlight-input focus:outline-none"
                  disabled={isProcessing || isCallProcessing}
                />
              </div>
              {query.length > 0 && (
                <button
                  type="submit"
                  className="spotlight-icon-container hover:bg-opacity-70"
                  disabled={!query.trim() || isProcessing || isCallProcessing}
                >
                  <Send className="h-5 w-5 text-gray-400" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isFocused && filteredActions.length > 0 && (
                <motion.div
                  className="w-full mt-3 spotlight-dropdown rounded-lg overflow-hidden"
                  variants={container}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <motion.ul className="py-2">
                    {filteredActions.map((action) => (
                      <motion.li
                        key={action.id}
                        className="px-4 py-3 mx-2 my-1 flex items-center justify-between spotlight-item cursor-pointer"
                        variants={item}
                        layout
                        onClick={() => handleActionClick(action)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="spotlight-icon-container">
                            {action.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{action.label}</div>
                            <div className="text-xs text-gray-400">{action.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-md">{action.end}</span>
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                  <div className="px-4 py-2 border-t border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Click to select a command</span>
                      <span>ESC to cancel</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      )}
      
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
  )
}

export default AdvancedSearchBar