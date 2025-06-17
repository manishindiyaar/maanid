'use client'

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, MessageCircle, Check, CheckCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "./../theme-provider";
import { cn } from "./../../lib/utils";

type Customer = {
  id: string
  name: string
  contact_info: string
  lastMessage?: string
  timestamp?: string
  last_contact?: string
  unreadCount?: number
  messages?: Array<{
    id: string
    content: string
    timestamp: string
    is_viewed?: boolean
    is_from_customer: boolean
  }>
}

interface CustomerListProps {
  customers: Customer[]
  onSelectCustomer: (id: string | null) => void
  selectedCustomerId: string | null
  loading: boolean
}

const CustomerList = ({
  customers,
  onSelectCustomer,
  selectedCustomerId,
  loading = false
}: CustomerListProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState("");
  const previousCustomersRef = useRef<Customer[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // When a customer is selected, mark all their messages as viewed in the database
  useEffect(() => {
    const markMessagesAsViewed = async (customerId: string) => {
      try {
        const customer = customers.find(c => c.id === customerId);
        if (customer?.messages) {
          // Get all unviewed messages from this customer
          const unviewedMessages = customer.messages.filter(msg => 
            msg.is_from_customer === true && msg.is_viewed === false
          );
          
          // If there are unviewed messages, update them in the database
          if (unviewedMessages.length > 0) {
            const messageIds = unviewedMessages.map(msg => msg.id);
            
            // Batch update messages as viewed
            const response = await fetch('/api/messages/mark-viewed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                contactId: customerId,
                messageIds: messageIds 
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to mark messages as viewed');
            }

            console.log(`Marked ${messageIds.length} messages as viewed for customer ${customerId}`);
          }
        }
      } catch (error) {
        console.error('Error marking messages as viewed:', error);
      }
    };

    if (selectedCustomerId) {
      markMessagesAsViewed(selectedCustomerId);
    }
  }, [selectedCustomerId, customers]);

  // Compute unread message count for each customer
  const computeUnreadCount = (customer: Customer) => {
    if (!customer.messages) return 0;
    
    // Count messages that are from the customer and not viewed
    return customer.messages.filter(message => 
      message.is_from_customer === true && 
      message.is_viewed === false
    ).length;
  };

  // Filter customers based on search query and sort by unread messages and recency
  const filteredCustomers = useMemo(() => {
    return customers
      .map(customer => {
        const unreadCount = computeUnreadCount(customer);
        const lastMessage = customer.messages && customer.messages.length > 0
          ? customer.messages[customer.messages.length - 1].content
          : "";
        
        return {
          ...customer,
          unreadCount,
          lastMessage
        };
      })
      .filter(customer => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // First sort by unread count
        const countDiff = (b.unreadCount || 0) - (a.unreadCount || 0);
        if (countDiff !== 0) return countDiff;
        
        // Then by last_contact timestamp (newest first)
        const aTimestamp = a.last_contact || a.timestamp || '';
        const bTimestamp = b.last_contact || b.timestamp || '';
        
        if (aTimestamp && bTimestamp) {
          return new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime();
        }
        
        return 0;
      });
  }, [customers, searchQuery]);

  // Function to generate a gradient background based on the customer name
  const getProfileColor = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = (hash % 60) + 170; // Limit to teal-bluish range (170-230)
    
    // Adjust saturation and lightness based on theme
    return isDarkTheme 
      ? `linear-gradient(135deg, hsl(${hue}, 60%, 35%), hsl(${hue + 20}, 70%, 25%))` 
      : `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${hue + 20}, 80%, 35%))`;
  };

  // Handle customer selection
  const handleSelectCustomer = (id: string) => {
    onSelectCustomer(id);
  };

  // Check if a customer has unread messages
  const hasUnreadMessages = (customer: Customer) => {
    const count = computeUnreadCount(customer);
    return count > 0;
  };

  // Ensure scroll position resets if search query changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  // Animation variants
  const listItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2,
        ease: "easeOut"
      }
    })
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className={cn(
              "w-full p-2 pl-9 pr-3 rounded-lg border focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400 transition-colors",
              isDarkTheme 
                ? "bg-gray-800/50 text-gray-200 border-teal-800/30" 
                : "bg-white/90 text-gray-800 border-teal-200/70 shadow-sm"
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className={cn(
            "absolute left-3 top-2.5 h-4 w-4",
            isDarkTheme ? "text-teal-500/60" : "text-teal-600/80"
          )} />
        </div>
      </div>
      
      <div 
        ref={listRef} 
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin pr-1",
          isDarkTheme 
            ? "scrollbar-thumb-teal-800/30 scrollbar-track-transparent" 
            : "scrollbar-thumb-teal-300/50 scrollbar-track-transparent"
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className={cn(
              isDarkTheme ? "text-teal-300/70" : "text-teal-700/70"
            )}>Loading conversations...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4",
              isDarkTheme 
                ? "bg-gradient-to-br from-teal-500/20 to-teal-600/20" 
                : "bg-gradient-to-br from-teal-200/60 to-teal-300/60"
            )}>
              <MessageCircle className={cn(
                "h-8 w-8",
                isDarkTheme ? "text-teal-400/60" : "text-teal-600/80"
              )} />
            </div>
            <p className={cn(
              "mb-1",
              isDarkTheme ? "text-teal-300/70" : "text-teal-700/90"
            )}>No conversations found</p>
            <p className={cn(
              "text-xs",
              isDarkTheme ? "text-teal-300/50" : "text-teal-600/60"
            )}>Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-1">
            {filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={listItemVariants}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all duration-300",
                  selectedCustomerId === customer.id 
                    ? (isDarkTheme
                        ? "bg-gradient-to-r from-slate-800/90 to-slate-800/70 border-l-2 border-teal-500" 
                        : "bg-gradient-to-r from-slate-700/90 to-slate-700/70 border-l-2 border-teal-500")
                    : (isDarkTheme 
                        ? "hover:bg-slate-800/50 hover:border-l hover:border-teal-500/40" 
                        : "hover:bg-slate-700/50 hover:border-l hover:border-teal-500/40"),
                  "hover:shadow-md"
                )}
                onClick={() => handleSelectCustomer(customer.id)}
                data-customer-id={customer.id}
                style={{
                  transform: selectedCustomerId === customer.id ? 'translateX(4px)' : 'translateX(0)',
                  boxShadow: selectedCustomerId === customer.id 
                    ? (isDarkTheme ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.2)')
                    : 'none'
                }}
              >
                <div className="flex items-center">
                  <div 
                    className={cn(
                      "h-11 w-11 rounded-full flex items-center justify-center mr-3 flex-shrink-0 shadow-md",
                      isDarkTheme ? "text-gray-900" : "text-white font-medium"
                    )}
                    style={{ background: getProfileColor(customer.name) }}
                  >
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h3 className={cn(
                        "truncate",
                        hasUnreadMessages(customer) 
                          ? (isDarkTheme ? 'font-bold text-white' : 'font-bold text-gray-900') 
                          : (isDarkTheme ? 'font-medium text-teal-50' : 'font-medium text-gray-700')
                      )}>
                        {customer.name}
                      </h3>
                      <span className={cn(
                        "text-xs ml-2 flex-shrink-0",
                        isDarkTheme ? "text-teal-300/70" : "text-teal-600/70"
                      )}>
                        {customer.timestamp}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1 items-center">
                      <p className={cn(
                        "text-sm truncate max-w-[140px] flex items-center gap-1",
                        hasUnreadMessages(customer) 
                          ? (isDarkTheme ? 'text-teal-300 font-medium' : 'text-teal-700 font-medium') 
                          : (isDarkTheme ? 'text-teal-300/60' : 'text-teal-600/70')
                      )}>
                        {!customer.messages || customer.messages.length === 0 ? (
                          <span className="text-xs italic">No messages yet</span>
                        ) : (
                          <>
                            {!hasUnreadMessages(customer) && customer.messages[customer.messages.length - 1]?.is_from_customer === false && (
                              <CheckCheck className={cn(
                                "h-3 w-3 mr-1 flex-shrink-0",
                                isDarkTheme ? "text-teal-400/80" : "text-teal-600/80"
                              )} />
                            )}
                            {customer.lastMessage}
                          </>
                        )}
                      </p>
                      {hasUnreadMessages(customer) && (
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 min-w-[20px] text-center",
                          isDarkTheme 
                            ? "bg-teal-500 text-gray-900" 
                            : "bg-teal-600 text-white"
                        )}>
                          {customer.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;