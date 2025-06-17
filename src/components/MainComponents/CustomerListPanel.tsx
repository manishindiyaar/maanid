'use client'

import { cn } from "./../../lib/utils";
import { useTheme } from "./../theme-provider";
import { motion } from "framer-motion";
import CustomerList from "./../chat/CustomerList";
import BotIndicator from "./../bots/BotIndicator";
import { useRef, useState, useEffect } from "react";
import { Customer } from "./types";

interface CustomerListPanelProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  loading: boolean;
  isFullScreen: boolean;
  containerWidth: number;
}

const CustomerListPanel = ({
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  loading,
  isFullScreen,
  containerWidth
}: CustomerListPanelProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  
  // For resizable functionality
  const [customerListWidth, setCustomerListWidth] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Add global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        const container = containerRef.current;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        
        // Set min and max width constraints
        const minWidth = 200;
        const maxWidth = Math.max(containerWidth - 300, minWidth + 100);
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setCustomerListWidth(newWidth);
        }
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      // Add event listeners
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      // Clean up
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, containerWidth]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "flex flex-col h-full w-full overflow-hidden relative",
          isDarkTheme
            ? (isFullScreen 
                ? "border-r border-teal-600/40 bg-gradient-to-br from-teal-950/80 via-teal-900/70 to-slate-900/80" 
                : "border-r border-teal-600/40 bg-gradient-to-br from-teal-950/90 via-teal-900/80 to-slate-900/90 backdrop-blur-md")
            : (isFullScreen 
                ? "border-r border-teal-400/40 bg-gradient-to-br from-teal-800/90 via-teal-700/80 to-teal-900/90" 
                : "border-r border-teal-400/40 bg-gradient-to-br from-teal-800/90 via-teal-700/80 to-teal-900/90 backdrop-blur-md")
        )}
        style={{
          width: "100%",
          boxShadow: isDarkTheme 
            ? 'inset 3px 0 15px rgba(20, 184, 166, 0.15), inset 0 -5px 10px rgba(0, 0, 0, 0.2)' 
            : 'inset 3px 0 15px rgba(13, 148, 136, 0.2), inset 0 -5px 10px rgba(0, 0, 0, 0.1)'
        }}
        ref={containerRef}
      >
        {/* Animated 3D light effect */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-transparent via-teal-300/10 to-transparent" />
        
        {/* Highlights at the top */}
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-teal-400/10 to-transparent pointer-events-none" />
        
        {/* Bot indicator */}
        <div className={cn(
          "border-b z-10 sticky top-0 flex items-center backdrop-blur-md",
          isDarkTheme
            ? (isFullScreen
                ? "px-4 py-3 border-teal-600/30 bg-gradient-to-r from-teal-900/80 to-teal-800/50"
                : "px-4 py-3.5 border-teal-600/30 bg-gradient-to-r from-teal-900/80 to-teal-800/50")
            : (isFullScreen
                ? "px-4 py-3 border-teal-500/30 bg-gradient-to-r from-teal-700/90 to-teal-800/70"
                : "px-4 py-3.5 border-teal-500/30 bg-gradient-to-r from-teal-700/90 to-teal-800/70")
        )}
        style={{
          boxShadow: '0 5px 15px -5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
        >
          <BotIndicator selectedContactId={selectedCustomerId} />
        </div>
        
        {/* Customer list - Always scrollable */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto will-change-scroll scrollbar-thin scrollbar-thumb-rounded-full transition-all duration-200 relative",
            isDarkTheme
              ? "scrollbar-thumb-teal-500/70 hover:scrollbar-thumb-teal-400/80 scrollbar-track-transparent"
              : "scrollbar-thumb-teal-400/70 hover:scrollbar-thumb-teal-300/80 scrollbar-track-transparent"
          )}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            boxShadow: 'inset 0 5px 15px -5px rgba(0,0,0,0.2)'
          }}
        >
          {/* Inner glow effect */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-teal-500/5 via-transparent to-teal-500/5" />
          
          <CustomerList
            customers={customers}
            onSelectCustomer={setSelectedCustomerId}
            selectedCustomerId={selectedCustomerId}
            loading={loading}
          />
        </div>
      </motion.div>
      
      {/* Resizer handle with 3D effect */}
      <motion.div 
        className={cn(
          "cursor-col-resize w-1.5 z-10 relative",
          isDarkTheme
            ? "bg-gradient-to-r from-teal-800/50 to-teal-700/30 hover:from-teal-600/60 hover:to-teal-500/40"
            : "bg-gradient-to-r from-teal-600/50 to-teal-500/30 hover:from-teal-500/60 hover:to-teal-400/40",
          "transition-colors duration-200"
        )}
        onMouseDown={handleMouseDown}
        whileHover={{ width: '4px' }}
        transition={{ duration: 0.2 }}
        style={{
          boxShadow: isDragging 
            ? '0 0 8px rgba(20, 184, 166, 0.5), 0 0 3px rgba(20, 184, 166, 0.3)' 
            : '0 0 0 rgba(0,0,0,0)'
        }}
      >
        {/* Glowing dot indicator */}
        <motion.div 
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-2 rounded-full opacity-0 transition-opacity",
            isDarkTheme ? "bg-teal-400" : "bg-teal-300"
          )}
          animate={{ opacity: isDragging ? 0.8 : 0 }}
          style={{
            boxShadow: '0 0 8px rgba(45, 212, 191, 0.8), 0 0 15px rgba(45, 212, 191, 0.5), 0 0 30px rgba(45, 212, 191, 0.3)'
          }}
        />
      </motion.div>
    </>
  );
};

export default CustomerListPanel; 