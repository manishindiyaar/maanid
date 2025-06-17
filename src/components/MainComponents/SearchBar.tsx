'use client'

import { cn } from "./../../lib/utils";
import { useTheme } from "./../theme-provider";
import { motion } from "framer-motion";
import AdvancedSearchBar from "./../chat/AdvancedSearchBar";

interface SearchBarProps {
  onQuery: (prompt: string) => Promise<void>;
  isProcessingQuery: boolean;
  openAgentModal: () => void;
  handleCreateBot: () => void;
  toggleAutopilot: () => void;
  isCopilotActive: boolean;
  router: any;
}

const SearchBar = ({
  onQuery,
  isProcessingQuery,
  openAgentModal,
  handleCreateBot,
  toggleAutopilot,
  isCopilotActive,
  router
}: SearchBarProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  
  // Animation variants
  const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <motion.div 
      variants={slideUp} 
      className="container mx-auto px-4 py-6"
    >
      <div className="w-full max-w-4xl mx-auto">
        <AdvancedSearchBar 
          onSubmit={onQuery}
          isProcessing={isProcessingQuery}
          onCreateAgent={openAgentModal}
          onConnectAccount={handleCreateBot}
          onBotView={() => router.push('/bots')}
          onAutopilotToggle={toggleAutopilot}
          isAutopilotActive={isCopilotActive}
        />
      </div>
    </motion.div>
  );
};

export default SearchBar; 