"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const ComingSoon = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 z-0" 
        style={{
          backgroundImage: "linear-gradient(to right, rgba(20,184,166,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,184,166,0.1) 1px, transparent 1px)",
          backgroundSize: "90px 90px"
        }}
      />
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-[120px]" 
        style={{background: "radial-gradient(circle, rgba(56,189,248,0.8) 0%, rgba(20,184,166,0) 70%)"}}
      />
      
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full opacity-20 blur-[120px]" 
        style={{background: "radial-gradient(circle, rgba(129,140,248,0.8) 0%, rgba(20,184,166,0) 70%)"}}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-block relative">
              <span className="text-sm font-medium bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text tracking-widest uppercase">
                Bladex AI
              </span>
              <div className="absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text"
          >
            Coming Soon
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto"
          >
            We're building something awesome. Our team is working hard to bring you a revolutionary experience. Stay tuned for updates!
          </motion.p>
          
          {/* Cool graphics - 3D cube animation */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative w-32 h-32 mx-auto mb-12"
          >
            <div className="cube-container">
              <div className="cube">
                <div className="face front">
                  <div className="inner-face bg-gradient-to-br from-cyan-500/40 to-blue-600/40 backdrop-blur-sm border border-white/10"></div>
                </div>
                <div className="face back">
                  <div className="inner-face bg-gradient-to-br from-indigo-500/40 to-purple-600/40 backdrop-blur-sm border border-white/10"></div>
                </div>
                <div className="face right">
                  <div className="inner-face bg-gradient-to-br from-teal-500/40 to-emerald-600/40 backdrop-blur-sm border border-white/10"></div>
                </div>
                <div className="face left">
                  <div className="inner-face bg-gradient-to-br from-blue-500/40 to-indigo-600/40 backdrop-blur-sm border border-white/10"></div>
                </div>
                <div className="face top">
                  <div className="inner-face bg-gradient-to-br from-sky-500/40 to-cyan-600/40 backdrop-blur-sm border border-white/10"></div>
                </div>
                <div className="face bottom">
                  <div className="inner-face bg-gradient-to-br from-violet-500/40 to-purple-600/40 backdrop-blur-sm border border-white/10"></div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* CTA */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/" className="px-8 py-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium transition-all hover:shadow-lg hover:shadow-teal-500/25 hover:scale-105">
              Back to Home
            </Link>
            <Link href="/contact" className="px-8 py-3 rounded-full bg-gray-800/50 border border-gray-700 text-white backdrop-blur-sm font-medium transition-all hover:bg-gray-700/50 hover:border-gray-600">
              Contact Us
            </Link>
          </motion.div>
        </motion.div>
      </div>
      
      {/* CSS for the 3D cube */}
      <style jsx>{`
        .cube-container {
          perspective: 800px;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .cube {
          transform-style: preserve-3d;
          width: 100%;
          height: 100%;
          position: relative;
          animation: cube-spin 12s infinite linear;
        }
        
        .face {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .inner-face {
          width: 85%;
          height: 85%;
          border-radius: 8px;
        }
        
        .front {
          transform: translateZ(50px);
        }
        
        .back {
          transform: rotateY(180deg) translateZ(50px);
        }
        
        .right {
          transform: rotateY(90deg) translateZ(50px);
        }
        
        .left {
          transform: rotateY(-90deg) translateZ(50px);
        }
        
        .top {
          transform: rotateX(90deg) translateZ(50px);
        }
        
        .bottom {
          transform: rotateX(-90deg) translateZ(50px);
        }
        
        @keyframes cube-spin {
          0% {
            transform: rotateX(0) rotateY(0);
          }
          100% {
            transform: rotateX(360deg) rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ComingSoon; 