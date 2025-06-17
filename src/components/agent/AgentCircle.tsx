"use client"

import React from 'react';
import { Bot, Settings, X, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "./../../lib/utils"

interface AgentCircleProps {
  name?: string;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const AgentCircle: React.FC<AgentCircleProps> = ({
  name = '',
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  className
}) => {
  // Get initials from name (with null check)
  const initials = name
    ? name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '';

  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSelect}
        className={cn(
          `w-16 h-16 rounded-full flex items-center justify-center cursor-pointer
          transition-all duration-300 relative`,
          selected 
            ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/30' 
            : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white hover:shadow-md hover:shadow-teal-500/20',
          className
        )}
      >
        {/* Inner glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-0 transition-opacity duration-300",
          selected ? "opacity-100" : "group-hover:opacity-50"
        )}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-300/20 via-cyan-400/10 to-teal-300/20 animate-pulse-slow"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center">
          {name && name.length > 0 ? (
            <motion.span 
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-teal-50"
            >
              {initials}
            </motion.span>
          ) : (
            <motion.div
              animate={selected ? { 
                rotate: [0, 10, 0, -10, 0],
                scale: [1, 1.1, 1]
              } : {}}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                times: [0, 0.2, 0.5, 0.8, 1],
                repeat: selected ? 1 : 0
              }}
            >
              <Bot size={24} className="text-teal-50" />
            </motion.div>
          )}
        </div>
        
        {/* Pulsing border for selected state */}
        {selected && (
          <motion.div
            className="absolute -inset-1 rounded-full z-0"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.7, 0.4, 0.7],
              scale: [0.95, 1, 0.95]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'linear-gradient(to right, rgba(20, 184, 166, 0.3), rgba(56, 178, 172, 0.3))'
            }}
          />
        )}
      </motion.div>
      
      {/* Action buttons with improved styling */}
      {selected && (
        <div className="absolute -top-1 -right-1 flex space-x-1">
          {onEdit && (
            <motion.button 
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="bg-gradient-to-br from-teal-500 to-teal-600 p-1.5 rounded-full shadow-lg shadow-teal-600/30 hover:shadow-teal-500/50 text-white transition-all"
            >
              <Edit size={12} />
            </motion.button>
          )}
          
          {onDelete && (
            <motion.button 
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-gradient-to-br from-red-500 to-red-600 p-1.5 rounded-full shadow-lg shadow-red-600/30 hover:shadow-red-500/50 text-white transition-all"
            >
              <X size={12} />
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentCircle; 