'use client'

import { MessageSquare, Minimize, Zap, ZapOff, Bot, Plus } from "lucide-react";
import { cn } from "./../../lib/utils";
import { motion } from "framer-motion";
import { useTheme } from "./../theme-provider";

interface FullscreenHeaderProps {
  isCopilotActive: boolean;
  toggleAutopilot: () => void;
  openAgentModal: () => void;
  handleCreateBot: () => void;
  toggleFullScreen: () => void;
}

const FullscreenHeader = ({
  isCopilotActive,
  toggleAutopilot,
  openAgentModal,
  handleCreateBot,
  toggleFullScreen
}: FullscreenHeaderProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "backdrop-blur-md border-b py-2.5 px-4 flex justify-between items-center",
        isDarkTheme 
          ? "bg-gradient-to-r from-teal-900/60 to-teal-800/60 border-teal-800/30" 
          : "bg-gradient-to-r from-teal-100/60 to-teal-50/60 border-teal-200/30"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center",
          isDarkTheme 
            ? "bg-gradient-to-br from-teal-500/90 to-teal-600/90" 
            : "bg-gradient-to-br from-teal-400/90 to-teal-500/90"
        )}>
          <MessageSquare className="h-4 w-4 text-white" />
        </div>
        <h2 className={cn(
          "text-lg font-bold bg-clip-text text-transparent",
          isDarkTheme 
            ? "bg-gradient-to-r from-teal-300 to-teal-200" 
            : "bg-gradient-to-r from-teal-700 to-teal-600"
        )}>
          Bladex AI
        </h2>
      </div>
      
      <div className="flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleAutopilot}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border text-sm",
            isCopilotActive 
              ? (isDarkTheme 
                  ? "bg-gradient-to-r from-teal-600/20 to-teal-500/20 text-teal-300 border-teal-500/40" 
                  : "bg-gradient-to-r from-teal-200/50 to-teal-100/50 text-teal-700 border-teal-300/40")
              : (isDarkTheme 
                  ? "bg-gray-800/40 text-teal-100/70 border-teal-800/30" 
                  : "bg-gray-200/40 text-teal-700/70 border-teal-200/30")
          )}
        >
          {isCopilotActive ? 
            <Zap className={cn("h-3.5 w-3.5", isDarkTheme ? "text-teal-400" : "text-teal-600")} /> : 
            <ZapOff className="h-3.5 w-3.5" />}
          <span className="font-medium">
            {isCopilotActive ? "Auto" : "Manual"}
          </span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAgentModal}
          className={cn(
            "p-1.5 border rounded-lg",
            isDarkTheme 
              ? "bg-gradient-to-br from-teal-600/20 to-teal-500/20 text-teal-300 border-teal-500/40" 
              : "bg-gradient-to-br from-teal-200/50 to-teal-100/50 text-teal-700 border-teal-300/40"
          )}
        >
          <Bot className="w-4 h-4" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateBot}
          className={cn(
            "p-1.5 border rounded-lg",
            isDarkTheme 
              ? "bg-gradient-to-br from-teal-600/20 to-teal-500/20 text-teal-300 border-teal-500/40" 
              : "bg-gradient-to-br from-teal-200/50 to-teal-100/50 text-teal-700 border-teal-300/40"
          )}
        >
          <Plus className="w-4 h-4" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleFullScreen}
          className={cn(
            "p-1.5 border rounded-lg",
            isDarkTheme 
              ? "bg-gradient-to-br from-teal-600/20 to-teal-500/20 text-teal-300 border-teal-500/40" 
              : "bg-gradient-to-br from-teal-200/50 to-teal-100/50 text-teal-700 border-teal-300/40"
          )}
        >
          <Minimize className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default FullscreenHeader; 