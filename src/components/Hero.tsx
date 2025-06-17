'use client'

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from "./../lib/utils";
import { Spotlight } from "./../ui/spotlight";
import { Loader2 } from "lucide-react";

export default function Hero() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Update mouse position with some delay for smoother effect
      setTimeout(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleCTAClick = () => {
    // Set redirecting state to show loading animation
    setIsRedirecting(true);
    
    // Use the loading page instead of direct navigation
    setTimeout(() => {
      router.push('/loading?to=/dashboard&reason=dashboard');
    }, 300); // Small delay for animation to start
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-black/[0.96] antialiased">
      {/* Full-screen loading overlay */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              <Loader2 className="h-12 w-12 text-teal-500 animate-spin" />
              <p className="text-teal-400 text-lg font-medium">Preparing your dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid background with wider lines */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 select-none",
          "bg-[linear-gradient(to_right,rgba(20,184,166,0.1)_2px,transparent_2px),linear-gradient(to_bottom,rgba(20,184,166,0.1)_2px,transparent_2px)]",
          "bg-[size:90px_90px]" // Wider grid spacing
        )}
      />

      {/* Primary Deeper Spotlight */}
      <Spotlight
        className="-top-40 left-0 md:left-1/4 animate-deeper-spotlight"
        fill="rgba(20, 184, 166, 0.25)" // More intense color
      />
      
      {/* Secondary Spotlight for additional depth */}
      <Spotlight
        className="top-1/4 -right-20 md:right-1/4 rotate-180 animate-deeper-spotlight"
        fill="rgba(20, 184, 166, 0.15)"
      />
      
      {/* Secondary interactive Spotlight */}
      <div 
        className="absolute pointer-events-none"
        style={{
          left: mousePosition.x - 500,
          top: mousePosition.y - 500,
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(20,184,166,0) 70%)', // Deeper color
          transition: 'all 0.15s ease',
          zIndex: 1
        }}
      />

      {/* Grid intersection points with enhanced glow */}
      <div className="absolute inset-0 w-full h-full">
        {[...Array(6)].map((_, i) => // Reduced number for wider spacing
          [...Array(6)].map((_, j) => (
            <div 
              key={`point-${i}-${j}`}
              className="absolute w-[4px] h-[4px] rounded-full bg-teal-700/40" // Larger and brighter dots
              style={{ 
                left: `${20 * (i + 1)}%`, 
                top: `${20 * (j + 1)}%`,
                boxShadow: '0 0 12px rgba(20, 184, 166, 0.6)' // Enhanced glow
              }}
            />
          ))
        )}
      </div>

      {/* Top announcement bar with animation - positioned above main content */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute top-40 left-0 right-0 flex justify-center z-20"
      >
        <Link href="/dashboard">
          <div className="group px-3 py-2 rounded-full border border-teal-500/20 bg-black/20 backdrop-blur-[2px] flex items-center gap-2 cursor-pointer overflow-hidden relative">
            <span className="text-white/70 text-xs">Our first ever flagship product</span>
            <span className="text-teal-400/80 font-medium group-hover:translate-x-1 transition-transform duration-300 text-xs">
              Read more →
            </span>
            
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-teal-400 blur-lg transition-opacity duration-500"></div>
          </div>
        </Link>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl p-4 pt-20 md:pt-0 flex flex-col justify-center items-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 mb-4"
        >
          AI <br />That Knows Your Customers.
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mx-auto mt-4 max-w-lg text-center text-base font-normal text-neutral-300"
        >
         Bladex AI is not just a chatbot—it’s your 24/7 customer support copilot. With memory, transparency, and orchestration, it transforms how businesses talk to customers.
        </motion.p>

        {/* Enhanced CTA Button with pulsing neon effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="z-10 relative mt-12"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <button 
            onClick={handleCTAClick}
            disabled={isRedirecting}
            className="group relative overflow-hidden px-12 py-5 rounded-lg text-white font-medium text-lg animate-pulse-neon"
          >
            {/* Button background with enhanced glow */}
            <div className="absolute inset-0 w-full h-full bg-black border border-teal-500/50 z-0 group-hover:border-teal-400 transition-all duration-300"></div>
            
            {/* Grid effect inside button */}
            <div className="absolute inset-0 overflow-hidden opacity-20 group-hover:opacity-40 transition-opacity duration-300">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={`btn-h-line-${i}`}
                  className="absolute h-[1px] w-full left-0 bg-gradient-to-r from-transparent via-teal-400 to-transparent transform transition-transform duration-700 ease-in-out"
                  style={{ 
                    top: `${20 * (i + 1)}%`,
                    transitionDelay: `${i * 50}ms`,
                    transform: `translateX(${i % 2 === 0 ? '-100%' : '100%'})`,
                  }}
                />
              ))}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </div>
            
            {/* Button text with modern font */}
            <span className="relative z-20 flex items-center justify-center tracking-widest uppercase text-base group-hover:tracking-wider transition-all duration-300">
              {isRedirecting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>LOADING...</span>
                </div>
              ) : (
                "USE IT TODAY"
              )}
            </span>
            
            {/* Hover effect with enhanced glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600/0 via-teal-500/20 to-teal-400/0 opacity-0 group-hover:opacity-100 transform translate-y-full group-hover:translate-y-0 transition-all duration-500 ease-out z-10"></div>
            
            {/* Button accent highlight */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-teal-400 group-hover:w-full transition-all duration-500 rounded-full"></div>
          </button>
          
          {/* Additional animated glow for the button */}
          <div className="absolute inset-0 -z-10 opacity-30 blur-xl bg-teal-500/30 rounded-lg animate-pulse-neon"></div>
          
          {/* Button shine effect on hover */}
          <style jsx global>{`
            @keyframes gradient-shift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            
            .group:hover .absolute[style*="translateX"] {
              transform: translateX(0) !important;
            }
          `}</style>
        </motion.div>
      </div>
    </div>
  );
} 