"use client"

import { useState, useEffect, useRef } from "react"
import { 
  X, RotateCw, CheckCircle, Check, Loader2, Users, MessageCircle, BarChart, 
  Brain, Bot, Zap, Search, Share2, Network, SendHorizonal, ArrowRightCircle,
  SparklesIcon, Fingerprint, CpuIcon, Code, MessageSquare
} from "lucide-react"
import { Button } from "./../components/ui/button"
import { cn } from "./../lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { getApiBaseUrl } from "./../lib/utils"
import React from "react"


interface CombinedMessagingPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface Message {
  id: string
  customerName: string
  avatar: string
  message: string
  timestamp: Date
  status: "new" | "analyzing" | "delegating" | "replying" | "completed" | "error"
  contactId: string
  contactInfo: string
  processingStage?: {
    stage: "analyzing" | "delegating" | "replying" | "completed" | "error"
    details: string
  }
  agentName?: string
  agentDescription?: string
  response?: string
  processingDetails?: {
    scoredAgents?: Array<{name: string, score: number}>
    selectedAgent?: string
    agentDescription?: string
    responsePreview?: string
  }
  isAIResponse?: boolean
  errorCleanupScheduled?: boolean
}

// Debounce utility function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Add a PowerButton component
const PowerButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 backdrop-blur-md border",
        isActive 
          ? "bg-teal-500/70 hover:bg-teal-600/80 text-white border-teal-400/30" 
          : "bg-gray-700/50 hover:bg-gray-800/60 text-gray-200 border-gray-600/30"
      )}
    >
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ 
          opacity: isActive ? 1 : 0.8,
          rotateZ: isActive ? 180 : 0
        }}
        transition={{ duration: 0.5 }}
        className="text-white"
      >
        <svg
          className="w-8 h-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M18.36 6.64a9 9 0 1 1-12.73 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="12" y1="2" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      
      {/* Add a pulsing effect for active state */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-teal-500/30"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 0.3, 0.7]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            repeatType: "loop"
          }}
        />
      )}
    </motion.button>
  )
}

