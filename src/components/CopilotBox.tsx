"use client";

import { PlaceholdersAndVanishInput } from "./../ui/placeholders-and-vanish-input";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MessageSquare, Zap, Sparkles, Search, ArrowRight } from "lucide-react";

export function CopilotBoxDemo() {
  const [activeIcon, setActiveIcon] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const icons = [MessageSquare, Search, Zap, Sparkles];
  const IconComponent = icons[activeIcon];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIcon((prev) => (prev + 1) % icons.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const placeholders = [
    "Send a follow-up to the lead from Pune who asked about pricing last week.",
    "Remind that customer who booked a demo on Sunday — say we’re excited to connect.",
    "Reply to the user who said ‘too expensive’ and offer a 20% custom discount.",
    "Draft a message for everyone who clicked our WhatsApp link yesterday.",
    "Check memory for that user who asked about our refund policy — send them a detailed answer.",
    "Find the user who asked about the ‘free trial’ — send them a message to schedule a demo.",
    "Show me that contact who sent me mesg ‘Chef mumbai’ and reply them we have one available in Mumbai"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("submitted");
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 min-h-[40rem] flex flex-col justify-center items-center px-4 py-16 overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gray-950" />
        
        {/* Animated Gradients */}
        <motion.div 
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.2, 1],
            rotate: [0, 5, 0],
          }} 
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-cyan-800/20 blur-[120px]" 
        />
        
        <motion.div 
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.3, 1],
            rotate: [0, -5, 0],
          }} 
          transition={{ 
            duration: 12, 
            repeat: Infinity,
            repeatType: "reverse",
            delay: 1,
          }}
          className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-800/20 blur-[120px]" 
        />
        
        <motion.div 
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.1, 1],
            rotate: [0, 3, 0],
          }} 
          transition={{ 
            duration: 9, 
            repeat: Infinity,
            repeatType: "reverse",
            delay: 2,
          }}
          className="absolute top-[30%] left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-800/20 blur-[100px]" 
        />
      </div>
      
      {/* Subtle Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-5" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />
      
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <motion.h2 
          className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 mb-4"
          style={{
            // backgroundImage: "linear-gradient(to right, #38bdf8, #4ade80, #38bdf8)",
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
        >
         Maanid AI Copilot
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.3 }}
          className="text-cyan-300/80 text-center mb-14 max-w-md mx-auto"
        >
         Built to think like you — but faster.
         Just give your prompt and let the AI do the rest.
                </motion.p>
      </motion.div>
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full max-w-5xl relative z-10"
      >
        {/* Animated Icon */}
        {/* <div className="flex justify-center mb-8">
          <motion.div 
            className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-600/30"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIcon}
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                transition={{ duration: 0.3 }}
              >
                <IconComponent className="h-7 w-7 text-white" />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div> */}
        
        {/* Enhanced Glass Morphic Input - Larger and more prominent */}
        <motion.div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          {/* Outer glow effect */}
          <motion.div 
            className="absolute -inset-1.5 rounded-[2rem] opacity-70 blur-xl z-0"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.3) 0%, rgba(16, 185, 129, 0.3) 50%, rgba(6, 182, 212, 0.3) 100%)'
            }}
            animate={{ 
              opacity: isHovered ? 0.9 : 0.7,
              scale: isHovered ? 1.02 : 1
            }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Glass panel with direct styling */}
          <motion.div 
            className="relative overflow-hidden rounded-[2rem] backdrop-blur-xl z-20"
            style={{
              background: 'linear-gradient(145deg, rgba(0, 0, 0, 0.8) 0%, rgba(15, 23, 42, 0.7) 100%)',
              boxShadow: isHovered 
                ? '0 0 40px rgba(6, 182, 212, 0.4), inset 0 0 20px rgba(6, 182, 212, 0.2)' 
                : '0 0 20px rgba(6, 182, 212, 0.2), inset 0 0 10px rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            animate={{ 
              boxShadow: isHovered 
                ? '0 0 50px rgba(6, 182, 212, 0.5), inset 0 0 25px rgba(6, 182, 212, 0.3)' 
                : '0 0 20px rgba(6, 182, 212, 0.2), inset 0 0 10px rgba(6, 182, 212, 0.1)' 
            }}
          >
            {/* Highlighting top edge */}
            <div className="absolute top-0 left-[5%] right-[5%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
            
            {/* Input wrapper with increased padding */}
            <div className="px-8 py-12 relative z-30">
              <div className="transform scale-110 origin-center">
                <PlaceholdersAndVanishInput
                  placeholders={placeholders}
                  onChange={handleChange}
                  onSubmit={onSubmit}
                />
              </div>
            </div>
            
            {/* Light beam effect */}
            <motion.div 
              className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-cyan-500/10 to-transparent rotate-[60deg] translate-y-[-50%] translate-x-[-50%] opacity-70 blur-md"
              animate={{
                translateX: ['-50%', '150%', '-50%']
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </motion.div>
        
        {/* Feature Pills - Hover effect added */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {["Tool calling", "Agentic Execution", "Agentic Retrival", "Agentic SQL Execution"].map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -2, boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)' }}
              className="px-4 py-1.5 text-sm rounded-full bg-gradient-to-r from-cyan-950 to-teal-950 border border-cyan-800/30 text-cyan-400"
            >
              {feature}
            </motion.div>
          ))}
        </div>
        
        {/* Enhanced Reflection Effect */}
        <div className="absolute -bottom-20 left-[5%] right-[5%] h-60 bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl rounded-full -z-10" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="mt-20 text-gray-400 flex items-center gap-1.5"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>This is world first Agentic Copilot built specifically for Customer Support</span>
      </motion.div>
    </motion.div>
  );
} 