'use client'

import { cn } from "./../../lib/utils";
import { useTheme } from "./../theme-provider";
import { motion } from "framer-motion";
import ChatInterface from "./../chat/ChatInterface";
import { ArrowRight } from "lucide-react";
import { Customer, Message } from "./types";
import { Zap } from "lucide-react";

interface ChatPanelProps {
  selectedCustomerId: string | null;
  customers: Customer[];
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  onRetryMessage: (messageId: string) => Promise<void> | void;
  isTyping: boolean;
  isCopilotActive: boolean;
  isFullScreen: boolean;
}

const ChatPanel = ({
  selectedCustomerId,
  customers,
  messages,
  onSendMessage,
  onRetryMessage,
  isTyping,
  isCopilotActive,
  isFullScreen
}: ChatPanelProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  
  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);
  
  // Animation variants
  const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <motion.div 
      className={cn(
        "flex-1 flex flex-col w-full h-full overflow-hidden backdrop-blur-md relative",
        isDarkTheme
          ? (isFullScreen ? "bg-gradient-to-br from-gray-900/80 via-slate-900/70 to-slate-950/80" : "bg-gradient-to-br from-gray-900/80 via-slate-900/70 to-slate-950/80")
          : (isFullScreen ? "bg-gradient-to-br from-teal-900/90 via-teal-800/80 to-slate-900/90" : "bg-gradient-to-br from-teal-900/90 via-teal-800/80 to-slate-900/90")
      )}
      variants={slideUp}
      layout
      style={{
        boxShadow: isDarkTheme 
          ? 'inset -3px 0 15px rgba(20, 184, 166, 0.1), inset 0 -5px 10px rgba(0, 0, 0, 0.2)' 
          : 'inset -3px 0 15px rgba(13, 148, 136, 0.15), inset 0 -5px 10px rgba(0, 0, 0, 0.15)'
      }}
    >
      {/* 3D lighting effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-teal-500/10 to-transparent" />
        
        {/* Corner highlight */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-bl from-teal-400/5 via-teal-300/10 to-transparent rounded-full blur-xl" />
        
        {/* Bottom shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {selectedCustomerId ? (
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
          <ChatInterface 
            customerName={selectedCustomer?.name || "Customer"}
            customerId={selectedCustomerId}
            messages={messages as any}
            onSendMessage={onSendMessage}
            onRetryMessage={onRetryMessage as any}
            isTyping={isTyping}
          />
        </div>
      ) : (
        <motion.div 
          className="flex items-center justify-center w-full h-full relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background element with 3D effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-teal-500/5 to-transparent pointer-events-none" />
          
          <motion.div 
            className="text-center max-w-md p-8 relative"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: 0.2
            }}
          >
            <motion.div 
              className={cn(
                "mx-auto h-24 w-24 rounded-full flex items-center justify-center mb-8 shadow-xl",
                isDarkTheme
                  ? "bg-gradient-to-br from-teal-700/60 via-teal-600/50 to-teal-800/60 border border-teal-500/30"
                  : "bg-gradient-to-br from-teal-600/60 via-teal-500/50 to-teal-700/60 border border-teal-400/30"
              )}
              style={{
                boxShadow: isDarkTheme
                  ? '0 0 15px rgba(20, 184, 166, 0.2), 0 0 30px rgba(20, 184, 166, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                  : '0 0 20px rgba(13, 148, 136, 0.25), 0 0 40px rgba(13, 148, 136, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
              }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: isDarkTheme
                  ? '0 0 20px rgba(20, 184, 166, 0.3), 0 0 40px rgba(20, 184, 166, 0.2)'
                  : '0 0 25px rgba(13, 148, 136, 0.35), 0 0 50px rgba(13, 148, 136, 0.25)'
              }}
            >
              <ArrowRight className={cn("h-10 w-10", isDarkTheme ? "text-teal-300" : "text-white")} />
            </motion.div>
            <h3 className={cn(
              "text-2xl font-bold mb-4",
              isDarkTheme ? "text-teal-300" : "text-white"
            )}>Select a conversation</h3>
            <p className={cn(
              "mb-6 text-lg",
              isDarkTheme ? "text-teal-100/80" : "text-white/80"
            )}>Choose a chat from the sidebar to start messaging</p>
            {isCopilotActive && (
              <motion.div 
                className={cn(
                  "inline-flex items-center gap-2 py-3 px-5 rounded-xl border",
                  isDarkTheme
                    ? "bg-gradient-to-r from-teal-800/40 via-teal-600/30 to-teal-700/40 text-teal-300 border-teal-500/40"
                    : "bg-gradient-to-r from-teal-600/40 via-teal-500/30 to-teal-600/40 text-white border-teal-400/40"
                )}
                style={{
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                }}
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <Zap className={cn("h-5 w-5", isDarkTheme ? "text-teal-400" : "text-teal-300")} />
                </motion.div>
                <span className="font-medium">Autopilot is active</span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ChatPanel;
