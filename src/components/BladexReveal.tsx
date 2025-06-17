'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { User, Brain, HardDrive, Sparkles, Clock, CheckCircle, Database } from 'lucide-react';

export default function BladexReveal() {
  const [isTyping, setIsTyping] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [showMemoryCard, setShowMemoryCard] = useState(false);
  const [showTags, setShowTags] = useState(false);
  
  const fullMessage = "Hey Riya 👋 Here's the updated invoice PDF you requested. I've included the 10% loyalty discount we discussed last week.";
  
  useEffect(() => {
    // Simulate typing animation
    let currentIndex = 0;
    setIsTyping(true);
    
    const typingInterval = setInterval(() => {
      if (currentIndex < fullMessage.length) {
        setTypedMessage(fullMessage.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        
        // Show memory card after typing is complete
        setTimeout(() => {
          setShowMemoryCard(true);
          
          // Show tags after memory card appears
          setTimeout(() => {
            setShowTags(true);
          }, 800);
        }, 600);
      }
    }, 40);
    
    return () => clearInterval(typingInterval);
  }, []);
  
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-6xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className=" text-3xl md:text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 mb-4">
            Bladex AI in Action
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Transparent AI that remembers context, makes decisions you can see, and feels like a human team member.
          </p>
        </motion.div>
        
        {/* Main Chat Interface */}
        <div className="relative mx-auto max-w-3xl rounded-2xl overflow-hidden">
          {/* Animated Glow Background */}
          <motion.div 
            className="absolute inset-0 -z-10"
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(6, 182, 212, 0.2)",
                "0 0 30px rgba(45, 212, 191, 0.3)",
                "0 0 20px rgba(6, 182, 212, 0.2)"
              ]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-cyan-900/90 to-teal-900/90 backdrop-blur-md border-b border-cyan-800/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="text-sm text-cyan-200 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Bladex AI Support System
            </div>
            <div></div>
          </div>
          
          {/* Chat Window */}
          <div className="bg-gradient-to-b from-gray-900/90 to-black/90 backdrop-blur-md p-6 min-h-[400px] border border-cyan-900/30">
            <div className="flex flex-col gap-4">
              {/* User's previous message */}
              <div className="flex items-start gap-3 justify-end mb-4">
                <div className="bg-cyan-800/30 rounded-lg rounded-tr-none p-3 max-w-[80%] text-gray-200 shadow-sm shadow-cyan-900/20">
                  Hi there! Can you send me my updated invoice from last week?
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
              
              {/* Response in progress */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gradient-to-r from-cyan-900/40 to-teal-900/40 border border-cyan-700/30 rounded-lg rounded-tl-none p-4 max-w-[90%] text-cyan-50 shadow-lg shadow-cyan-900/10">
                  <div className="relative">
                    {typedMessage}
                    {isTyping && (
                      <motion.span 
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="inline-block ml-1 w-2 h-4 bg-cyan-400"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Response timestamp */}
              <div className="text-xs text-cyan-700 ml-12 -mt-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Just now</span>
                <CheckCircle className="w-3 h-3 ml-1 text-teal-600" />
              </div>
            </div>
            
            {/* AI Memory Card */}
            {showMemoryCard && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="mt-8 p-4 rounded-lg border border-dashed border-cyan-800/50 bg-black/50"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-cyan-900/50">
                    <HardDrive className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-cyan-400 text-sm font-medium mb-1 flex items-center gap-2">
                      Memory Retrieved <span className="px-1.5 py-0.5 rounded-md bg-cyan-900/50 text-xs">100ms</span>
                    </div>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li className="flex items-center gap-1.5">
                        <Database className="w-3 h-3" /> Prior conversation: 7 days ago - Discussed loyalty discount
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Database className="w-3 h-3" /> Riya's preferred format: PDF with itemized list
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Database className="w-3 h-3" /> Loyalty status: Elite tier (10% discount applied)
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* AI Action Tags */}
            {showTags && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-wrap gap-2 mt-6"
              >
                <div className="px-2 py-1 rounded-full text-xs border border-cyan-800/30 bg-cyan-900/20 text-cyan-400 flex items-center gap-1.5">
                  <Brain className="w-3 h-3" /> Claude 3
                </div>
                <div className="px-2 py-1 rounded-full text-xs border border-cyan-800/30 bg-cyan-900/20 text-cyan-400 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Tone: Friendly
                </div>
                <div className="px-2 py-1 rounded-full text-xs border border-cyan-800/30 bg-cyan-900/20 text-cyan-400 flex items-center gap-1.5">
                  <Database className="w-3 h-3" /> Context: Full history
                </div>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Features List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-cyan-900/20 border border-cyan-800/30">
              <HardDrive className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-cyan-200 font-medium">Long-term Memory</h3>
              <p className="text-gray-400 text-sm">Remembers past conversations without asking again</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-cyan-900/20 border border-cyan-800/30">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-cyan-200 font-medium">Decision Transparency</h3>
              <p className="text-gray-400 text-sm">See exactly how and why AI made its decisions</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-cyan-900/20 border border-cyan-800/30">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-cyan-200 font-medium">Human-like Soul</h3>
              <p className="text-gray-400 text-sm">Feels like talking to your best support agent</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 