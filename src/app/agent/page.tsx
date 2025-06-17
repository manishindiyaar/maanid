"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, RefreshCw, Settings, X, Plus, Edit, ArrowLeft, Check, File, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentCircle from './../../components/agent/AgentCircle';

import AgentModal from './../../components/agent/AgentModal';
import PdfUpload from './../../components/agent/PdfUpload';
import { generateCompletion } from './../../lib/ai/utils/ai-client';
import { cn } from './../../lib/utils';
import ChatInterface from './../../components/chat/ChatInterface';

// Define Agent interface since we commented out the import
interface Agent {
  id?: string;
  name: string;
  description?: string;
  documents?: any[];
}

// Define PdfFile interface
interface PdfFile {
  id?: string;
  agent_id?: string;
  file?: File;
  tag: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  filename?: string;
}

// Define our own Message interface to match the chat requirements
interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  created_at?: string;
  isAI?: boolean;
  isSent: boolean;
  is_from_customer: boolean;
  direction?: 'incoming' | 'outgoing';
  is_ai_response?: boolean;
  is_viewed?: boolean;
  contact_id?: string;
  status?: string;
  metadata?: {
    documents?: Array<{
      id: string;
      filename: string;
      tag: string;
      relevance?: number;
    }>;
  };
}

export default function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Set form values when editing agent changes
  useEffect(() => {
    if (editingAgent) {
      setNameInput(editingAgent.name);
      setDescriptionInput(editingAgent.description || '');
    } else {
      setNameInput('');
      setDescriptionInput('');
    }
  }, [editingAgent]);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    
    // If the agent being edited is selected for chat, also update the editing form
    if (editingAgent?.id === agent.id) {
      setNameInput(agent.name);
      setDescriptionInput(agent.description || '');
    }
    
    setMessages([]); // Clear messages when selecting a new agent
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    
    // If the agent being edited is also the selected chat agent, update the selection too
    if (selectedAgent?.id === agent.id) {
      setSelectedAgent({...agent});
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent({
      id: 'new-agent',
      name: '',
      description: ''
    });
  };

  const handleSaveAgent = async () => {
    if (!nameInput.trim()) {
      alert('Agent name is required');
      return;
    }

    if (!editingAgent) {
      return;
    }

    try {
      const newAgent = {
        name: nameInput,
        description: descriptionInput
      };

      let response;
      if (editingAgent.id !== 'new-agent') {
        // Editing existing agent
        response = await fetch(`/api/agents`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAgent.id,
            ...newAgent
          })
        });
      } else {
        // Creating new agent
        response = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAgent)
        });
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save agent: ${error}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save agent');
      }

      // Update the agents list
      await fetchAgents();
      
      // If the currently selected agent was updated, refresh it
      if (selectedAgent && selectedAgent.id === editingAgent?.id) {
        const updatedAgent = {
          ...selectedAgent,
          ...newAgent,
          id: editingAgent.id
        };
        setSelectedAgent(updatedAgent);
      }
      
      setEditingAgent(null);
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(error instanceof Error ? error.message : 'Failed to save agent');
    }
  };

  const handleCancelEdit = () => {
    setEditingAgent(null);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/agents?id=${agentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
      
      await fetchAgents();
      
      // If the deleted agent was selected, clear the selection
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
        setMessages([]);
      }
      
      // If the deleted agent was being edited, clear the editing form
      if (editingAgent?.id === agentId) {
        setEditingAgent(null);
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleRefreshChat = () => {
    setMessages([]);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedAgent) {
      alert('Please select an agent first');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content,
        timestamp,
        created_at: timestamp,
        isSent: true,
        is_from_customer: true,
        direction: 'outgoing',
        is_ai_response: false,
        is_viewed: true
      };
      setMessages(prev => [...prev, userMessage]);

      // Show typing indicator
      setIsTyping(true);

      // Generate AI response using the API route
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: content,
          agentName: selectedAgent.name,
          agentDescription: selectedAgent.description || '',
          agentId: selectedAgent.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();

      // Add AI response
      const aiTimestamp = new Date().toISOString();
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: data.content,
        timestamp: aiTimestamp,
        created_at: aiTimestamp,
        isAI: true,
        isSent: true,
        is_from_customer: false,
        direction: 'incoming',
        is_ai_response: true,
        is_viewed: true,
        metadata: data.metadata // Include any metadata about used documents
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      alert('Failed to generate response. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 font-['Be_Vietnam_Pro']">
      <div className="h-[calc(100vh-3rem)] flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2 rounded-lg shadow-lg shadow-teal-700/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            AI Agents Testing Studio
          </h1>
        </div>
        
        <div className="flex flex-1 gap-6 h-full overflow-hidden">
          {/* Column 1: Agent List */}
          <div className="w-1/4 bg-slate-800/40 backdrop-blur-md rounded-xl border border-teal-500/20 flex flex-col overflow-hidden shadow-xl shadow-black/20">
            <div className="p-4 border-b border-teal-500/20 flex justify-between items-center bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <h2 className="text-lg font-semibold text-white">Agents</h2>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateAgent}
                className="relative overflow-hidden p-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20 group"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                <Plus className="w-5 h-5 relative z-10" />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full"
                  />
                </div>
              ) : agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 p-3 rounded-full mb-4">
                    <Bot className="w-6 h-6 text-teal-400" />
                  </div>
                  <p className="text-slate-400 text-sm mb-4">No agents created yet</p>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateAgent}
                    className="relative overflow-hidden px-4 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20 group flex items-center gap-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                    <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                    <Plus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Create Agent</span>
                  </motion.button>
                </div>
              ) : (
                agents.map((agent) => (
                  <motion.div
                    key={agent.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all border relative group",
                      (selectedAgent?.id === agent.id || editingAgent?.id === agent.id) 
                        ? "bg-teal-600/20 border-teal-500/40 shadow-md shadow-teal-500/10" 
                        : "bg-slate-800/70 border-slate-700/40 hover:bg-slate-700/50"
                    )}
                  >
                    <div 
                      className="flex items-center gap-3"
                      onClick={() => handleAgentSelect(agent)}
                    >
                      <AgentCircle 
                        name={agent.name} 
                        selected={selectedAgent?.id === agent.id} 
                        className="h-10 w-10" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{agent.name}</p>
                        {agent.description && (
                          <p className="text-slate-400 text-xs truncate">{agent.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAgent(agent);
                        }}
                        className="p-1.5 rounded-md bg-slate-700/90 text-teal-400 hover:bg-teal-700/20 border border-teal-500/20"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(agent.id!);
                        }}
                        className="p-1.5 rounded-md bg-slate-700/90 text-red-400 hover:bg-red-700/20 border border-red-500/20"
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
          
          {/* Column 2: Edit Agent */}
          <div className="w-1/3 bg-slate-800/40 backdrop-blur-md rounded-xl border border-teal-500/20 flex flex-col overflow-hidden shadow-xl shadow-black/20">
            <div className="p-4 border-b border-teal-500/20 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-teal-400" />
                {editingAgent ? (editingAgent.id === 'new-agent' ? 'Create Agent' : 'Edit Agent') : 'Agent Editor'}
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {editingAgent ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-teal-200 block">Agent Name</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter agent name"
                      className="w-full bg-slate-700/50 border border-teal-500/20 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 shadow-inner"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-teal-200 block">Description</label>
                    <textarea
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      placeholder="What does this agent do?"
                      rows={5}
                      className="w-full bg-slate-700/50 border border-teal-500/20 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none shadow-inner"
                    />
                  </div>

                  {/* Add PDF Upload Section */}
                  {editingAgent.id !== 'new-agent' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 block">Documents</label>
                      <div className="p-4 bg-gradient-to-r from-teal-900/20 to-emerald-900/20 border border-teal-500/20 rounded-xl backdrop-blur-sm transition-all shadow-lg shadow-teal-500/5">
                        <PdfUpload 
                          agentId={editingAgent.id || ''}
                          showComingSoon={true}
                          onPdfAdded={(file: PdfFile) => {
                            // Refresh the agent to show the new document
                            fetchAgents();
                          }}
                          onPdfRemoved={() => {
                            // Refresh the agent to show the removed document
                            fetchAgents();
                          }}
                        />
                        <div className="mt-4 bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 flex gap-2 text-sm">
                          <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                          <div className="text-teal-100">
                            <p>Upload PDFs to create a knowledge base for your agent. Reference document content in prompts with {'{tag}'} syntax.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancelEdit}
                      className="px-4 py-2.5 rounded-lg bg-slate-700/70 text-white hover:bg-slate-600/70 transition-colors flex-1 border border-white/5"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02, translateY: -2 }}
                      whileTap={{ scale: 0.98, translateY: 1 }}
                      onClick={handleSaveAgent}
                      className="relative overflow-hidden px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white flex-1 flex items-center justify-center gap-2 group shadow-[0_8px_15px_-6px_rgba(20,184,166,0.5)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                      <Check className="w-4 h-4 relative z-10" />
                      <span className="relative z-10 font-semibold">Save Agent</span>
                    </motion.button>
                  </div>
                </div>
              ) : selectedAgent ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <AgentCircle 
                    name={selectedAgent.name} 
                    selected={true} 
                    className="h-20 w-20 mb-3 shadow-lg shadow-teal-900/20" 
                  />
                  <h3 className="text-xl font-bold text-white mb-1">{selectedAgent.name}</h3>
                  {selectedAgent.description && (
                    <p className="text-teal-200 mb-6 opacity-70">{selectedAgent.description}</p>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEditAgent(selectedAgent)}
                    className="relative overflow-hidden px-4 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20 text-sm flex items-center gap-2 group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                    <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                    <Edit className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Edit Agent</span>
                  </motion.button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 p-3 rounded-full mb-4">
                    <Edit className="w-6 h-6 text-teal-400" />
                  </div>
                  <p className="text-slate-400 text-sm mb-2">Select an agent to edit<br/>or create a new one</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Column 3: Test Chat */}
          <div className="w-5/12 bg-slate-800/40 backdrop-blur-md rounded-xl border border-teal-500/20 flex flex-col overflow-hidden shadow-xl shadow-black/20">
            <div className="p-4 border-b border-teal-500/20 flex justify-between items-center bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {selectedAgent ? (
                  <>
                    <AgentCircle 
                      name={selectedAgent.name} 
                      selected={true} 
                      className="h-6 w-6" 
                    />
                    Chat with {selectedAgent.name}
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5 text-teal-400" />
                    Test Agent
                  </>
                )}
              </h2>
              {selectedAgent && (
                <div className="flex items-center gap-2">
                  {selectedAgent.documents && selectedAgent.documents.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-teal-900/30 border border-teal-500/30 rounded-lg text-xs relative">
                      <File className="w-3 h-3 text-teal-400" />
                      <span className="text-teal-300">{selectedAgent.documents.length} documents</span>
                      <span className="absolute -right-6 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[0.6rem] font-semibold rounded-full animate-pulse">
                        Beta
                      </span>
                    </div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefreshChat}
                    className="p-2 rounded-lg text-teal-400 hover:bg-teal-950/50 transition-colors border border-teal-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              {selectedAgent ? (
                <>
                  <ChatInterface
                    customerName={selectedAgent.name}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isTyping={isTyping}
                    renderMessageMetadata={(message) => {
                      // Use optional chaining and type assertion to safely access metadata
                      const metadata = (message as any).metadata;
                      if (metadata?.documents) {
                        return (
                          <div className="mt-2 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <File className="w-3 h-3" />
                              <span>Used documents:</span>
                            </div>
                            <div className="mt-1 space-y-1">
                              {metadata.documents.map((doc: any) => (
                                <div key={doc.id} className="flex items-center gap-2">
                                  <span className="text-gray-500">•</span>
                                  <span>{doc.filename}</span>
                                  {doc.relevance && (
                                    <span className="text-gray-500">
                                      ({Math.round(doc.relevance * 100)}% relevant)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 p-3 rounded-full mb-4">
                    <Bot className="w-6 h-6 text-teal-400" />
                  </div>
                  <p className="text-slate-400 text-sm mb-2">Select an agent to chat</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 