export default function CombinedMessagingPanel({ isOpen, onClose }: CombinedMessagingPanelProps) {
  const [isPowered, setIsPowered] = useState(false)
  const [isAutopilotActive, setIsAutopilotActive] = useState(false)
  const [lastPing, setLastPing] = useState<Date | null>(null)
  const [backendStatus, setBackendStatus] = useState<"up" | "down" | "unknown">("unknown")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showMessage, setShowMessage] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [timer, setTimer] = useState(30) // Add timer state
  const [isHealthy, setIsHealthy] = useState(true) // Add health state
  const [stats, setStats] = useState({
    unread: 0,
    responded: 0,
    replied: 0, // Keep 'replied' for backward compatibility
    customers: [] as string[],
    uniqueMessageIds: [] as string[]
  })
  const [parallelProcessing, setParallelProcessing] = useState(false)
  // Change this to a Set to fix 'has' and 'size' errors
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set<string>())
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  
  // Add ref for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Keep track of messages that have been completed locally to avoid reprocessing
  const [completedMessageIds] = useState(new Set<string>())
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  
  // Add this to the component state (near other useState declarations in the CombinedMessagingPanel component)
  const [expandedMessages, setExpandedMessages] = useState<Set<string | number>>(new Set());

  // Replace WebSocket connection with polling
  useEffect(() => {
    // This effect is purely for UI updates when the panel is open
    // The orchestration happens in the background via the autopilot system
    if (isOpen) {
      // Set up polling for UI updates only when the panel is visible
      const pollInterval = setInterval(() => {
        fetchUnseenMessages();
      }, 1000); // Poll every 1 seconds when the panel is open
      
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [isOpen]);

  // Add a separate useEffect to ensure autopilot stays active in the background
  useEffect(() => {
    // This runs once on app load to ensure autopilot is working in the background
    const checkAutopilotOnLoad = async () => {
      try {
        // Check current status
        const response = await fetch(`${baseUrl}/api/autopilot/status`);
        const data = await response.json();
        
        // If autopilot is not active, activate it
        if (!data.active) {
          console.log("Activating autopilot in background");
          const toggleResponse = await fetch(`${baseUrl}/api/autopilot/toggle`, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ active: true }),
          });
          
          if (toggleResponse.ok) {
            console.log("Successfully activated autopilot in background");
          }
        } else {
          console.log("Autopilot already active in background");
        }
      } catch (error) {
        console.error("Error ensuring autopilot is active:", error);
      }
    };
    
    // Run this check on component mount
    checkAutopilotOnLoad();
    
    // Set up an interval to keep checking the background autopilot
    const backgroundInterval = setInterval(() => {
      checkAutopilotOnLoad();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      clearInterval(backgroundInterval);
    };
  }, []);

  // Function to check message status
  const checkMessageStatus = async (messageId: string) => {
    try {
      console.log(`Checking status for message ${messageId}`);
      
      // Check for admin mode from cookie
      const isAdmin = document.cookie.includes('admin_mode=true');
      
      const response = await fetch(`${baseUrl}/api/messages/status?id=${messageId}`, {
        headers: {
          'x-bladex-user-mode': (!isAdmin).toString(),
          'x-user-email': localStorage.getItem('user_email') || '',
        }
      });
      
      if (!response.ok) {
        console.error(`Error checking message status: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      console.log(`Status response for ${messageId}:`, data);
      
      if (data.success && data.message) {
        // Update message in state
        setMessages(prev => 
          prev.map(m => m.id === messageId ? { 
            ...m, 
            status: data.message.status,
            processingStage: data.message.processingStage,
            processingDetails: data.message.processingDetails,
            agentName: data.message.agentName,
            agentDescription: data.message.agentDescription,
            response: data.message.response
          } : m)
        );
        
        // If message is completed or error, release the processing ID
        if (data.message.status === 'completed' || data.message.status === 'error') {
          console.log(`Message ${messageId} processing complete with status: ${data.message.status}`);
          setCurrentProcessingId(null);
        }
      }
    } catch (error) {
      console.error('Error checking message status:', error);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Set up timer for refreshing messages
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            fetchUnseenMessages()
              return 5
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isOpen])

  // Fetch unseen messages and check backend health when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchUnseenMessages()
      checkBackendHealth()
      checkAutopilotStatus()
    }
  }, [isOpen])

  // Function to manually refresh the countdown
  const countdown = () => {
    setTimer(5)
    fetchUnseenMessages()
  }

  // Process new messages when they arrive
  useEffect(() => {
    const newMessages = messages.filter((m) => m.status === "new")
    console.log(`Message processing check: ${newMessages.length} new messages, currentProcessingId: ${currentProcessingId}, autopilot: ${isAutopilotActive}, processingIds: ${processingIds.size}`);
    
    if (newMessages.length > 0) {
      console.log("New messages available:", JSON.stringify(newMessages.map(m => ({ id: m.id, message: m.message })), null, 2));
      
      // If autopilot is active, process messages
      if (isAutopilotActive) {
        // If parallel processing is enabled, use that mode
        if (parallelProcessing) {
          // Filter out messages that are already being processed
          const notBeingProcessed = newMessages.filter(m => !processingIds.has(m.id));
          
          if (notBeingProcessed.length > 0) {
            console.log(`Processing ${notBeingProcessed.length} new messages in parallel mode`);
            processMessagesInParallel(notBeingProcessed);
          }
        } 
        // Otherwise use the sequential processing with currentProcessingId
        else {
          // Check if current processing is stuck
          if (currentProcessingId) {
            const processingMessage = messages.find(m => m.id === currentProcessingId);
            
            // If the message is not found or completed/error, we can reset the ID
            if (!processingMessage || 
                processingMessage.status === 'completed' || 
                processingMessage.status === 'error') {
              console.log(`Resetting stale processing ID ${currentProcessingId}`);
              setCurrentProcessingId(null);
            } else {
              // If we're genuinely processing, log the status and return
              console.log(`Currently processing message ${currentProcessingId} with status ${processingMessage.status}`);
              return;
            }
          }
          
          // If we can process now (no valid currentProcessingId), do it
          if (newMessages.length > 1) {
            console.log(`Found ${newMessages.length} new messages to process in batch`);
            processBatchMessages(newMessages);
          } else {
            // Process single message as before
            const newMessage = newMessages[0]
            console.log(`Auto-processing new message: ${newMessage.id}`);
            setCurrentProcessingId(newMessage.id)
            processMessage(newMessage.id)
          }
        }
      }
    }
  }, [messages, currentProcessingId, isAutopilotActive, processingIds, parallelProcessing])

  // Function to fetch unseen messages
  const fetchUnseenMessages = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if autopilot is active
      const autopilotResponse = await fetch(`${baseUrl}/api/autopilot/status`)
      const autopilotData = await autopilotResponse.json()
      setIsAutopilotActive(autopilotData.active)

      console.log("📥 Fetching unseen messages from API endpoint");
      // Only fetch unseen messages if autopilot is active
      if (autopilotData.active) {
        // Check for admin mode from cookie
        const isAdmin = document.cookie.includes('admin_mode=true');
        console.log(`👤 Current mode when fetching messages: ${isAdmin ? 'Admin Mode' : 'User Mode'}`);

        const response = await fetch(`${baseUrl}/api/messages/unseen`, {
          headers: {
            'x-bladex-user-mode': (!isAdmin).toString(),
            'x-user-email': localStorage.getItem('user_email') || '',
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch unseen messages: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`Found ${data.messages?.length || 0} unseen messages`);
        
        if (data.success && data.messages.length > 0) {
          console.log("Raw unseen messages:", JSON.stringify(data.messages, null, 2));
          
          // Mark all unseen messages as viewed in the database first to prevent them from being fetched again
          const messageIds = data.messages.map((msg: any) => msg.id);
          console.log(`Marking ${messageIds.length} messages as viewed in database: ${JSON.stringify(messageIds)}`);
          
          // Call a new API endpoint to mark messages as viewed
          try {
            const markViewedResponse = await fetch(`${baseUrl}/api/messages/mark-viewed`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ messageIds }),
            });
            
            if (!markViewedResponse.ok) {
              console.error(`Failed to mark messages as viewed: ${markViewedResponse.status}`);
            } else {
              console.log(`Successfully marked ${messageIds.length} messages as viewed`);
            }
          } catch (viewError) {
            console.error("Error marking messages as viewed:", viewError);
          }
          
          // Transform messages to our format
          const transformedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            customerName: msg.contacts?.name || msg.contact_name || "Unknown Customer",
            avatar: msg.contacts?.avatar_url || "/avatars/customer.png",
            message: msg.content,
            timestamp: new Date(msg.timestamp),
            status: "new",
            contactId: msg.contact_id,
            contactInfo: msg.contacts?.contact_info || msg.contact_info,
            isAIResponse: false
          }))
          
          console.log("Transformed messages:", JSON.stringify(transformedMessages, null, 2));
          
          // Check if any of these messages have already been processed 
          // by checking with the server's processedMessages set
          if (transformedMessages.length > 0) {
            try {
              // Query the orchestration debug endpoint to get the list of processed messages
              const debugResponse = await fetch(`${baseUrl}/api/orchestration?endpoint=debug`);
              if (debugResponse.ok) {
                const debugData = await debugResponse.json();
                console.log(`Debug data from server:`, debugData);
                
                // Filter out any messages that are already in the server's processedMessages set
                if (debugData.processedMessages && Array.isArray(debugData.processedMessages)) {
                  const processedIds = new Set(debugData.processedMessages);
                  const originalCount = transformedMessages.length;
                  
                  transformedMessages.forEach((msg: any) => {
                    if (processedIds.has(msg.id)) {
                      console.log(`Message ${msg.id} is already in server's processedMessages set, marking as completed`);
                      msg.status = "completed";
                      msg.processingStage = {
                        stage: "completed",
                        details: "Message was already processed by the server"
                      };
                    }
                  });
                  
                  console.log(`Filtered ${originalCount - transformedMessages.length} already processed messages`);
                }
              }
            } catch (debugError) {
              console.error("Error checking server processed messages:", debugError);
            }
          }
          
          // Only add messages that don't already exist in our state
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const newMsgs = transformedMessages.filter((m: any) => !existingIds.has(m.id))
            
            if (newMsgs.length > 0) {
              console.log(`Adding ${newMsgs.length} new messages to UI:`, JSON.stringify(newMsgs.map((m: any) => m.id)));
              // Update stats
              setStats((prev) => {
                // Get unique contact IDs from new messages
                const newContactIds = newMsgs.map((m: any) => m.contactId)
                
                // Create a set of all unique contact IDs (existing + new)
                const uniqueContactIds = Array.from(
                  new Set([...prev.customers, ...newContactIds])
                )
                
                return {
                  ...prev,
                  unread: prev.unread + newMsgs.length,
                  customers: uniqueContactIds,
                  uniqueMessageIds: [...prev.uniqueMessageIds, ...newMsgs.map((m: any) => m.id)]
                }
              })
              
              // Sort messages by timestamp, newest first
              const allMessages = [...prev, ...newMsgs].sort((a, b) => 
                b.timestamp.getTime() - a.timestamp.getTime()
              )
              
              // Log the updated message state
              console.log(`Total messages after update: ${allMessages.length}`);
              
              return allMessages
            } else {
              console.log("No new messages to add to UI (already exist in state)");
            }
            
            return prev
          })
        } else {
          console.log("No new messages returned from API or success=false");
        }
      } else {
        console.log("Autopilot inactive, skipping message fetch");
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError(error instanceof Error ? error.message : "Failed to fetch messages")
      
      // Auto-clean any error after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setLoading(false)
      
      // Check if we have new messages to process and autopilot is active
      if (isAutopilotActive && !currentProcessingId) {
        // Only process messages with 'new' status and avoid any that
        // might have been marked as completed already
        const newMessage = messages.find(m => 
          m.status === "new" && 
          // Avoid starting processing on messages that were just added and might 
          // already be in the processed state on the server
          new Date().getTime() - m.timestamp.getTime() > 5000
        );
        
        if (newMessage) {
          console.log(`Auto-initiating processing for message: ${newMessage.id}`);
          // Check the message status on the server before starting processing
          try {
            const statusResponse = await fetch(`${baseUrl}/api/orchestration?id=${newMessage.id}`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log(`Server status for message ${newMessage.id}:`, statusData);
              
              // Only process if the server doesn't show it as completed or already processing
              if (statusData.status?.status === 'completed') {
                console.log(`Message ${newMessage.id} is already completed on the server, not processing again`);
                // Update our local state to match the server
                setMessages(prev => 
                  prev.map(m => m.id === newMessage.id ? {
                    ...m,
                    status: 'completed',
                    processingStage: statusData.status.processingStage,
                    agentName: statusData.status.agentName,
                    agentDescription: statusData.status.agentDescription,
                    response: statusData.status.response,
                    processingDetails: statusData.status.processingDetails
                  } : m)
                );
                return;
              } else if (statusData.status?.status === 'processing' || 
                         statusData.status?.status === 'analyzing' ||
                         statusData.status?.status === 'replying') {
                console.log(`Message ${newMessage.id} is already being processed on the server, not starting again`);
                // Update our local state to match the server
                setMessages(prev => 
                  prev.map(m => m.id === newMessage.id ? {
                    ...m,
                    status: statusData.status.status,
                    processingStage: statusData.status.processingStage,
                    agentName: statusData.status.agentName,
                    agentDescription: statusData.status.agentDescription
                  } : m)
                );
                return;
              }
            }
          } catch (statusError) {
            console.error(`Error checking message status before processing:`, statusError);
          }
          
          // Set as current processing message
          setCurrentProcessingId(newMessage.id);
          // Start processing
          processMessage(newMessage.id);
        } else {
          console.log('No new messages to process after fetch');
        }
      } else if (!isAutopilotActive) {
        console.log('Autopilot is inactive - not auto-processing messages');
      } else if (currentProcessingId) {
        console.log(`Already processing message ${currentProcessingId} - not starting another`);
      }
    }
  }

  // Function to process a message through stages
  const processMessage = async (messageId: string) => {
    // Check if the message is already being processed
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      console.error(`Message with ID ${messageId} not found in state`);
      return;
    }
    
    // Check if this message has already been completed previously
    if (completedMessageIds.has(messageId)) {
      console.log(`Message ${messageId} has already been completed previously, not processing again`);
      return;
    }
    
    // Don't process if already in progress or completed
    if (message.status !== 'new' && message.status !== 'error') {
      console.log(`Message ${messageId} is already being processed or completed (status: ${message.status})`);
      return;
    }

    try {
      console.log(`Starting processing for message ${messageId}`);
      // Update message status to "analyzing" with processing stage details
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { 
          ...m, 
          status: 'analyzing',
          processingStage: {
            stage: 'analyzing',
            details: 'AI is analyzing the message content...'
          }
        } : m)
      );
      
      // Check for admin mode from cookie
      const isAdmin = document.cookie.includes('admin_mode=true') || document.cookie.includes('admin_session=true');
      const userEmail = localStorage.getItem('user_email') || '';
      const supabaseUrl = localStorage.getItem('supabase_url') || '';
      const supabaseKey = localStorage.getItem('supabase_anon_key') || '';
      
      console.log(`Current mode when processing message: ${isAdmin ? 'Admin Mode' : 'User Mode'}`);
      console.log(`User credentials available: Email=${!!userEmail}, URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);
      
      // Call the new orchestration API to process the message
      console.log(`Processing message ${messageId} via orchestration API: ${baseUrl}/api/orchestration`);
      
      // Initial API call to start processing
      const startResponse = await fetch(`${baseUrl}/api/orchestration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bladex-user-mode': 'true', // Always use user credentials for database access
          'x-user-email': userEmail,
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ id: messageId }),
      });

      if (!startResponse.ok) {
        console.error(`API error: ${startResponse.status} ${startResponse.statusText}`);
        throw new Error(`API error: ${startResponse.status}`);
      }
      
      const startData = await startResponse.json();
      console.log(`Orchestration API response:`, startData);

      // Initialize the polling for status updates
      const pollStatus = async () => {
        let intervalId: NodeJS.Timeout | null = null;
        let hasCompletedOrErrored = false;
        let pollCount = 0;
        const MAX_POLLS = 60; // Max number of polls (60 * 2 seconds = 2 minutes max)
        
        const checkStatus = async () => {
          try {
            // Stop polling if we've already completed or errored
            if (hasCompletedOrErrored) {
              console.log(`Message ${messageId} has already completed or errored, stopping polling`);
              if (intervalId) clearInterval(intervalId);
              return true;
            }
            
            // Stop polling if we've exceeded the maximum number of polls
            if (pollCount >= MAX_POLLS) {
              console.log(`Reached max polls (${MAX_POLLS}) for message ${messageId}, stopping polling`);
              if (intervalId) clearInterval(intervalId);
              
              // Update UI to show error
              setMessages(prev => 
                prev.map(m => m.id === messageId ? { 
                  ...m, 
                  status: 'error',
                  processingStage: {
                    stage: 'error',
                    details: 'Processing timed out after 2 minutes'
                  }
                } : m)
              );
              
              // Release the current processing ID
              setCurrentProcessingId(null);
              
              return true; // Stop polling
            }
            
            pollCount++;
            
            // Check for admin mode from cookie for status check
            const isAdmin = document.cookie.includes('admin_mode=true') || document.cookie.includes('admin_session=true');
            const userEmail = localStorage.getItem('user_email') || '';
            
            const response = await fetch(`${baseUrl}/api/orchestration?id=${messageId}`, {
              headers: {
                'x-bladex-user-mode': 'true', // Always use user credentials for database access
                'x-user-email': userEmail
              },
              credentials: 'include' // Include cookies in the request
            });
            
            if (!response.ok) {
              console.error(`Status API error: ${response.status} ${response.statusText}`);
              throw new Error(`Status API error: ${response.status}`);
            }
            
            const statusData = await response.json();
            console.log(`Status data for ${messageId}:`, statusData);
          
            // Extract the actual status object from the response
            const messageStatus = statusData.status;
            
            // Extract agent name from processing stage if available
            let extractedAgentName = null;
            if (messageStatus?.processingStage?.details) {
              const agentNameMatch = messageStatus.processingStage.details.match(/with agent ([^\.]+)/i);
              if (agentNameMatch && agentNameMatch[1]) {
                extractedAgentName = agentNameMatch[1].trim();
                console.log(`Extracted agent name from processing details: ${extractedAgentName}`);
                
                // Add it to the messageStatus object
                messageStatus.agentName = extractedAgentName;
              }
            }
            
            // Extract agent name from processingDetails if available and not already set
            if (messageStatus?.processingDetails?.selectedAgent && !messageStatus.agentName) {
              messageStatus.agentName = messageStatus.processingDetails.selectedAgent;
              console.log(`Using selected agent name: ${messageStatus.agentName}`);
            }
          
            // If no status is found, the message might have been processed
            if (!messageStatus || Object.keys(messageStatus).length === 0) {
              console.log(`No status found for message ${messageId}, it may have completed processing`);
              
              // Update the message as completed in our state
              setMessages(prev => 
                prev.map(m => m.id === messageId ? { 
                  ...m, 
                  status: 'completed',
                  processingStage: {
                    stage: 'completed',
                    details: 'Processing completed'
                  }
                } : m)
              );
              
              // Mark as completed to avoid duplicate processing
              hasCompletedOrErrored = true;
              
              // Release the current processing ID
              setCurrentProcessingId(null);
              
              // Clean up the interval
              if (intervalId) clearInterval(intervalId);
              
              // Check for new messages
              fetchUnseenMessages();
              
              return true; // Stop polling
            }
            
            // Update the message in our state based on the returned status
            if (messageStatus) {
              console.log(`Updating UI with status for ${messageId}:`, messageStatus);
              
              // Track if the message is completed or errored
              const isCompletedOrErrored = 
                messageStatus.status === 'completed' || 
                messageStatus.status === 'error' ||
                messageStatus.isCompleted === true;
              
              setMessages(prev => 
                prev.map(m => m.id === messageId ? { 
                  ...m, 
                  status: messageStatus.status,
                  processingStage: messageStatus.processingStage,
                  // Ensure agent name is preserved and prioritized correctly
                  agentName: messageStatus.agentName || extractedAgentName || m.agentName,
                  agentDescription: messageStatus.agentDescription,
                  response: messageStatus.response,
                  processingDetails: messageStatus.processingDetails
                } : m)
              );
              
              // If the message is completed or errored, we can stop polling
              if (isCompletedOrErrored) {
                console.log(`Message ${messageId} has reached ${messageStatus.status} status, stopping polling`);
                
                // Mark as completed to avoid duplicate processing
                hasCompletedOrErrored = true;
                
                // Add to completed messages set to prevent future reprocessing attempts
                if (messageStatus.status === 'completed') {
                  completedMessageIds.add(messageId);
                  console.log(`Added message ${messageId} to completed messages set from polling`);
                }
                
                // Update stats for the completed message
                const updatedMessage = {
                  ...message,
                  status: messageStatus.status as 'completed' | 'error',
                  response: messageStatus.response,
                  agentName: messageStatus.agentName || extractedAgentName
                };
                
                handleMessageProcessed(updatedMessage);
                
                // Release the current processing ID
                setCurrentProcessingId(null);
                
                // Check for new messages immediately after processing completes
                fetchUnseenMessages();
                
                // Clean up the interval
                if (intervalId) clearInterval(intervalId);
                
                return true; // Polling complete
              }
            }
            
            return false; // Continue polling
          } catch (error) {
            console.error('Error polling status:', error);
            
            // Update UI to show the error
            setMessages(prev => 
              prev.map(m => m.id === messageId ? { 
                ...m, 
                status: 'error',
                processingStage: {
                  stage: 'analyzing',
                  details: `Error polling status: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
              } : m)
            );
            
            // Mark as errored to avoid duplicate processing
            hasCompletedOrErrored = true;
            
            // Release the current processing ID
            setCurrentProcessingId(null);
            
            if (intervalId) clearInterval(intervalId);
            return true; // Stop polling due to error
          }
        };
        
        // Initial check
        const shouldStop = await checkStatus();
        if (shouldStop) return;
        
        // Set up interval for subsequent checks
        intervalId = setInterval(async () => {
          const shouldStop = await checkStatus();
          if (shouldStop && intervalId) {
            clearInterval(intervalId);
          }
        }, 2000); // Poll every 2 seconds
        
        // Return a cleanup function to stop polling if component unmounts
        return () => {
          if (intervalId) {
            clearInterval(intervalId);
          }
        };
      };
      
      // Start polling for status
      const cleanup = await pollStatus();
      
      // If any errors occur, make sure we release the processing ID
      return cleanup;
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);
      
      // Update the message to error state
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { 
          ...m, 
          status: 'error',
          processingStage: {
            stage: 'error',
            details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        } : m)
      );
      
      // Release the current processing ID
      setCurrentProcessingId(null);
      
      // Return an empty cleanup function
      return () => {};
    }
  };

  // Add a way to process messages independently when batch fails
  const processMessagesIndividually = (messagesToProcess: Message[]) => {
    if (messagesToProcess.length === 0) return;
    
    console.log(`Processing ${messagesToProcess.length} messages individually instead of as batch`);
    
    // Sort messages by timestamp, oldest first
    const sortedMessages = [...messagesToProcess].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Process only the first message - the rest will be processed after this one completes
    const firstMessage = sortedMessages[0];
    console.log(`Starting individual processing with message: ${firstMessage.id}`);
    
    setCurrentProcessingId(firstMessage.id);
    processMessage(firstMessage.id);
  };

  // Modify the ProcessBatchMessages function to add better timeout handling
  const processBatchMessages = async (messagesToProcess: Message[]) => {
    if (messagesToProcess.length === 0) return;
    
    console.log(`Processing batch of ${messagesToProcess.length} messages`);
    
    // Sort messages by timestamp, oldest first to preserve conversation flow
    const sortedMessages = [...messagesToProcess].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Take the first message as the "primary" message that we'll track
    const primaryMessage = sortedMessages[0];
    setCurrentProcessingId(primaryMessage.id);
    
    // Store batch information in a ref to access later if needed
    const batchStartTime = Date.now();
    
    // Concatenate all message contents with separators
    const combinedContent = sortedMessages.map(m => m.message).join("\n\n---\n\n");
    
    // Mark all messages as being processed
    setMessages(prev => 
      prev.map(m => {
        if (sortedMessages.some(sm => sm.id === m.id)) {
          return { 
            ...m, 
            status: 'analyzing',
            processingStage: {
              stage: 'analyzing',
              details: 'Processing as part of a batch of messages...'
            }
          };
        }
        return m;
      })
    );
    
    try {
      // Check for admin mode from cookie
      const isAdmin = document.cookie.includes('admin_mode=true');
      console.log(`Current mode when processing batch: ${isAdmin ? 'Admin Mode' : 'User Mode'}`);
      
      // Call a special batch processing endpoint
      console.log(`Processing batch via orchestration API with primary message: ${primaryMessage.id}`);
      
      // Update primary message UI to show we're processing a batch
      setMessages(prev => 
        prev.map(m => m.id === primaryMessage.id ? { 
          ...m, 
          processingStage: {
            stage: 'analyzing',
            details: `Processing batch of ${sortedMessages.length} messages...`
          }
        } : m)
      );
      
      // Make the API call with all message IDs and combined content
      const startResponse = await fetch(`${baseUrl}/api/orchestration/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bladex-user-mode': 'true', // Always use user credentials for database access
          'x-user-email': localStorage.getItem('user_email') || ''
        },
        body: JSON.stringify({ 
          messageIds: sortedMessages.map(m => m.id),
          primaryId: primaryMessage.id,
          combinedContent 
        }),
      });
      
      if (!startResponse.ok) {
        console.error(`Batch API error: ${startResponse.status} ${startResponse.statusText}`);
        throw new Error(`Batch API error: ${startResponse.status}`);
      }
      
      // Add a counter for consecutive null status returns
      let nullStatusCount = 0;
      const MAX_NULL_STATUS = 5; // After 5 consecutive null statuses, fallback to individual processing
      
      // After starting batch process, poll for status of primary message
      const pollInterval = setInterval(async () => {
        try {
          // Check if batch has been running too long
          const batchRunTime = Date.now() - batchStartTime;
          if (batchRunTime > 30000) { // 30 seconds max for batch processing
            console.log(`Batch processing time exceeded 30 seconds, switching to individual processing`);
            clearInterval(pollInterval);
            setCurrentProcessingId(null);
            processMessagesIndividually(sortedMessages);
            return;
          }
          
          const isAdmin = document.cookie.includes('admin_mode=true');
          const statusResponse = await fetch(`${baseUrl}/api/orchestration?id=${primaryMessage.id}`, {
            headers: {
              'x-bladex-user-mode': 'true', // Always use user credentials for database access
              'x-user-email': localStorage.getItem('user_email') || ''
            }
          });
          
          if (!statusResponse.ok) {
            console.error(`Status API error: ${statusResponse.status} ${statusResponse.statusText}`);
            throw new Error(`Status API error: ${statusResponse.status}`);
          }
          
          const statusData = await statusResponse.json();
          const messageStatus = statusData.status;
          
          if (!messageStatus) {
            nullStatusCount++;
            console.log(`No status found for batch (count: ${nullStatusCount}/${MAX_NULL_STATUS})`);
            
            if (nullStatusCount >= MAX_NULL_STATUS) {
              console.log(`Maximum null status count reached, switching to individual processing`);
              clearInterval(pollInterval);
              setCurrentProcessingId(null);
              processMessagesIndividually(sortedMessages);
              return;
            }
            
            return; // Continue polling
          } else {
            // Reset counter if we get a valid status
            nullStatusCount = 0;
          }
          
          // Update primary message status
          setMessages(prev => 
            prev.map(m => m.id === primaryMessage.id ? { 
              ...m, 
              status: messageStatus.status,
              processingStage: messageStatus.processingStage,
              agentName: messageStatus.agentName,
              agentDescription: messageStatus.agentDescription,
              response: messageStatus.response,
              processingDetails: messageStatus.processingDetails
            } : m)
          );
          
          // If complete, update all batch messages
          if (messageStatus.status === 'completed' || messageStatus.status === 'error') {
            // Mark all batch messages as completed
            setMessages(prev => 
              prev.map(m => {
                if (sortedMessages.some(sm => sm.id === m.id && m.id !== primaryMessage.id)) {
                  return { 
                    ...m, 
                    status: 'completed',
                    processingStage: {
                      stage: 'completed',
                      details: 'Processed as part of batch'
                    },
                    agentName: messageStatus.agentName,
                    agentDescription: messageStatus.agentDescription
                  };
                }
                return m;
              })
            );
            
            // Update stats for the completed primary message
            handleMessageProcessed({
              ...primaryMessage,
              status: messageStatus.status as 'completed' | 'error',
              response: messageStatus.response
            });
            
            // Also update localStorage for batch processing
            const today = new Date().toISOString().split('T')[0];
            const dailyStats = JSON.parse(localStorage.getItem('dailyMessageStats') || '{}');
            
            if (!dailyStats[today]) {
              dailyStats[today] = {
                replied: 0,
                customersHelped: []
              };
            }
            
            // Count all unique contacts in the batch - using Array.from for compatibility
            const uniqueContactIds = Array.from(new Set(sortedMessages.map(m => m.contactId)));
            
            // Increment replies by the number of messages in batch
            dailyStats[today].replied = (dailyStats[today].replied || 0) + uniqueContactIds.length;
            
            // Ensure customersHelped is always an array
            if (!Array.isArray(dailyStats[today].customersHelped)) {
              dailyStats[today].customersHelped = [];
            }
            
            // Add each unique contact
            uniqueContactIds.forEach(contactId => {
              if (contactId && !dailyStats[today].customersHelped.includes(contactId)) {
                dailyStats[today].customersHelped.push(contactId);
              }
            });
            
            localStorage.setItem('dailyMessageStats', JSON.stringify(dailyStats));
            
            // Mark batch as complete
            clearInterval(pollInterval);
            setCurrentProcessingId(null);
            
            // Check for new messages after batch is done
            setTimeout(() => {
              fetchUnseenMessages();
            }, 1000);
          }
        } catch (error) {
          console.error('Error polling status for batch:', error);
          clearInterval(pollInterval);
          setCurrentProcessingId(null);
          
          // Mark all as error
          setMessages(prev => 
            prev.map(m => {
              if (sortedMessages.some(sm => sm.id === m.id)) {
                return { 
                  ...m, 
                  status: 'error',
                  processingStage: {
                    stage: 'analyzing',
                    details: `Error processing batch: ${error instanceof Error ? error.message : 'Unknown error'}`
                  }
                };
              }
              return m;
            })
          );
          
          // Switch to individual processing after error
          setTimeout(() => {
            processMessagesIndividually(sortedMessages);
          }, 2000);
        }
      }, 1000);
      
      // Reduce safety timeout to 30 seconds (from 2 minutes)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (currentProcessingId === primaryMessage.id) {
          console.log(`Batch processing timeout after 30 seconds, switching to individual processing`);
          setCurrentProcessingId(null);
          processMessagesIndividually(sortedMessages);
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error processing batch:', error);
      
      // Mark all as error
      setMessages(prev => 
        prev.map(m => {
          if (sortedMessages.some(sm => sm.id === m.id)) {
            return { 
              ...m, 
              status: 'error',
              processingStage: {
                stage: 'analyzing',
                details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            };
          }
          return m;
        })
      );
      
      setCurrentProcessingId(null);
      // Try processing individually after a short delay
      setTimeout(() => {
        processMessagesIndividually(sortedMessages);
      }, 2000);
    }
  };

  // Function to handle message processing updates - fixed localStorage handling
  const handleMessageProcessed = (updatedMessage: Message) => {
    console.log(`Message processed: ${updatedMessage.id}`, {
      status: updatedMessage.status,
      agentName: updatedMessage.agentName,
      processingStage: updatedMessage.processingStage
    });
    
    // Extract agent name from processing stage details if not already set
    let finalAgentName = updatedMessage.agentName;
    
    if (!finalAgentName && updatedMessage.processingStage?.details) {
      const agentNameMatch = updatedMessage.processingStage.details.match(/with agent ([^\.]+)/i);
      if (agentNameMatch && agentNameMatch[1]) {
        finalAgentName = agentNameMatch[1].trim();
        console.log(`Extracted agent name from processing details: ${finalAgentName}`);
      }
    }
    
    // Extract agent name from processingDetails if available and not already set
    if (!finalAgentName && updatedMessage.processingDetails?.selectedAgent) {
      finalAgentName = updatedMessage.processingDetails.selectedAgent;
      console.log(`Using selected agent name: ${finalAgentName}`);
    }
    
    setMessages(prevMessages => {
      return prevMessages.map(msg => {
        if (msg.id === updatedMessage.id) {
          // Create the updated message with the extracted agent name
          return {
            ...msg,
            ...updatedMessage,
            agentName: finalAgentName || msg.agentName || updatedMessage.agentName
          };
        }
        return msg;
      });
    });
    
    try {
      if (updatedMessage.status === "completed") {
        // Add to completed messages set to prevent reprocessing
        completedMessageIds.add(updatedMessage.id);
        console.log(`Added message ${updatedMessage.id} to completed messages set`);
        
        // Update stats as needed
        // ... existing stats handling code ...
        
        // Show completion notification
        setShowCompletion(true);
        setTimeout(() => setShowCompletion(false), 2000);
        
        // Fetch new messages immediately after completing the current message
        console.log("Message processing completed, checking for new messages");
        setTimeout(() => fetchUnseenMessages(), 1000);
      }
    } catch (error) {
      console.error("Error processing message stats:", error);
    }
  };

  // State for tracking which responses are expanded to show full content
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});

  // Toggle function to show/hide full response
  const toggleResponseExpand = (messageId: string) => {
    setExpandedResponses(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Function to render message status (from MessageList)
  const renderStatus = (message: Message) => {
    const { status, processingStage, agentName, agentDescription, response, processingDetails } = message

    // Extract agent name from all possible sources
    let displayAgentName = agentName;
    
    if (!displayAgentName && processingStage?.details) {
      const match = processingStage.details.match(/with agent ([^\.]+)/i);
      if (match && match[1]) {
        displayAgentName = match[1].trim();
      }
    }
    
    if (!displayAgentName && processingDetails?.selectedAgent) {
      displayAgentName = processingDetails.selectedAgent;
    }

    switch (status) {
      case "analyzing":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center text-blue-500 text-xs gap-1">
              <div className="relative h-4 w-4">
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-blue-500" 
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                </div>
              </div>
              <span>{processingStage?.details || "AI analyzing message..."}</span>
            </div>
            {processingDetails?.scoredAgents && processingDetails.scoredAgents.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-500 ml-4 mt-1 bg-gray-50/80 p-2 rounded-md shadow-sm"
              >
                <div className="font-semibold mb-1">Agent Scoring:</div>
                {processingDetails.scoredAgents.map((agent, index) => (
                  <div key={index} className="flex justify-between items-center py-0.5">
                    <span className="font-medium">{agent.name}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(agent.score * 100).toFixed(0)}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                    </div>
                    <span className="font-mono text-xs w-8 text-right">{(agent.score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )
      case "delegating":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
            <div className="flex items-center text-yellow-500 text-xs gap-1">
              <div className="relative h-4 w-4">
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-yellow-500" 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-500"></div>
                </div>
              </div>
              <span>
                {processingStage?.details || (
                  <>
                    Delegating to {displayAgentName || "agent"}
                    {agentDescription && <span className="text-gray-500 ml-1">({agentDescription})</span>}
                    ...
                  </>
                )}
              </span>
            </div>
            {processingDetails?.selectedAgent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-500 ml-4 mt-1 bg-gray-50/80 p-2 rounded-md shadow-sm"
              >
                <div className="font-semibold">Selected Agent:</div>
                <div className="font-medium mt-1">{processingDetails.selectedAgent}</div>
                {processingDetails.agentDescription && (
                  <div className="mt-1 text-xs italic text-gray-600">{processingDetails.agentDescription}</div>
                )}
              </motion.div>
            )}
          </motion.div>
        )
      case "replying":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
            <div className="flex items-center text-green-500 text-xs gap-1">
              <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
              <span>
                {processingStage?.details || `Generating response${displayAgentName ? ` with ${displayAgentName}` : ''}`}
              </span>
            </div>
            {response && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-xs text-gray-600 ml-4 mt-1 bg-gray-50/80 p-2 rounded-md shadow-sm"
              >
                <div className="font-semibold mb-1">Response Preview:</div>
                <div className="text-gray-800">
                  {response.length > 100 && !expandedResponses[message.id] 
                    ? response.substring(0, 100) + '...'
                    : response}
                </div>
                {response.length > 100 && (
                  <button 
                    onClick={() => toggleResponseExpand(message.id)}
                    className="text-blue-500 mt-1 text-xs font-medium hover:underline"
                  >
                    {expandedResponses[message.id] ? 'Show less' : 'Read more'}
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        )
      case "completed":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
            <div className="flex items-center text-green-500 text-xs gap-1">
              <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-3 w-3" />
              </div>
              <span>
                {processingStage?.details || (
                  <>
                    Reply sent by <span className="font-semibold text-blue-600">{displayAgentName || "Agent"}</span>
                    {agentDescription && <span className="text-gray-500 ml-1">({agentDescription})</span>}
                  </>
                )}
              </span>
            </div>
            {response && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-xs mt-2 bg-green-50/80 p-2 rounded-md shadow-sm border-l-2 border-green-500"
              >
                <div className="font-semibold mb-1 text-green-700 flex items-center gap-1">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Response:</span>
                </div>
                <div className="text-gray-700">
                  {response.length > 150 && !expandedResponses[message.id] 
                    ? response.substring(0, 50) + '...'
                    : response}
                </div>
                {response.length > 50 && (
                  <button 
                    onClick={() => toggleResponseExpand(message.id)}
                    className="text-blue-600 mt-1 text-xs font-medium hover:underline"
                  >
                    {expandedResponses[message.id] ? 'Show less' : 'Read more'}
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        )
      case "error":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
            <div className="flex items-start text-red-500 text-xs gap-1">
              <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                <X className="h-2.5 w-2.5" />
              </div>
              <div>
                <div className="text-red-600">{processingStage?.details || "Error processing message"}</div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-500 font-medium"
                  onClick={() => processMessage(message.id)}
                >
                  Try again
                </Button>
              </div>
            </div>
          </motion.div>
        )
      default:
        return null
    }
  }

  // Function to check backend health
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/orchestration?endpoint=health`)
      setIsHealthy(response.ok)
    } catch (error) {
      console.error("Error checking backend health:", error)
      setIsHealthy(false)
    }
  }

  // Add a debug function to check orchestration status
  const checkOrchestrationDebug = async () => {
    try {
      console.log("Checking orchestration debug info");
      const response = await fetch(`${baseUrl}/api/orchestration?endpoint=debug`);
      
      if (!response.ok) {
        console.error(`Error fetching debug info: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      console.log("Orchestration debug info:", data);
    } catch (error) {
      console.error("Error checking orchestration debug:", error);
    }
  }
  
  // Check debug info on first load
  useEffect(() => {
    if (isOpen) {
      checkOrchestrationDebug();
    }
  }, [isOpen]);

  // Function to check autopilot status
  const checkAutopilotStatus = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/autopilot/status`)
      const data = await response.json()
      setIsAutopilotActive(data.active)
    } catch (error) {
      console.error("Error checking autopilot status:", error)
      setIsAutopilotActive(false)
    }
  }

  // Function to toggle autopilot
  const toggleAutopilot = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/autopilot/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !isAutopilotActive })
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsAutopilotActive(data.active)
        
        // If turning on autopilot, process any new messages
        if (data.active) {
          const newMessage = messages.find(m => m.status === "new")
          if (newMessage && !currentProcessingId) {
            setCurrentProcessingId(newMessage.id)
            processMessage(newMessage.id)
          }
        }
      }
    } catch (error) {
      console.error("Error toggling autopilot:", error)
    }
  }

  // Calculate progress for the refresh timer
  const progress = ((30 - timer) / 30) * 100

  // Function to handle power button click
  const handlePowerClick = async () => {
    const newPowerState = !isPowered
    setIsPowered(newPowerState)
    
    if (newPowerState) {
      // Set loading indicator immediately
      setLoading(true)
      
      try {
        // Turn autopilot on first
        const response = await fetch(`${baseUrl}/api/autopilot/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: true })
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsAutopilotActive(data.active)
          console.log("Autopilot activated, fetching messages immediately")
        }
        
        // Fetch messages immediately - don't wait for the effect to trigger
        await fetchUnseenMessages()
        
        // Fetch stats even if there are no unseen messages
        try {
          const statsResponse = await fetch(`${baseUrl}/api/messages/stats`)
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            if (statsData.success) {
              setStats({
                replied: statsData.stats.repliesSent || 0,
                responded: statsData.stats.repliesSent || 0, // Add this line to fix the error
                unread: statsData.stats.unreadCount || 0,
                customers: statsData.stats.uniqueCustomers || [],
                uniqueMessageIds: statsData.stats.uniqueMessageIds || []
              })
            }
          }
        } catch (statsError) {
          console.error("Error fetching message stats:", statsError)
        }
      } catch (error) {
        console.error("Error during power on:", error)
      } finally {
        setLoading(false)
      }
    } else {
      onClose()
    }
  }

  // Update the message card rendering
  const renderMessageCard = (message: Message) => {
    const isAIResponse = message.isAIResponse || message.status === "completed"
    const isProcessing = ["analyzing", "delegating", "replying"].includes(message.status)
    
    // Check if message is long enough to need truncation
    const needsTruncation = message.message && message.message.split(' ').length > 5;
    const isExpanded = expandedMessages.has(message.id.toString());
    
    // Toggle message expanded state
    const toggleExpanded = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedMessages(prev => {
        const newSet = new Set(prev);
        const messageId = message.id.toString(); // Convert to string to ensure consistency
        if (newSet.has(messageId)) {
          newSet.delete(messageId);
        } else {
          newSet.add(messageId);
        }
        return newSet;
      });
    };
    
    // Function to get appropriate icon for processing stage
    const getProcessingIcon = () => {
      switch (message.status) {
        case "analyzing":
          return <Brain className="h-4 w-4 text-blue-500" />;
        case "delegating":
          return <Network className="h-4 w-4 text-yellow-500" />;
        case "replying":
          return <MessageSquare className="h-4 w-4 text-green-500" />;
        case "completed":
          return <CheckCircle className="h-4 w-4 text-emerald-500" />;
        case "error":
          return <X className="h-4 w-4 text-red-500" />;
        default:
          return <CpuIcon className="h-4 w-4 text-gray-500" />;
      }
    };
    
    // Get agent icon - show first letter of agent name
    const getAgentIcon = () => {
      if (!message.agentName) return <Bot className="h-4 w-4" />;
      
      // Return first letter of agent name
      return <span className="text-sm font-semibold">{message.agentName.charAt(0).toUpperCase()}</span>;
    };
    
    // For debugging - include more details about processing stage and agent info
    console.log(`Rendering message card: ${message.id}, agent: ${message.agentName || 'none'}, status: ${message.status || 'unknown'}`, {
      processingStage: message.processingStage,
      processingDetails: message.processingDetails && {
        selectedAgent: message.processingDetails.selectedAgent,
        scoredAgents: message.processingDetails.scoredAgents
      }
    });
    
    // Handle unknown status
    const validStatus = ["new", "analyzing", "delegating", "replying", "completed", "error"].includes(message.status) 
      ? message.status 
      : "new";
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className={cn(
          "message-card rounded-xl p-4 mb-3 transition-all duration-300 relative overflow-hidden border shadow-md",
          isAIResponse
            ? "bg-white/30 dark:bg-slate-800/30 backdrop-blur-md border-white/20 dark:border-slate-700/30" 
            : "bg-blue-50/30 dark:bg-slate-800/20 backdrop-blur-md border-blue-100/30 dark:border-slate-700/20"
        )}
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: isAIResponse 
            ? "0 4px 16px rgba(59, 130, 246, 0.1)" 
            : "0 4px 16px rgba(59, 130, 246, 0.15)"
        }}
      >
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 dark:from-slate-700/10 dark:to-slate-900/5 pointer-events-none"></div>
        
        {/* Status indicator strip with dynamic animation - KEEPING THIS */}
        {message.status !== "new" && (
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl",
            message.status === "analyzing" ? "bg-blue-500/80 dark:bg-blue-600/80" :
            message.status === "delegating" ? "bg-yellow-500/80 dark:bg-yellow-600/80" :
            message.status === "replying" ? "bg-green-500/80 dark:bg-green-600/80" :
            message.status === "completed" ? "bg-emerald-500/80 dark:bg-emerald-600/80" :
            message.status === "error" ? "bg-red-500/80 dark:bg-red-600/80" : "bg-gray-400/80"
          )}>
            {isProcessing && (
              <motion.div 
                className="absolute inset-0 opacity-75"
                style={{
                  background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.8), transparent)"
                }}
                animate={{ 
                  y: ["-100%", "200%"],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.5, 
                  ease: "linear" 
                }}
              />
            )}
          </div>
        )}

        <div className="flex items-start gap-3 z-10 relative">
          {/* Avatar with refined styling */}
          <div className="flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm relative shadow-md",
              isAIResponse 
                ? "bg-gradient-to-br from-indigo-500 to-blue-600 dark:from-indigo-600 dark:to-blue-700" 
                : "bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-700 dark:to-slate-900"
            )}>
              {/* Initial or icon */}
              {isAIResponse ? (
                message.status === "completed" ? (
                  getAgentIcon()
                ) : (
                  <CpuIcon className="h-5 w-5" />
                )
              ) : (
                <span>{message.customerName.charAt(0).toUpperCase()}</span>
              )}
              
              {/* Completed state indicator */}
              {message.status === "completed" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-slate-800"
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </motion.div>
              )}
              
              {/* Error state indicator */}
              {message.status === "error" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -bottom-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-slate-800"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </motion.div>
              )}
          </div>
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                {/* Status indicator icon */}
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  message.status === "analyzing" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" :
                  message.status === "delegating" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400" :
                  message.status === "replying" ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" :
                  message.status === "completed" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" :
                  message.status === "error" ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : 
                  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}>
                  {getProcessingIcon()}
                </div>
                
                <h3 className={cn(
                  "text-sm font-semibold flex items-center gap-1.5 tracking-tight",
                  isAIResponse 
                    ? message.status === "completed" 
                      ? "text-emerald-700 dark:text-emerald-400" 
                      : message.status === "error" 
                        ? "text-red-700 dark:text-red-400" 
                        : "text-blue-700 dark:text-blue-400"
                    : "text-slate-800 dark:text-slate-200"
                )}>
                  {isAIResponse ? (
                    message.status === "completed" ? (
                      <>
                        <span>{message.agentName || "Agent"}</span>
                      </>
                    ) : (
                      <span>Processing{message.agentName ? ` with ${message.agentName}` : ""}</span>
                    )
                  ) : (
                    message.customerName
                  )}
              </h3>
              </div>
              
              <div className="flex items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
            </div>

            {/* Processing stage indicator with loading bar - KEEPING THIS */}
            {isProcessing && (
              <div className={cn(
                "mb-2 px-2 py-1 text-xs rounded-md inline-flex items-center gap-1.5",
                message.status === "analyzing" 
                  ? "bg-blue-50/80 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100/80 dark:border-blue-800/50" 
                  : message.status === "delegating" 
                    ? "bg-yellow-50/80 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-100/80 dark:border-yellow-800/50" 
                    : "bg-green-50/80 text-green-600 dark:bg-green-900/30 dark:text-green-300 border border-green-100/80 dark:border-green-800/50"
              )}>
                {message.status === "analyzing" ? (
                  <>
                    <Brain className="h-3 w-3" /> 
                    <span>Analyzing message content</span>
                  </>
                ) : message.status === "delegating" ? (
                  <>
                    <Network className="h-3 w-3" /> 
                    <span>Selecting optimal agent</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3 w-3" /> 
                    <span>{message.processingStage?.details || `Composing response${message.agentName ? ` with ${message.agentName}` : ''}`}</span>
                  </>
                )}
                
                {/* Progress bar for processing with pulse effect */}
                <div className="w-24 h-1.5 bg-white dark:bg-slate-700 rounded-full overflow-hidden ml-1 shadow-inner">
                  <motion.div 
                    className={cn(
                      "h-full rounded-full relative",
                      message.status === "analyzing" ? "bg-blue-500" :
                      message.status === "delegating" ? "bg-yellow-500" :
                      "bg-green-500"
                    )}
                    animate={{
                      width: message.status === "analyzing" ? "33%" :
                             message.status === "delegating" ? "66%" : "100%"
                    }}
                    initial={{ width: "0%" }}
                    transition={{ duration: 0.8 }}
                  >
                    {/* Pulse effect inside progress bar */}
                    <motion.div 
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-8",
                        message.status === "analyzing" ? "bg-blue-300/50" :
                        message.status === "delegating" ? "bg-yellow-300/50" :
                        "bg-green-300/50"
                      )}
                      animate={{ 
                        x: ["-100%", "100%"]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                </div>
              </div>
            )}

            {/* Message text with enhanced styling and read more functionality */}
            <div className={cn(
              "text-sm whitespace-pre-wrap break-words rounded-lg p-3 mb-1",
              isAIResponse 
                ? "bg-white/70 text-slate-700 border border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700/40 font-sans" 
                : "bg-blue-50/70 text-slate-700 border border-blue-100/70 dark:bg-blue-900/30 dark:text-slate-200 dark:border-blue-700/30 font-sans"
            )}>
              <div className={cn("tracking-tight leading-relaxed", {
                "line-clamp-2": needsTruncation && !isExpanded
              })}>
                {message.message}
              </div>
              
              {/* Read more/less toggle */}
              {needsTruncation && (
                <button 
                  onClick={toggleExpanded}
                  className={cn(
                    "mt-1 text-xs font-medium",
                    isAIResponse
                      ? "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      : "text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  )}
                >
                  {isExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>

            {/* Processing details render with enhanced animations */}
            {renderStatus(message)}
          </div>
        </div>
      </motion.div>
    )
  }

  // Function to clean up error messages after a timeout
  const cleanupErrorMessages = (messageId: string, timeoutMs: number = 10000) => {
    console.log(`Setting up cleanup for message ${messageId} after ${timeoutMs}ms`);
    setTimeout(() => {
      setMessages(prev => 
        prev.filter(m => !(m.id === messageId && m.status === 'error'))
      );
    }, timeoutMs);
  };

  // Auto-remove error messages
  useEffect(() => {
    // Find any error messages
    const errorMessages = messages.filter(m => m.status === 'error');
    
    // Set up timeouts to remove each error message after some time
    errorMessages.forEach(message => {
      // Only set timeout for messages that don't already have one
      if (!message.errorCleanupScheduled) {
        cleanupErrorMessages(message.id);
        
        // Mark this message as having cleanup scheduled
        setMessages(prev => 
          prev.map(m => 
            m.id === message.id ? { ...m, errorCleanupScheduled: true } : m
          )
        );
      }
    });
  }, [messages]);

  // Add a check to ensure currentProcessingId isn't stuck
  useEffect(() => {
    // Check if there's a stale processing ID (a safety check)
    if (currentProcessingId) {
      console.log(`Active processing ID: ${currentProcessingId}`);
      // Find if this message still exists in our state
      const messageExists = messages.some(m => m.id === currentProcessingId);
      
      if (!messageExists) {
        console.log(`Warning: processing ID ${currentProcessingId} refers to a message not in state. Resetting.`);
        setCurrentProcessingId(null);
      }
      
      // Check if the message is in an error or completed state, which should not block processing
      const message = messages.find(m => m.id === currentProcessingId);
      if (message && (message.status === 'completed' || message.status === 'error')) {
        console.log(`Warning: processing ID ${currentProcessingId} refers to a ${message.status} message. Resetting.`);
        setCurrentProcessingId(null);
      }
    }
  }, [messages, currentProcessingId]);

  // Add a debug function for message processing
  const debugMessages = async () => {
    try {
      console.log("Checking message debug info");
      const response = await fetch(`${baseUrl}/api/messages/debug`);
      
      if (!response.ok) {
        console.error(`Error fetching message debug info: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      console.log("Message debug info:", data);
      
      // Force a refresh of the current state
      fetchUnseenMessages();
      
      // If we have unviewed messages but are not processing anything, try to process
      if (data.stats.unviewedMessageCount > 0 && !currentProcessingId) {
        console.log("Found unviewed messages, triggering refresh");
        await fetchUnseenMessages();
      }
    } catch (error) {
      console.error("Error checking message debug:", error);
    }
  };

  // Add a useEffect for periodic safety checks
  useEffect(() => {
    if (isOpen && isAutopilotActive) {
      // Set up a periodic safety check that runs every 15 seconds
      const safetyInterval = setInterval(() => {
        // If we're not processing anything, check if there are any new messages
        if (!currentProcessingId) {
          console.log("Safety check: Looking for unprocessed messages");
          
          // Check if any messages with "new" status exist in our current state
          const newMessages = messages.filter(m => m.status === "new");
          if (newMessages.length > 0) {
            console.log(`Safety found ${newMessages.length} unprocessed messages in state`, 
              newMessages.map(m => m.id));
            // Don't need to do anything as the main effect will process these
          } else {
            // Check for any unseen messages in the database
            console.log("No new messages in state, checking database");
            fetchUnseenMessages();
          }
        } else {
          console.log(`Safety check: Currently processing message ${currentProcessingId}`);
          
          // Check if processing has been going on too long
          const processingMessage = messages.find(m => m.id === currentProcessingId);
          if (processingMessage) {
            console.log(`Current processing status: ${processingMessage.status}`);
          } else {
            console.log("Warning: Processing ID set but message not found in state");
            // Reset the processing ID
            setCurrentProcessingId(null);
          }
        }
      }, 15000);
      
      return () => clearInterval(safetyInterval);
    }
  }, [isOpen, isAutopilotActive, currentProcessingId, messages]);

  // Add a parallel processing function
  const processMessagesInParallel = (messagesToProcess: Message[]) => {
    if (messagesToProcess.length === 0) return;
    
    console.log(`Starting parallel processing of ${messagesToProcess.length} messages`);
    
    // Sort messages by timestamp, oldest first
    const sortedMessages = [...messagesToProcess].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Process each message in parallel (up to a max of 3 at once)
    const MAX_PARALLEL = 3;
    const toProcess = sortedMessages.slice(0, MAX_PARALLEL);
    
    // Update the processing IDs set
    const newProcessingIds = new Set(processingIds);
    toProcess.forEach(msg => newProcessingIds.add(msg.id));
    setProcessingIds(newProcessingIds);
    
    // Start processing each message
    toProcess.forEach(message => {
      processMessageParallel(message.id);
    });
  };

  // Modify the process message function to support parallel mode
  const processMessageParallel = async (messageId: string) => {
    // Check if the message is already being processed
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      console.error(`Message with ID ${messageId} not found in state`);
      return;
    }
    
    // Don't process if already in progress or completed
    if (message.status !== 'new' && message.status !== 'error') {
      console.log(`Message ${messageId} is already being processed or completed (status: ${message.status})`);
      return;
    }

    try {
      console.log(`Starting parallel processing for message ${messageId}`);
      // Update message status to "analyzing"
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { 
          ...m, 
          status: 'analyzing',
          processingStage: {
            stage: 'analyzing',
            details: 'AI is analyzing the message content...'
          }
        } : m)
      );
      
      // Check for admin mode from cookie
      const isAdmin = document.cookie.includes('admin_mode=true') || document.cookie.includes('admin_session=true');
      const userEmail = localStorage.getItem('user_email') || '';
      const supabaseUrl = localStorage.getItem('supabase_url') || '';
      const supabaseKey = localStorage.getItem('supabase_anon_key') || '';
      
      console.log(`Current mode when processing message in parallel: ${isAdmin ? 'Admin Mode' : 'User Mode'}`);
      console.log(`User credentials available: Email=${!!userEmail}, URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);
      
      // Call the API to process the message
      console.log(`Processing message ${messageId} via orchestration API`);
      
      // Initial API call to start processing
      const startResponse = await fetch(`${baseUrl}/api/orchestration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bladex-user-mode': 'true', // Always use user credentials for database access
          'x-user-email': userEmail,
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ id: messageId }),
      });

      if (!startResponse.ok) {
        console.error(`API error: ${startResponse.status} ${startResponse.statusText}`);
        throw new Error(`API error: ${startResponse.status}`);
      }
      
      const startData = await startResponse.json();
      console.log(`Orchestration API response for ${messageId}:`, startData);

      // Poll for status
      const pollStatusInterval = setInterval(async () => {
        try {
          // Poll the status endpoint
          const isAdmin = document.cookie.includes('admin_mode=true') || document.cookie.includes('admin_session=true');
          const userEmail = localStorage.getItem('user_email') || '';
          
          const statusResponse = await fetch(`${baseUrl}/api/orchestration?id=${messageId}`, {
            headers: {
              'x-bladex-user-mode': 'true', // Always use user credentials for database access
              'x-user-email': userEmail
            },
            credentials: 'include' // Include cookies in the request
          });
          
          if (!statusResponse.ok) {
            console.error(`Status API error: ${statusResponse.status} ${statusResponse.statusText}`);
            throw new Error(`Status API error: ${statusResponse.status}`);
          }
          
          const statusData = await statusResponse.json();
          const messageStatus = statusData.status;
          
          // If no status is found, the message might have been processed
          if (!messageStatus || Object.keys(messageStatus).length === 0) {
            console.log(`No status found for message ${messageId}, it may have completed processing`);
            
            // Update as completed in our state
            setMessages(prev => 
              prev.map(m => m.id === messageId ? { 
                ...m, 
                status: 'completed',
                processingStage: {
                  stage: 'completed',
                  details: 'Processing completed'
                }
              } : m)
            );
            
            // Remove from processing IDs
            const newProcessingIds = new Set(processingIds);
            newProcessingIds.delete(messageId);
            setProcessingIds(newProcessingIds);
            
            // Check for new messages if no more processing
            if (newProcessingIds.size === 0) {
              setTimeout(() => {
                fetchUnseenMessages();
              }, 1000);
            }
            
            clearInterval(pollStatusInterval);
            return;
          }
          
          // Update the message in our state based on the returned status
          if (messageStatus) {
            console.log(`Updating UI with status for ${messageId}:`, messageStatus);
            setMessages(prev => 
              prev.map(m => m.id === messageId ? { 
                ...m, 
                status: messageStatus.status,
                processingStage: messageStatus.processingStage,
                agentName: messageStatus.agentName,
                agentDescription: messageStatus.agentDescription,
                response: messageStatus.response,
                processingDetails: messageStatus.processingDetails
              } : m)
            );
            
            // If the message is completed or errored, we can stop polling
            if (messageStatus.status === 'completed' || messageStatus.status === 'error') {
              // Update stats for the completed message
              handleMessageProcessed({
                ...message,
                status: messageStatus.status as 'completed' | 'error',
                response: messageStatus.response
              });
              
              // Remove from processing IDs
              const newProcessingIds = new Set(processingIds);
              newProcessingIds.delete(messageId);
              setProcessingIds(newProcessingIds);
              
              // Check for new messages after this one completes
              setTimeout(() => {
                fetchUnseenMessages();
              }, 1000);
              
              clearInterval(pollStatusInterval);
            }
          }
        } catch (error) {
          console.error(`Error polling status for message ${messageId}:`, error);
          
          // Update UI to show the error
          setMessages(prev => 
            prev.map(m => m.id === messageId ? { 
              ...m, 
              status: 'error',
              processingStage: {
                stage: 'analyzing',
                details: `Error polling status: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            } : m)
          );
          
          // Remove from processing IDs
          const newProcessingIds = new Set(processingIds);
          newProcessingIds.delete(messageId);
          setProcessingIds(newProcessingIds);
          
          // Clean up this error message after some time
          cleanupErrorMessages(messageId);
          
          clearInterval(pollStatusInterval);
        }
      }, 1000);
      
      // Safety timeout
      setTimeout(() => {
        clearInterval(pollStatusInterval);
        
        // Check if this message is still being processed
        const message = messages.find(m => m.id === messageId);
        if (message && (message.status === 'analyzing' || message.status === 'delegating' || message.status === 'replying')) {
          console.log(`Processing timeout for message ${messageId}`);
          
          // Mark as error
          setMessages(prev => 
            prev.map(m => m.id === messageId ? { 
              ...m, 
              status: 'error',
              processingStage: {
                stage: 'analyzing',
                details: 'Processing timed out after 2 minutes'
              }
            } : m)
          );
          
          // Remove from processing IDs
          const newProcessingIds = new Set(processingIds);
          newProcessingIds.delete(messageId);
          setProcessingIds(newProcessingIds);
        }
      }, 2 * 60 * 1000);
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);
      
      // Update message status to "error"
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { 
          ...m, 
          status: 'error',
          processingStage: {
            stage: 'analyzing',
            details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        } : m)
      );
      
      // Remove from processing IDs
      const newProcessingIds = new Set(processingIds);
      newProcessingIds.delete(messageId);
      setProcessingIds(newProcessingIds);
      
      // Clean up this error message after some time
      cleanupErrorMessages(messageId);
    }
  };

  // Enhance the message display effect to ensure animations play properly
  useEffect(() => {
    // When new messages are added, scroll to them and ensure animations play
    if (messages.length > 0) {
      // Force a small delay to ensure animations trigger properly
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        }

        // Force a reflow to ensure animations play properly for all messages
        const messageElements = document.querySelectorAll('.message-card')
        messageElements.forEach(el => {
          el.classList.add('animate-in')
        })
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [messages])

  // Add a highlight effect for new messages
  useEffect(() => {
    const highlightNewMessages = () => {
      // Find message elements that were just added
      const messageCards = document.querySelectorAll('.message-card:not(.highlight-checked)');
      
      messageCards.forEach(card => {
        // Mark as checked so we don't process it again
        card.classList.add('highlight-checked');
        
        // Add a subtle highlight animation
        card.classList.add('highlight-new');
        
        // Remove the highlight after animation completes
        setTimeout(() => {
          card.classList.remove('highlight-new');
        }, 2000);
      });
    };
    
    highlightNewMessages();
  }, [messages]);

  // Modify the GlobalStyles component to add the mesh pattern and scrollbar styles
  const GlobalStyles = () => {
    React.useEffect(() => {
      // Add CSS for message highlighting and custom scrollbar
      const style = document.createElement('style');
      style.textContent = `
        .message-card.highlight-new {
          animation: highlight-pulse 2s ease-in-out;
        }
        
        @keyframes highlight-pulse {
          0% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(20, 184, 166, 0); }
          100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
        }
        
        .bg-mesh-pattern {
          background-image: 
            radial-gradient(at 10% 30%, rgba(20, 184, 166, 0.1) 0px, transparent 50%),
            radial-gradient(at 90% 80%, rgba(37, 99, 235, 0.1) 0px, transparent 50%);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.3);
          border-radius: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 184, 166, 0.5);
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }, []);
    
    return null;
  };

  // Add an effect to automatically process new messages when they are added
  useEffect(() => {
    // Only process if autopilot is on and no message is being processed
    if (isAutopilotActive && !currentProcessingId && messages.length > 0) {
      // Find the first message with 'new' status
      const newMessage = messages.find(m => m.status === 'new');
      if (newMessage) {
        console.log(`Effect triggered: Auto-processing message ${newMessage.id}`);
        // Set as current processing message
        setCurrentProcessingId(newMessage.id);
        // Start processing
        processMessage(newMessage.id);
      }
    }
  }, [isAutopilotActive, messages, currentProcessingId]);

  return (
    <>
      <GlobalStyles />
      <PowerButton isActive={isPowered} onClick={handlePowerClick} />
      
      <AnimatePresence>
        {isPowered && (
          <>
            {/* Add a backdrop overlay with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40"
              onClick={() => {
                setIsPowered(false);
                onClose();
              }}
            />
            
            {/* Main Panel with shutter animation */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 120,
                mass: 1,
                bounce: 0
              }}
              className="fixed inset-y-0 right-0 w-[500px] bg-gradient-to-br from-gray-900/60 to-gray-800/70 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 text-white overflow-hidden"
            >
              {/* Glass panel layered effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-blue-500/10"></div>
              <div className="absolute inset-0 bg-mesh-pattern opacity-5"></div>
              
              {/* Content container with relative positioning */}
              <div className="relative h-full flex flex-col z-10">
                {/* Header */}
                <div className="sticky top-0 backdrop-blur-md z-10 border-b border-white/10 shadow-lg p-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-bold text-xl bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent">Message Center</h2>
                      <p className="text-sm text-gray-300">
                        {stats.customers.length} Customers • {stats.unread} Unread • {stats.responded} Replied
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsPowered(false);
                        onClose();
                      }}
                      className="p-2 rounded-full hover:bg-white/5 transition-colors duration-200"
                    >
                      <X className="h-6 w-6 text-gray-300" />
                    </motion.button>
                  </div>
                  
                  {/* Status Bar */}
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isHealthy ? "bg-teal-500" : "bg-red-500"
                        )}
                      />
                      <span className="text-gray-300">
                        {isHealthy ? "System Online" : "System Offline"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2
                        className={cn(
                          "h-4 w-4",
                          loading ? "animate-spin text-teal-500" : "text-gray-400"
                        )}
                      />
                      <span className="text-gray-300">
                        {loading ? "Checking messages..." : `Next check in ${timer}s`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Dashboard */}
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pt-3"
                >
                  <div className="bg-gradient-to-r from-gray-800/40 to-gray-700/40 rounded-lg border border-white/10 shadow-lg overflow-hidden backdrop-blur-sm">
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-teal-300 mb-2 flex items-center gap-1.5">
                        <BarChart className="h-3.5 w-3.5" />
                        Today's Activity
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 backdrop-blur-sm rounded-md p-3 flex items-center gap-2 shadow-lg border border-white/5">
                          <div className="bg-teal-900/50 h-8 w-8 rounded-full flex items-center justify-center text-teal-400 border border-teal-500/30">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs text-teal-400 font-medium">Replies Sent</div>
                            <div className="text-xl font-bold text-white">{stats.responded}</div>
                          </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-md p-3 flex items-center gap-2 shadow-lg border border-white/5">
                          <div className="bg-blue-900/50 h-8 w-8 rounded-full flex items-center justify-center text-blue-400 border border-blue-500/30">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs text-blue-400 font-medium">Customers</div>
                            <div className="text-xl font-bold text-white">
                              {new Set(stats.customers).size}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 text-center">
                        Stats reset at midnight
                      </div>
                    </div>
                    <div className="h-1 w-full bg-gradient-to-r from-teal-500/50 to-blue-500/50"></div>
                  </div>
                </motion.div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-800/20 backdrop-blur-sm p-4">
                  <AnimatePresence>
                    {messages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-full text-gray-400"
                      >
                        <svg
                          className="w-16 h-16 mb-4 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <p>No messages to process</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map(renderMessageCard)}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 backdrop-blur-md border-t border-white/10 p-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      {showCompletion && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-teal-400 flex items-center gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Message processed
                        </motion.span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={countdown}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:text-white"
                      >
                        <RotateCw className="h-3 w-3 mr-1" />
                        Refresh Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}