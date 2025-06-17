"use client"

import { useState, useEffect } from "react"
import { Settings, Plus, ArrowLeft, Bot, Sparkles, Search, PlusCircle, Grid, List, X, File } from "lucide-react"
import AgentModal, { Agent } from "./AgentModal"
import AgentCircle from "./AgentCircle"
import PdfUpload from "./PdfUpload"
import { motion, AnimatePresence } from "framer-motion"
import { BackButton } from "./../ui/back-button"
import { toast } from 'sonner'

interface SetupAgentProps {
  isOpen: boolean
  onClose: () => void
}

export default function SetupAgent({ isOpen, onClose }: SetupAgentProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isCreatingNewAgent, setIsCreatingNewAgent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPdfUpload, setShowPdfUpload] = useState(false)

  // Fetch agents on component mount
  useEffect(() => {
    if (isOpen) {
      fetchAgents()
    }
  }, [isOpen])

  // Filter agents based on search query
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const fetchAgents = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/agents')
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch agents')
      }

      setAgents(data.data)
    } catch (error) {
      console.error('Error fetching agents:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch agents')
      toast.error('Failed to fetch agents')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAgent = async (newAgent: Omit<Agent, "id">) => {
    try {
      if (selectedAgent) {
        // Update existing agent
        const response = await fetch(`/api/agents`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: selectedAgent.id,
            name: newAgent.name,
            description: newAgent.description
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Failed to update agent: ${error}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update agent')
        }

        setAgents(agents.map(agent => 
          agent.id === selectedAgent.id ? result.data : agent
        ))

        toast.success('Agent updated successfully')
        return result.data
      } else {
        // Create new agent
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newAgent.name,
            description: newAgent.description
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Failed to create agent: ${error}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create agent')
        }

        setAgents([result.data, ...agents])
        toast.success('Agent created successfully')
        return result.data
      }
    } catch (error) {
      console.error("Error saving agent:", error)
      toast.error(error instanceof Error ? error.message : 'Failed to save agent')
      return undefined
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return
    }

    try {
      const response = await fetch(`/api/agents?id=${agentId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete agent')
      }

      setAgents(agents.filter(agent => agent.id !== agentId))
      toast.success('Agent deleted successfully')
    } catch (error) {
      console.error("Error deleting agent:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete agent")
    }
  }

  if (!isOpen) return null

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-20 flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400 to-teal-600 animate-ping opacity-75"></div>
          <div className="absolute inset-0 rounded-full border-t-2 border-teal-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Bot className="h-8 w-8 text-teal-300" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-20 flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-red-500 mb-4">{error}</div>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchAgents}
          className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg shadow-[0_8px_15px_-6px_rgba(20,184,166,0.5)] group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
          <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
          <span className="relative z-10 font-['Be_Vietnam_Pro'] font-medium">Retry</span>
        </motion.button>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-20 overflow-hidden flex flex-col"
        >
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, type: "spring", damping: 20 }}
            className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 border-b border-teal-500/20 backdrop-blur-md p-6 flex justify-between items-center sticky top-0 z-10"
          >
            <div className="flex items-center space-x-6">
              <BackButton onClick={onClose} />
              <h1 className="text-2xl font-bold text-white flex items-center gap-3 font-['Be_Vietnam_Pro']">
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2 rounded-lg shadow-lg shadow-teal-700/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                {agents.length === 0 ? "Create Your First Agent" : "Your Agents"}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-800/50 backdrop-blur-md border border-teal-500/20 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md' : 'text-gray-400 hover:text-teal-300'}`}
                >
                  <Grid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md' : 'text-gray-400 hover:text-teal-300'}`}
                >
                  <List size={16} />
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-teal-300" />
                </div>
                <input
                  type="text"
                  className="py-2 pl-10 pr-4 bg-slate-800/50 backdrop-blur-md border border-teal-500/20 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-transparent w-64 font-['Be_Vietnam_Pro']"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsCreatingNewAgent(true)}
                className="relative overflow-hidden flex items-center gap-2 text-white bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 rounded-lg font-medium shadow-[0_8px_15px_-6px_rgba(20,184,166,0.5)] group font-['Be_Vietnam_Pro']"
                title="Create New Agent"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                
                <PlusCircle className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Create Agent</span>
              </motion.button>
            </div>
          </motion.div>

          <AgentModal 
            isOpen={!!selectedAgent || isCreatingNewAgent}
            onClose={() => {
              setSelectedAgent(null)
              setIsCreatingNewAgent(false)
            }}
            onSave={handleSaveAgent}
            agent={selectedAgent}
          />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex-1 overflow-y-auto p-6"
          >
            {agents.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 25 }}
                className="flex flex-col items-center justify-center mt-12 text-center p-8 rounded-xl bg-gradient-to-b from-teal-900/20 to-teal-800/10 border border-teal-500/20 backdrop-blur-md max-w-lg mx-auto shadow-xl shadow-teal-900/20"
              >
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-full mb-6 shadow-lg shadow-teal-700/20">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-['Be_Vietnam_Pro']">No Agents Created Yet</h3>
                <p className="text-gray-300 mb-6 font-['Be_Vietnam_Pro']">
                  Create your first agent to help automate your workflow. Agents can assist with tasks, respond to messages, and more.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsCreatingNewAgent(true)}
                  className="relative overflow-hidden flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-medium shadow-[0_8px_15px_-6px_rgba(20,184,166,0.5)] group font-['Be_Vietnam_Pro']"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                  
                  <PlusCircle size={18} className="relative z-10" />
                  <span className="relative z-10">Create Your First Agent</span>
                </motion.button>
              </motion.div>
            ) : viewMode === 'grid' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
              >
                {filteredAgents.map((agent, index) => (
                  <motion.div 
                    key={agent.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group"
                  >
                    <div className="rounded-xl overflow-hidden flex flex-col items-center p-6 bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-teal-500/10 backdrop-blur-md hover:shadow-lg hover:shadow-teal-500/10 transition-all">
                      <AgentCircle 
                        name={agent.name} 
                        className="w-20 h-20 mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-teal-900/20"
                      />
                      
                      <div className="text-center w-full">
                        <h3 className="font-medium text-white truncate font-['Be_Vietnam_Pro']">{agent.name}</h3>
                        {agent.description && (
                          <p className="text-teal-200 text-sm truncate mt-1 opacity-70 font-['Be_Vietnam_Pro']">{agent.description}</p>
                        )}
                      </div>
                      
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all rounded-xl">
                        <motion.button 
                          whileHover={{ scale: 1.1, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedAgent(agent)}
                          className="p-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-full shadow-lg shadow-teal-700/20"
                        >
                          <Settings size={18} />
                        </motion.button>
                        
                        <motion.button 
                          whileHover={{ scale: 1.1, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteAgent(agent.id!)}
                          className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-lg shadow-red-700/20"
                        >
                          <X size={18} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3 max-w-4xl mx-auto"
              >
                {filteredAgents.map((agent, index) => (
                  <motion.div 
                    key={agent.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-teal-500/10 backdrop-blur-md hover:shadow-lg hover:shadow-teal-500/10 transition-all group"
                  >
                    <AgentCircle 
                      name={agent.name} 
                      className="w-12 h-12 group-hover:scale-105 transition-transform flex-shrink-0 shadow-md shadow-teal-900/20"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white font-['Be_Vietnam_Pro']">{agent.name}</h3>
                      {agent.description && (
                        <p className="text-teal-200 text-sm truncate opacity-70 font-['Be_Vietnam_Pro']">{agent.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedAgent(agent)}
                        className="p-2 bg-slate-800/80 text-teal-400 rounded-lg hover:bg-teal-700/20 border border-teal-500/20 transition-colors"
                      >
                        <Settings size={18} />
                      </motion.button>
                      
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteAgent(agent.id!)}
                        className="p-2 bg-slate-800/80 text-red-400 rounded-lg hover:bg-red-700/20 border border-red-500/20 transition-colors"
                      >
                        <X size={18} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 