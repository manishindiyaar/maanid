"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Search, Send, Bot, Plus, Zap, Eye, Moon, Sun } from "lucide-react"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (query.trim() && !isProcessing) {
      onSubmit(query)
      setQuery("")
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
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Search className="h-5 w-5 text-gray-400" />
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
                  placeholder="Search or type a command..."
                  className="w-full p-3 rounded-lg spotlight-input focus:outline-none"
                  disabled={isProcessing}
                />
              </div>
              {query.length > 0 && (
                <button
                  type="submit"
                  className="spotlight-icon-container hover:bg-opacity-70"
                  disabled={!query.trim() || isProcessing}
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
    </div>
  )
}

export default AdvancedSearchBar