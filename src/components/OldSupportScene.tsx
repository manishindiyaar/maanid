'use client';

import { motion } from 'framer-motion';
import { BotIcon, Clock, X, User, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OldSupportSceneProps {
  sceneNumber: number;
  title: string;
  description: string;
}

export default function OldSupportScene({ sceneNumber, title, description }: OldSupportSceneProps) {
  const [glitching, setGlitching] = useState(false);
  
  useEffect(() => {
    // Random glitch effect
    const glitchInterval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => {
        setGlitching(false);
      }, 150);
    }, Math.random() * 3000 + 1000);
    
    return () => clearInterval(glitchInterval);
  }, []);
  
  return (
    <div className="h-full flex flex-col justify-center items-center">
      <div className="max-w-5xl w-full px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white/80">
            {title}
          </h2>
          <p className="text-gray-500 text-lg">
            {description}
          </p>
        </motion.div>
        
        <div 
          className={`w-full max-w-2xl mx-auto rounded-2xl bg-black/30 border border-gray-800 overflow-hidden shadow-xl backdrop-blur-sm
            ${glitching ? 'translate-x-[1px] -translate-y-[1px]' : ''}`}
          style={{ 
            filter: glitching ? 'hue-rotate(45deg) brightness(1.1)' : 'none',
            transition: 'filter 0.1s ease'
          }}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="text-sm text-gray-400 font-mono">Generic Support Chat v1.0</div>
            <div></div>
          </div>
          
          {/* Chat Content */}
          <div className="p-4 md:p-6 bg-gradient-to-b from-gray-900 to-black min-h-[350px]">
            {sceneNumber === 1 && (
              <Scene1 glitching={glitching} />
            )}
            
            {sceneNumber === 2 && (
              <Scene2 glitching={glitching} />
            )}
            
            {sceneNumber === 3 && (
              <Scene3 glitching={glitching} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Scene 1: Cold Robot
function Scene1({ glitching }: { glitching: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="bg-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%] text-gray-300 font-mono">
          Hi, how can I help?
        </div>
      </div>
      
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-gray-700 rounded-lg rounded-tr-none p-3 max-w-[80%] text-gray-300">
          I asked this yesterday about my invoice, but the system closed my ticket. Can you help with that?
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-300" />
        </div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div 
          className={`bg-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%] font-mono ${glitching ? 'text-red-400' : 'text-gray-300'}`}
        >
          I don't understand. Could you please rephrase your question?
          {glitching && (
            <span className="ml-1 text-gray-500 inline-block">ERROR_CONTEXT_MISSING</span>
          )}
        </div>
      </div>
      
      <div className="mt-2 text-center text-xs text-gray-600 italic">
        This bot has no memory of your previous interactions
      </div>
    </div>
  );
}

// Scene 2: Frustration & Silence
function Scene2({ glitching }: { glitching: boolean }) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-start gap-3 mt-2">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="bg-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%] text-gray-300 font-mono">
          How can I assist you today?
        </div>
      </div>
      
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-gray-700 rounded-lg rounded-tr-none p-3 max-w-[80%] text-gray-300">
          I need an update on my support ticket #45892
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-300" />
        </div>
      </div>
      
      <div className="flex items-center mt-4 mb-2 opacity-70">
        <div className="h-[1px] flex-grow bg-gray-800"></div>
        <span className="px-3 text-xs text-gray-600 font-mono">5 minutes later</span>
        <div className="h-[1px] flex-grow bg-gray-800"></div>
      </div>
      
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-gray-700 rounded-lg rounded-tr-none p-3 max-w-[80%] text-gray-400">
          Hello? Still waiting for a response...
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-300" />
        </div>
      </div>
      
      <div className="flex items-center justify-center mt-4 mb-4">
        <div className="px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">Waiting for response...</span>
        </div>
      </div>
      
      <div className="flex items-start gap-3 justify-end opacity-50">
        <div className="bg-gray-700 rounded-lg rounded-tr-none p-3 max-w-[80%] text-gray-400">
          I'll just call instead. This is frustrating.
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-300" />
        </div>
      </div>
      
      <div className="flex-grow"></div>
      
      <div className="mt-2 text-center text-xs text-gray-600 italic">
        Customers leave when bots don't respond in time
      </div>
    </div>
  );
}

// Scene 3: Black Box AI
function Scene3({ glitching }: { glitching: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative w-64 h-64 mb-8">
        {/* Brain inside box visualization */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-gray-800/50 to-black/70 backdrop-blur-sm border border-gray-700 flex items-center justify-center overflow-hidden">
          <div className="relative z-10">
            <Brain 
              className={`w-20 h-20 text-gray-500 transition-all duration-300 ${glitching ? 'scale-105 text-red-400/70' : ''}`} 
            />
          </div>
          
          {/* Fog effect */}
          <div className="absolute inset-0 bg-black/70"></div>
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.8) 70%)`,
              animation: 'pulse 4s infinite ease-in-out'
            }}
          ></div>
        </div>
        
        {/* Lock symbols */}
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
          <X className="w-5 h-5 text-gray-500" />
        </div>
        
        <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
          <X className="w-5 h-5 text-gray-500" />
        </div>
      </div>
      
      <div className="text-center max-w-md">
        <h3 className={`text-xl font-mono mb-3 ${glitching ? 'text-red-400' : 'text-gray-400'}`}>
          {glitching ? 'ERR_TRANSPARENCY_MISSING' : "You don't know what your AI is doing."}
        </h3>
        <p className="text-gray-600">
          Most AI systems are black boxes. You can't see their reasoning, memory, or decision-making process.
        </p>
      </div>
    </div>
  );
} 