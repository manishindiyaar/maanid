'use client'

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";

// Self-contained types
interface Message {
  id: string;
  content: string;
  timestamp: string;
  created_at?: string;
  is_from_customer: boolean;
  isAI?: boolean;
  isSent?: boolean;
  message_status?: string;
  direction?: string;
  is_viewed?: boolean;
}

interface ChatInterfaceProps {
  customerName: string;
  customerId?: string;
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onRetryMessage?: (messageId: string) => Promise<void>;
  isTyping?: boolean;
  theme?: 'light' | 'dark';
  renderMessageMetadata?: (message: Message) => React.ReactNode | null;
}

const ChatInterface = ({
  customerName,
  customerId,
  messages,
  onSendMessage,
  onRetryMessage,
  isTyping = false,
  theme = 'dark',
  renderMessageMetadata,
}: ChatInterfaceProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasNewUnviewedMessage, setHasNewUnviewedMessage] = useState(false);
  const [previousMessagesLength, setPreviousMessagesLength] = useState(0);
  const [messageInput, setMessageInput] = useState('');
  const isDarkTheme = theme === 'dark';
  const [viewedMessageIds, setViewedMessageIds] = useState<string[]>([]);
  
  // When messages change, mark customer messages as viewed
  useEffect(() => {
    if (!customerId) return;
    
    // Find customer messages that are not viewed
    const unviewedMessages = messages.filter(
      msg => msg.is_from_customer && !msg.is_viewed && !viewedMessageIds.includes(msg.id)
    );
    
    if (unviewedMessages.length > 0) {
      const messageIds = unviewedMessages.map(msg => msg.id);
      console.log(`ChatInterface: Found ${messageIds.length} unviewed messages to mark as viewed`);
      
      // Update viewed message IDs locally to prevent duplicate API calls
      setViewedMessageIds(prev => [...prev, ...messageIds]);
      
      // Call API to mark messages as viewed
      const markMessagesAsViewed = async () => {
        try {
          console.log(`ChatInterface: Marking messages as viewed for customer ${customerId}`, messageIds);
          const response = await fetch('/api/messages/mark-viewed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contactId: customerId,
              messageIds: messageIds 
            })
          });
          
          if (!response.ok) {
            console.error('Failed to mark messages as viewed');
            return;
          }
          
          const data = await response.json();
          console.log(`ChatInterface: API response - Updated ${data.updatedCount} messages`);
          
          // If we have a parent component we could notify it here
          // to refresh the customer list
        } catch (error) {
          console.error('Error marking messages as viewed:', error);
        }
      };
      
      markMessagesAsViewed();
    }
  }, [messages, customerId, viewedMessageIds]);
  
  // Check for new unviewed messages from customer
  useEffect(() => {
    if (messages.length > previousMessagesLength) {
      // Check if any of the new messages are unviewed and from customer
      const newMessages = messages.slice(previousMessagesLength);
      const hasUnviewedCustomerMessage = newMessages.some(
        (msg) => msg.is_from_customer && !msg.is_viewed && !viewedMessageIds.includes(msg.id)
      );
      
      if (hasUnviewedCustomerMessage) {
        console.log('New unviewed customer messages detected');
        setHasNewUnviewedMessage(true);
        
        // Force scroll to bottom for new customer messages
        setTimeout(() => {
          scrollToBottom(true);
        }, 100);
      }
      
      // Always scroll to bottom for new messages, but with smooth animation for our own messages
      if (!hasUnviewedCustomerMessage && newMessages.some(msg => !msg.is_from_customer)) {
        console.log('New outgoing messages detected');
        setTimeout(() => {
          scrollToBottom(false); // Smooth scroll for our own messages
        }, 100);
      }
    }
    
    setPreviousMessagesLength(messages.length);
  }, [messages, previousMessagesLength, viewedMessageIds]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current && scrollContainerRef.current) {
      const behavior = instant || hasNewUnviewedMessage ? "auto" : "smooth";
      
      console.log(`Scrolling to bottom (${behavior})`);
      messagesEndRef.current.scrollIntoView({ 
        behavior, 
        block: "end" 
      });
      
      if (hasNewUnviewedMessage) {
        setHasNewUnviewedMessage(false);
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use a small delay to ensure DOM has updated
    const scrollTimeout = setTimeout(() => {
      scrollToBottom();
      
      // Check if we're at the bottom already
      if (scrollContainerRef.current) {
        const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
        const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
        
        // If not at bottom and we have new messages, force scroll
        if (!isAtBottom && messages.length > previousMessagesLength) {
          console.log('New messages detected, forcing scroll to bottom');
          scrollToBottom(true);
        }
      }
    }, 100);
    
    return () => clearTimeout(scrollTimeout);
  }, [messages, hasNewUnviewedMessage, previousMessagesLength]);

  // Force scroll to bottom when customer changes
  useEffect(() => {
    console.log('Customer changed, forcing scroll to bottom');
    scrollToBottom(true);
    
    // Reset viewed message IDs when customer changes
    setViewedMessageIds([]);
  }, [customerId]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => scrollToBottom(true);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    const message = messageInput;
    setMessageInput('');
    await onSendMessage(message);
  };
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: {date: string, messages: Message[]}[] = [];
    
    messages.forEach((message) => {
      // Use created_at field if available, otherwise fall back to timestamp
      const dateString = getMessageDateString(message.created_at || message.timestamp);
      
      const existingGroup = groups.find(group => group.date === dateString);
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: dateString, messages: [message] });
      }
    });
    
    return groups;
  };

  // Format dates
  const getMessageDateString = (dateStr?: string): string => {
    if (!dateStr) return "Today";
    
    try {
      const messageDate = new Date(dateStr);
      
      if (isNaN(messageDate.getTime())) {
        return "Today";
      }
      
      if (isToday(messageDate)) {
        return "Today";
      } else if (isYesterday(messageDate)) {
        return "Yesterday";
      } else {
        return format(messageDate, "MMMM d, yyyy");
      }
    } catch (error) {
      console.error("Error parsing date:", dateStr, error);
      return "Today";
    }
  };

  const messageGroups = groupMessagesByDate();

  // Format timestamp for message bubbles
  const formatMessageTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return timestamp;
    }
  };

  // Background pattern CSS
  const whatsappBgDark = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='100' viewBox='0 0 600 100'%3E%3Cg stroke='%23223344' stroke-width='0.5' stroke-miterlimit='10' fill='%23192734'%3E%3Cpath d='M0 100V40h100v60H0zM100 100V0h100v100H100zM300 100V20h100v80H300zM400 100V10h100v90H400zM500 100V0h100v100H500zM200 40V0h100v40H200zM0 40V0h100v40H0z'/%3E%3Cpath d='M100 60V0h100v60H100zM200 100V60h100v40H200zM300 40V0h100v40H300zM400 30V0h100v30H400zM200 40V0h100v40H200z'/%3E%3C/g%3E%3C/svg%3E")`;
  
  const whatsappBgLight = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='100' viewBox='0 0 600 100'%3E%3Cg stroke='%23C4E8E2' stroke-width='0.5' stroke-miterlimit='10' fill='%23F8FBFB'%3E%3Cpath d='M0 100V40h100v60H0zM100 100V0h100v100H100zM300 100V20h100v80H300zM400 100V10h100v90H400zM500 100V0h100v100H500zM200 40V0h100v40H200zM0 40V0h100v40H0z'/%3E%3Cpath d='M100 60V0h100v60H100zM200 100V60h100v40H200zM300 40V0h100v40H300zM400 30V0h100v30H400zM200 40V0h100v40H200z'/%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="flex-1 flex flex-col h-full relative transition-colors duration-300 font-sans">
      {/* Background pattern */}
      <div 
        className={`absolute inset-0 z-0 opacity-30 ${isDarkTheme ? "bg-gray-900" : "bg-gray-50"}`}
        style={{ 
          backgroundImage: isDarkTheme ? whatsappBgDark : whatsappBgLight,
          backgroundRepeat: "repeat"
        }}
      />
      
      {/* Chat Header - Built-in implementation with 3D gradient logo */}
      <div className={`flex items-center p-3 border-b ${isDarkTheme ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-gray-200"} z-10 backdrop-blur-md`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-3 overflow-hidden relative`}
             style={{
               boxShadow: isDarkTheme 
                 ? '0 8px 16px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.2), inset 0 2px 4px rgba(255,255,255,0.2)' 
                 : '0 8px 16px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(255,255,255,0.8), inset 0 2px 4px rgba(255,255,255,0.8)'
             }}>
          <div className="absolute inset-0" 
               style={{
                 background: isDarkTheme 
                   ? 'linear-gradient(135deg, #06b6d4, #0e7490)' 
                   : 'linear-gradient(135deg, #14b8a6, #0f766e)',
                 opacity: '0.8'
               }}>
          </div>
          <div className="absolute" 
               style={{
                 width: '200%',
                 height: '200%',
                 top: '-50%',
                 left: '-50%',
                 background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
                 opacity: '0.2'
               }}>
          </div>
          <span className="text-lg font-bold text-white relative z-10 uppercase tracking-wider"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {customerName.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className={`font-medium ${isDarkTheme ? "text-white" : "text-gray-800"}`}>{customerName}</h3>
        </div>
      </div>
      
      {/* Messages Container */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto will-change-scroll scrollbar-thin scrollbar-track-transparent scrollbar-thumb-rounded-full z-10 relative ${
          isDarkTheme
            ? "scrollbar-thumb-teal-700/40 hover:scrollbar-thumb-teal-600/60"
            : "scrollbar-thumb-teal-500/30 hover:scrollbar-thumb-teal-400/50"
        }`}
        style={{ 
          WebkitOverflowScrolling: 'touch', 
          height: 'calc(100vh - 190px)',
          maxHeight: 'calc(100vh - 190px)'
        }}
      >
        <div className="p-3 space-y-1 min-h-full flex flex-col">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex-1 flex items-center justify-center ${
                  isDarkTheme ? "text-blue-200" : "text-teal-600"
                }`}
              >
                <div className="text-center">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${
                    isDarkTheme
                      ? "bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-700" 
                      : "bg-gradient-to-br from-teal-400 to-teal-600"
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-12 h-12 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2 text-gray-800">Start the conversation</p>
                  <p className={`text-sm max-w-xs mx-auto ${
                    isDarkTheme ? "text-gray-300" : "text-gray-500"
                  }`}>Send a message to begin chatting with {customerName}</p>
                </div>
              </motion.div>
            )}
            
            {messages.length > 0 && (
              <div className="space-y-3 px-2 pb-4 w-full">
                {messageGroups.map((group, groupIndex) => (
                  <div key={group.date} className="pt-1">
                    {/* Date divider */}
                    <div className="flex justify-center mb-3">
                      <div className={`text-xs px-3 py-1 rounded-full ${
                        isDarkTheme
                          ? "bg-gray-800/70 text-gray-300"
                          : "bg-gray-200/70 text-gray-800"
                      } shadow-sm`}>
                        {group.date}
                      </div>
                    </div>
                    
                    {group.messages.map((message, idx) => {
                      // Check if this is the first message in a sequence from the same sender
                      const isFirstInSequence = idx === 0 || 
                        group.messages[idx - 1].is_from_customer !== message.is_from_customer;
                      
                      // Check if this is the last message in a sequence from the same sender
                      const isLastInSequence = idx === group.messages.length - 1 || 
                        group.messages[idx + 1].is_from_customer !== message.is_from_customer;
                      
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${message.is_from_customer ? "justify-start" : "justify-end"} mb-1`}
                        >
                          {/* Message Bubble - WhatsApp-like style */}
                          {message.is_from_customer ? (
                            <div className={`rounded-lg p-3 max-w-[75%] shadow-sm ${
                              isDarkTheme ? "bg-gray-700 text-white" : "bg-white text-gray-800"
                            } ${isFirstInSequence ? "rounded-tl-none" : ""}`}>
                              <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                              
                              {/* Timestamp for customer messages */}

                              
                              {/* Render metadata if provided */}
                              {renderMessageMetadata && renderMessageMetadata(message)}
                            </div>
                          ) : (
                            <div className={`rounded-lg p-3 max-w-[75%] relative overflow-hidden ${isFirstInSequence ? "rounded-tr-none" : ""}`}
                                 style={{
                                   background: isDarkTheme 
                                     ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.9), rgba(13, 148, 136, 0.9))' 
                                     : 'linear-gradient(135deg, rgba(20, 184, 166, 0.8), rgba(13, 148, 136, 0.8))',
                                   boxShadow: isDarkTheme 
                                     ? '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)' 
                                     : '0 4px 8px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.4)'
                                 }}>
                              {/* 3D gradient effect overlay */}
                              <div className="absolute inset-0 opacity-20"
                                   style={{
                                     background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)'
                                   }}>
                              </div>
                              
                              <div className="text-sm whitespace-pre-wrap break-words text-white relative z-10">{message.content}</div>
                              
                              {/* Timestamp and status for outgoing messages */}
                              <div className="flex justify-end items-center gap-1 mt-1">
                                <span>
                                  {message.isSent ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                                      className="w-3.5 h-3.5 text-white/90">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <div 
                                      onClick={() => onRetryMessage?.(message.id)} 
                                      className="cursor-pointer hover:opacity-70 transition-opacity"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                                        className="w-3.5 h-3.5 text-white/90">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                    </div>
                                  )}
                                </span>
                              </div>
                              
                              {/* Render metadata if provided */}
                              {renderMessageMetadata && renderMessageMetadata(message)}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start my-1 px-2"
              >
                <div className={`rounded-lg rounded-tl-none shadow-sm px-4 py-3 max-w-[240px] ${
                  isDarkTheme ? "bg-gray-700" : "bg-white"
                }`}>
                  <div className="flex space-x-1">
                    <div className={`h-2 w-2 rounded-full animate-bounce ${
                      isDarkTheme ? "bg-blue-400" : "bg-teal-400"
                    }`} style={{ animationDelay: '0s' }}></div>
                    <div className={`h-2 w-2 rounded-full animate-bounce ${
                      isDarkTheme ? "bg-blue-400" : "bg-teal-400"
                    }`} style={{ animationDelay: '0.2s' }}></div>
                    <div className={`h-2 w-2 rounded-full animate-bounce ${
                      isDarkTheme ? "bg-blue-400" : "bg-teal-400"
                    }`} style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>
      
      {/* New message indicator */}
      <AnimatePresence>
        {hasNewUnviewedMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-1 z-10 font-medium"
            onClick={() => scrollToBottom(true)}
          >
            <span className="h-2 w-2 bg-white rounded-full"></span>
            New message
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Chat Input - Built-in implementation */}
      <div className={`p-3 border-t ${isDarkTheme ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-gray-200"} z-10 backdrop-blur-md`}>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className={`flex-1 rounded-full px-4 py-2 outline-none ${
              isDarkTheme 
                ? "bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-teal-500" 
                : "bg-gray-100 text-gray-800 placeholder-gray-500 border border-gray-200 focus:border-teal-400"
            } transition-colors`}
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className={`rounded-full p-2 ${
              isDarkTheme 
                ? "bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-500" 
                : "bg-teal-500 text-white hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400"
            } transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;