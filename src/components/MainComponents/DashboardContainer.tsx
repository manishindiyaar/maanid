'use client'

import { useState, useEffect, useRef } from "react";
import { cn } from "./../../lib/utils";
import { useTheme } from "./../theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSupabase } from './../../lib/supabase/useSupabase';
import { Zap } from "lucide-react";

// Import types
import { Customer, Message, QueryResult, ActionData } from "./types";

// Import components
import FullscreenHeader from "./FullscreenHeader";
import CustomerListPanel from "./CustomerListPanel";
import ChatPanel from "./ChatPanel";
import SearchBar from "./SearchBar";
import QueryResultsOverlay from "./QueryResultsOverlay";
import SetupAgent from "./../agent/SetupAgent";
import CombinedMessagingPanel from "./../MsgPanel";
import { TealSidebar } from "../sidebar/TealSidebar";
import TelegramConnector from "../bots/TelegramConnector";

const DashboardContainer = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  const { supabase } = useSupabase();
  
  // State management
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessingQuery, setIsProcessingQuery] = useState(false);
  const [isCopilotActive, setIsCopilotActive] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionData | null>(null);
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isMessagingPanelOpen, setIsMessagingPanelOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // For resizable functionality
  const [customerListWidth, setCustomerListWidth] = useState(260);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Action processing state
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionResult, setActionResult] = useState<{success: boolean, message: string} | null>(null);
  const [lastQuery, setLastQuery] = useState('');

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!supabase) {
        console.error('Supabase client not initialized');
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select(`
            id,
            name,
            contact_info,
            last_contact,
            messages (
              id,
              content,
              timestamp,
              is_from_customer,
              direction,
              is_viewed
            )
          `)
          .order('last_contact', { ascending: false });

        if (error) throw error;

        const formattedCustomers: Customer[] = data.map((customer: any) => {
          // Format messages with proper is_from_customer and is_viewed flags
          const messages = customer.messages?.map((msg: any) => {
            // Determine if message is from customer based on direction or existing flag
            const isFromCustomer = msg.is_from_customer === true || msg.direction === 'incoming';
            
            return {
              id: msg.id,
              content: msg.content,
              timestamp: msg.timestamp,
              is_from_customer: isFromCustomer,
              is_viewed: msg.is_viewed || false  // Ensure is_viewed is always a boolean
            };
          }) || [];

          // Sort messages by timestamp (newest first)
          const sortedMessages = [...messages].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          return {
            id: customer.id,
            name: customer.name,
            contact_info: customer.contact_info || '',
            messages: messages,
            lastMessage: sortedMessages[0]?.content || "",
            timestamp: new Date(customer.last_contact).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            // Count unread messages from customer that are not viewed
            unreadCount: messages.filter(
              (m: { is_from_customer: boolean; is_viewed: boolean }) => 
                m.is_from_customer && m.is_viewed === false
            ).length
          };
        });

        setCustomers(formattedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();

    // Set up real-time subscription for new contacts, but only if supabase is available
    if (supabase) {
      const channel = supabase
        .channel('contacts-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contacts'
          },
          (payload) => {
            console.log('Contact change detected:', payload);
            fetchCustomers();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase]);

  // Load messages when a customer is selected
  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    if (selectedCustomerId) {
      console.log(`Customer selected: ${selectedCustomerId}, loading messages...`);
      
      const loadMessagesForCustomer = async () => {
        setLoading(true);
        
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('contact_id', selectedCustomerId)
            .order('timestamp', { ascending: true });

          if (error) throw error;

          console.log(`Loaded ${data.length} messages for customer ${selectedCustomerId}`);
          
          const formattedMessages: Message[] = data.map((message: any) => ({
            id: message.id,
            content: message.content,
            timestamp: new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            isAI: message.is_ai_response,
            isSent: message.is_sent === true,
            direction: message.direction,
            is_from_customer: message.is_from_customer
          }));

          setMessages(formattedMessages);
        } catch (error) {
          console.error('Error loading messages for customer:', error);
        } finally {
          setLoading(false);
        }
      };

      loadMessagesForCustomer();
      
      // Set up real-time subscription for message updates
      const messagesUpdateChannel = supabase
        .channel('message-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `contact_id=eq.${selectedCustomerId}`
          },
          (payload) => {
            console.log('Message updated:', payload);
            
            // Update the message in the UI without creating duplicates
            if (payload.new && payload.new.id) {
              setMessages(prev => {
                // Check if we already have this message - if so, just update it
                const existingMessageIndex = prev.findIndex(msg => msg.id === payload.new.id);
                
                if (existingMessageIndex >= 0) {
                  // Update existing message
                  const updatedMessages = [...prev];
                  updatedMessages[existingMessageIndex] = {
                    ...updatedMessages[existingMessageIndex],
                    isSent: payload.new.is_sent === true
                  };
                  return updatedMessages;
                }
                
                // If message isn't found by ID, we shouldn't add it here - the INSERT handler will handle that
                return prev;
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `contact_id=eq.${selectedCustomerId}`
          },
          (payload) => {
            console.log('New message received:', payload);
            
            // Only add the message if it doesn't already exist
            if (payload.new) {
              setMessages(prev => {
                // First, check if message with this exact ID already exists
                if (prev.some(msg => msg.id === payload.new.id)) {
                  console.log('Message with this ID already exists, updating status');
                  // Update the status instead of adding a duplicate
                  return prev.map(msg => 
                    msg.id === payload.new.id 
                      ? { ...msg, isSent: payload.new.is_sent === true }
                      : msg
                  );
                }
                
                // Next, check if there's a similar message (same content sent recently)
                const similarMessage = prev.find(msg => 
                  msg.content === payload.new.content && 
                  Math.abs(new Date(msg.timestamp).getTime() - new Date(payload.new.timestamp).getTime()) < 10000
                );
                
                if (similarMessage) {
                  console.log('Similar message exists, updating ID and status');
                  // Update the existing message with the database ID and status
                  return prev.map(msg => 
                    msg.id === similarMessage.id 
                      ? { 
                          ...msg,
                          id: payload.new.id, 
                          isSent: payload.new.is_sent === true 
                        }
                      : msg
                  );
                }
                
                // For messages from other senders or truly new messages, add them
                // This usually happens for incoming messages, not our own outgoing ones
                if (payload.new.is_from_customer || payload.new.direction === 'incoming') {
                  console.log('Adding incoming message to UI');
                  return [...prev, {
                    id: payload.new.id,
                    content: payload.new.content,
                    timestamp: new Date(payload.new.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    }),
                    isAI: payload.new.is_ai_response,
                    isSent: payload.new.is_sent === true,
                    direction: payload.new.direction,
                    is_from_customer: payload.new.is_from_customer
                  }];
                }
                
                console.log('Ignoring message to prevent duplication');
                return prev;
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesUpdateChannel);
      };
    } else {
      // Clear messages when no customer is selected
      setMessages([]);
    }
  }, [selectedCustomerId, supabase]);

  // Load autopilot status on component mount
  useEffect(() => {
    const loadAutopilotStatus = async () => {
      try {
        console.log("Loading autopilot status silently...");
        
        // Use the status endpoint to get current state
        const response = await fetch('/api/autopilot/status', {
          // Add cache: 'no-store' to prevent caching
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Autopilot status loaded:", data);
          
          // Update local state based on the response without showing UI
          setIsCopilotActive(data.active);
          
          // If autopilot is active, trigger orchestration API but don't open panel
          if (data.active) {
            console.log("Autopilot is active, running silently");
            
            // Trigger a message fetch by calling the orchestration API
            try {
              const orchestrationResponse = await fetch('/api/orchestration?endpoint=health');
              console.log('Initial orchestration check on load:', 
                await orchestrationResponse.json());
            } catch (error) {
              console.warn('Initial orchestration check failed:', error);
            }
          }
        } else {
          console.error(`Failed to load autopilot status: ${response.status}`);
          // Default to inactive for safety
          setIsCopilotActive(false);
        }
      } catch (error) {
        console.error('Error loading autopilot status:', error);
        // Fallback: reset to inactive for safety
        setIsCopilotActive(false);
      }
    };
    
    loadAutopilotStatus();
  }, []);

  // Check if user is admin
  useEffect(() => {
    // Check for admin token in localStorage
    const adminToken = localStorage.getItem('admin_token');
    setIsAdmin(!!adminToken);
    
    // Also check with the server
    const checkAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/check-session');
        const data = await response.json();
        if (data.isAdmin) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error checking admin session:', error);
      }
    };
    
    checkAdminSession();
  }, []);

  // Resizer Functionality
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        const container = containerRef.current;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        
        // Adjust min and max width constraints
        const minWidth = 180;
        const maxWidth = Math.min(350, containerRect.width * 0.35); // Limit to 35% of width, max 350px
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setCustomerListWidth(newWidth);
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  // Handler functions
  const handleSendMessage = async (content: string): Promise<void> => {
    if (!selectedCustomerId || !supabase) {
      console.error("No customer selected or Supabase client not initialized");
      return;
    }

    try {
      // Set the current time to ensure consistency
      const timestamp = new Date().toISOString();
      const displayTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Generate a unique ID for this message attempt
      const tempId = `temp-${Date.now()}`;
      
      // Remove any existing messages with exactly the same content sent in the last 5 seconds
      // This prevents any duplicate messages that might occur
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => 
          !(msg.content === content && 
            Math.abs(new Date().getTime() - new Date(msg.timestamp).getTime()) < 5000)
        );
        
        // If we filtered anything, log it
        if (filteredMessages.length < prev.length) {
          console.log(`Removed ${prev.length - filteredMessages.length} duplicate messages`);
        }
        
        return filteredMessages;
      });
      
      // Add message initially with pending (clock) status
      const tempMessage: Message = {
        id: tempId,
        content,
        timestamp: displayTime,
        isAI: false,
        isSent: false, // Start with clock icon
        direction: 'outgoing',
        is_from_customer: false
      };
      
      // Add message to UI with clock icon
      console.log('Adding message to UI with pending status:', tempId);
      setMessages(prev => [...prev, tempMessage]);
      
      // Insert message into Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert({
          contact_id: selectedCustomerId,
          content,
          direction: 'outgoing',
          is_ai_response: false,
          is_from_customer: false,
          is_sent: false, // Start with not sent
          is_viewed: true,
          timestamp,
        })
        .select();

      if (error) throw error;

      // Update customer's last_contact timestamp
      await supabase
        .from('contacts')
        .update({ last_contact: timestamp })
        .eq('id', selectedCustomerId);

      // Update message ID from temp to database ID
      if (data && data[0]) {
        console.log(`Updating message ID: ${tempId} → ${data[0].id}`);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId 
              ? { ...msg, id: data[0].id }
              : msg
          )
        );
        
        // Store the database ID for the next step
        const dbMessageId = data[0].id;
        
        // Send the message via API
        const contact = customers.find(c => c.id === selectedCustomerId);
        if (contact) {
          try {
            console.log(`Sending message via API to contact: ${contact.id}`);
            
            const response = await fetch('/api/send-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contactId: contact.id,
                contactInfo: contact.contact_info,
                message: content,
                messageId: dbMessageId
              })
            });
            
            const result = await response.json();
            
            if (result.success) {
              console.log('Message sent successfully! Updating tick status');
              
              // Update the SAME message bubble with tick icon
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === dbMessageId
                    ? { ...msg, isSent: true }
                    : msg
                )
              );
            } else {
              throw new Error(result.error || 'Failed to send message');
            }
          } catch (err) {
            console.error('Error sending message via API:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleQuery = async (prompt: string) => {
    try {
      setIsProcessingQuery(true); // Show processing state in query input
      setQueryResults(null); // Clear any existing results
      setPendingAction(null); // Clear any pending actions
      setLastQuery(prompt); // Store the query text for display
      
      // Create a temporary results object to show animation while fetching
      const tempResults: QueryResult = {
        type: 'query_result',
        memories: []
      };
      setQueryResults(tempResults);
      
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      console.log('Query response:', data);

      if (data.type === 'query_result') {
        // Make sure we have proper user_id for each memory item
        if (data.memories && Array.isArray(data.memories)) {
          // Ensure each memory has correct format
          const formattedMemories = data.memories.map((mem: any) => {
            // Make sure memory has a user_id
            if (!mem.user_id && mem.id) {
              mem.user_id = mem.id;
            }
            // Ensure created_at exists
            if (!mem.created_at) {
              mem.created_at = new Date().toISOString();
            }
            // Format content for better display if it's a contact
            if (mem.name && mem.contact_info) {
              mem.content = `${mem.name} mentioned "${prompt.replace(/show me that contact who sent me mesg |"|\'/g, '')}"`;
            }
            return mem;
          });
          
          // Set formatted query results
          setQueryResults({
            type: 'query_result',
            memories: formattedMemories,
            contact: data.contact
          });
        } else {
          // Just set the data as is
          setQueryResults(data as QueryResult);
        }
      } else if (data.type === 'summary_result') {
        // Show customer summary directly
        setQueryResults(data as QueryResult);
      } else if (data.type === 'summary') {
        console.log('Customer summary request:', data.query);
        
        // For summary requests, make a second request to get the actual data
        const summaryResponse = await fetch('/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: `get_customer_summary ${data.query.parameters.customer_name}` 
          }),
        });

        const summaryData = await summaryResponse.json();
        console.log('Summary data:', summaryData);

        if (summaryData.type === 'summary_result') {
          // Display the summary data directly
          setQueryResults(summaryData as QueryResult);
        }
      } else if (data.type === 'pending_action') {
        // Store the pending action
        setPendingAction({
          action: data.action,
          message: data.message,
          recipients: data.recipients
        });
        
        // ALSO create queryResults for display
        if (data.recipients && Array.isArray(data.recipients)) {
          // Format recipients as memories for the UI to display
          const formattedMemories = data.recipients.map((recipient: any) => ({
            id: recipient.id,
            user_id: recipient.id,
            content: `${recipient.name} (${recipient.contact_info})`,
            name: recipient.name,
            contact_info: recipient.contact_info,
            created_at: new Date().toISOString(),
            memory_data: {
              type: 'action_recipient',
              action: data.action,
              message: data.message
            }
          }));
          
          setQueryResults({
            type: 'action_result',
            memories: formattedMemories,
            actionMessage: data.message,
            actionType: data.action
          });
        }
      } else if (data.error) {
        console.error('Query error:', data.error);
        alert(`Error: ${data.error}`);
        setQueryResults(null);
      }
    } catch (error: any) {
      console.error('Error processing query:', error);
      alert(`Error processing query: ${error.message}`);
      setQueryResults(null);
    } finally {
      setIsProcessingQuery(false); // Hide processing state
    }
  };

  // Add a function to handle contact selection
  const handleContactSelect = (contactId: string | null) => {
    setSelectedCustomerId(contactId);
    setQueryResults(null); // Close the results dialog
    
    // Only try to scroll if we have a valid contactId
    if (contactId) {
      const contactElement = document.querySelector(`[data-customer-id="${contactId}"]`);
      if (contactElement) {
        contactElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    try {
      setIsProcessingAction(true);
      
      // Send to each recipient
      for (const recipient of pendingAction.recipients) {
        try {
          // First execute the action
          const actionResponse = await fetch('/api/execute-action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: pendingAction.action,
              message: pendingAction.message,
              recipients: [recipient]
            }),
          });

          if (!actionResponse.ok) {
            throw new Error('Failed to execute action');
          }

          // Then send the actual message
          const sendResponse = await fetch('/api/send-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contactId: recipient.id,
              contactInfo: recipient.contact_info,
              message: pendingAction.message
            })
          });

          if (!sendResponse.ok) {
            throw new Error('Failed to send message');
          }

          const result = await sendResponse.json();
          console.log('Message sent successfully:', result);
        } catch (error) {
          console.error('Error sending message:', error);
          throw error;
        }
      }

      // Set success state
      setActionResult({
        success: true,
        message: `Action completed: Sent message to ${pendingAction.recipients.length} recipient(s)`
      });
      
      // Clear the pending action
      setPendingAction(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionResult(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error executing action:', error);
      
      // Set error state
      setActionResult({
        success: false,
        message: `Error: ${error.message || 'Failed to complete action'}`
      });
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setActionResult(null);
      }, 3000);
      
      // Clear the pending action
      setPendingAction(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
  };

  // Autopilot toggle function
  const toggleAutopilot = async () => {
    try {
      console.log("Toggling autopilot silently...");
      
      // Toggle the state locally first for immediate feedback
      setIsCopilotActive(prev => !prev);
      
      // Use the toggle endpoint
      const response = await fetch('/api/autopilot/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to update autopilot status: ${response.status} - ${errorText}`);
        // Revert the local state change if the server request failed
        setIsCopilotActive(prev => !prev);
        return;
      }
      
      const data = await response.json();
      console.log('Autopilot toggle response:', data);
      
      // Update local state based on the response from the server
      setIsCopilotActive(data.active);
      
      // If autopilot is now active, trigger the orchestration API but don't open the panel
      if (data.active) {
        console.log('Autopilot activated silently');
        
        // Trigger a message fetch by calling the orchestration API without showing UI
        try {
          const orchestrationResponse = await fetch('/api/orchestration?endpoint=health');
          console.log('Initial orchestration check:', await orchestrationResponse.json());
        } catch (error) {
          console.warn('Initial orchestration check failed:', error);
        }
      }
    } catch (error) {
      console.error('Error toggling autopilot:', error);
      // Revert the local state change if there was an error
      setIsCopilotActive(prev => !prev);
    }
  };

  const handleCreateBot = () => {
    router.push('/create-bot');
  };

  const handleRetryMessage = async (messageId: string) => {
    console.log(`Resending message: ${messageId}`);
    
    // Find the message and customer info
    const message = messages.find(m => m.id === messageId);
    const contact = customers.find(c => c.id === selectedCustomerId);
    
    if (!message || !contact) {
      console.error("Cannot resend message: message or contact not found");
      return;
    }
    
    try {
      // First update UI to show message as sending
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                isSent: true
              }
            : msg
        )
      );
      
      // Then call the API to actually send the message
      fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactId: contact.id,
          contactInfo: contact.contact_info,
          message: message.content,
          messageId: message.id
        })
      }).then(response => {
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        return response.json();
      }).then(result => {
        console.log('Message send result:', result);
      }).catch(error => {
        console.error(`Error sending message ${messageId}:`, error);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? {
                  ...msg,
                  isSent: false
                }
              : msg
          )
        );
      });
    } catch (error) {
      console.error(`Error in handleRetryMessage:`, error);
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    
    // If entering fullscreen, set focus on chat
    if (!isFullScreen) {
      // Handle any specific fullscreen behavior here
      const chatInput = document.querySelector('input[type="text"][placeholder="Type a message..."]');
      if (chatInput) {
        setTimeout(() => {
          (chatInput as HTMLInputElement).focus();
        }, 100);
      }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className={cn(
        "flex h-screen w-full relative transition-colors duration-300",
        isDarkTheme 
          ? "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" 
          : "bg-gradient-to-b from-gray-50 via-teal-50 to-teal-100",
        isFullScreen && "fixed inset-0 z-50"
      )}
    >
      {/* Admin indicator badge */}
      {isAdmin && (
        <div className="absolute top-2 right-2 bg-red-800 text-white text-xs px-2 py-1 rounded-md z-10 flex items-center">
          <span className="h-2 w-2 bg-red-400 rounded-full mr-1 animate-pulse"></span>
          Admin
        </div>
      )}
      
      {/* Telegram Connector */}
      <div className={`absolute top-2 ${isAdmin ? 'right-24' : 'right-4'} z-20`}>
        <TelegramConnector className="shadow-xl" />
      </div>
      
      {/* Sidebar */}
      {!isFullScreen && <TealSidebar />}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Full screen header with controls */}
        {isFullScreen && (
          <FullscreenHeader 
            isCopilotActive={isCopilotActive}
            toggleAutopilot={toggleAutopilot}
            openAgentModal={() => setIsAgentModalOpen(true)}
            handleCreateBot={handleCreateBot}
            toggleFullScreen={toggleFullScreen}
          />
        )}
        
        {/* Search Bar - Hidden in fullscreen mode */}
        {!isFullScreen && (
          <div className="flex-none w-full max-w-2xl mx-auto px-4 py-3">
            <SearchBar 
              onQuery={handleQuery}
              isProcessingQuery={isProcessingQuery}
              openAgentModal={() => setIsAgentModalOpen(true)}
              handleCreateBot={handleCreateBot}
              toggleAutopilot={toggleAutopilot}
              isCopilotActive={isCopilotActive}
              router={router}
            />
          </div>
        )}

        {/* Main content with customer list and chat */}
        <div className="flex-1 flex overflow-hidden relative">
          <div 
            ref={containerRef}
            className="flex flex-1 w-full h-full overflow-hidden bg-gradient-to-br from-gray-900/30 via-slate-900/20 to-slate-950/30 rounded-lg shadow-xl"
          >
            {/* Customer List Panel */}
            <div className="flex-none h-full relative" style={{ width: `${customerListWidth}px` }}>
              <CustomerListPanel 
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                setSelectedCustomerId={handleContactSelect}
                loading={loading}
                isFullScreen={isFullScreen}
                containerWidth={containerRef.current?.clientWidth || 0}
              />
              
              {/* Add a resize handle */}
              <div
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 transition-colors z-10",
                  isDragging ? "bg-teal-500/50" : "bg-transparent"
                )}
                onMouseDown={() => setIsDragging(true)}
              />
            </div>

            {/* Chat Panel */}
            <div className="flex-1 h-full overflow-hidden">
              <ChatPanel 
                selectedCustomerId={selectedCustomerId}
                customers={customers}
                messages={messages}
                onSendMessage={handleSendMessage}
                onRetryMessage={handleRetryMessage}
                isTyping={isTyping}
                isCopilotActive={isCopilotActive}
                isFullScreen={isFullScreen}
              />
            </div>
          </div>

          {/* Power Button for Autopilot */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              toggleAutopilot();
              setIsMessagingPanelOpen(true);
            }}
            className={cn(
              "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50",
              isCopilotActive 
                ? "bg-teal-500 hover:bg-teal-600 text-white" 
                : "bg-gray-700 hover:bg-gray-800 text-gray-200",
              "backdrop-blur-md border border-white/10"
            )}
          >
            {isCopilotActive ? (
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
              >
                <Zap className="h-6 w-6" />
              </motion.div>
            ) : (
              <Zap className="h-6 w-6" />
            )}
            
            {/* Pulsing ring effect when active */}
            {isCopilotActive && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  border: '2px solid',
                  borderColor: 'rgb(20, 184, 166)'
                }}
              />
            )}
          </motion.button>

          {/* Overlays */}
          <AnimatePresence>
            {queryResults && (
              <QueryResultsOverlay 
                queryResults={queryResults}
                onClose={() => setQueryResults(null)}
                onSelectContact={handleContactSelect}
                lastQuery={lastQuery}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAgentModalOpen && (
          <SetupAgent 
            isOpen={isAgentModalOpen} 
            onClose={() => setIsAgentModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Messaging Panel with enhanced transition */}
      <AnimatePresence>
        {isMessagingPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300
            }}
            className="fixed inset-0 z-50"
          >
            <CombinedMessagingPanel
              isOpen={isMessagingPanelOpen}
              onClose={() => setIsMessagingPanelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DashboardContainer;
