'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface TelegramLoginScreenProps {
  onSkip?: () => void;
}

const TelegramLoginScreen: React.FC<TelegramLoginScreenProps> = ({ onSkip }) => {
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  
  // Handle skip button click


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950"
    >
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 opacity-20" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'perspective(1000px) rotateX(60deg) translateY(100px) scale(2)',
          transformOrigin: 'center bottom'
        }}
      />
      
      {/* Glow Spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#0088cc]/20 rounded-full blur-3xl" />
      
      {/* Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
      />
      
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
          Connect with Telegram
        </h1>
        <p className="mt-4 text-gray-400 max-w-md mx-auto">
          Scan the QR code below to connect your Telegram account for notifications and updates
        </p>
      </motion.div>
      
      {/* QR Code Container */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,136,204,0.3)] p-8 max-w-md w-full"
      >
        {/* Terminal-style Header */}
        <div className="flex items-center bg-black/60 px-4 py-3 -mx-8 -mt-8 rounded-t-xl border-b border-white/10 mb-6">
          <div className="flex space-x-2">
            <div className="h-3 w-3 bg-rose-500 rounded-full"></div>
            <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
            <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
          </div>
          <div className="flex-1 text-center text-sm text-gray-400 font-mono">maanid-telegram ~ connecting</div>
        </div>
        
        {/* QR Code with modern neon effect */}
        <div className="relative mx-auto w-72 h-72 flex items-center justify-center">
          {/* Progress line */}
          <div className="absolute -top-6 left-0 right-0 h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#0088cc] to-cyan-400"
              animate={{ 
                x: ['-100%', '0%']
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>
          
          {/* Animated corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#0088cc]" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#0088cc]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#0088cc]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#0088cc]" />
          
          {/* Animated scan line */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0088cc]/20 to-transparent h-full w-full"
            animate={{
              top: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          
          {/* Neon border */}
          <div className="absolute inset-0 z-10">
            <div className="absolute inset-0 border-4 border-[#0088cc]/30 rounded-lg"></div>
            <div className="qr-neon-border"></div>
          </div>
          
          {/* QR Code Image */}
          <Image
            src="/images/tele_qr.jpg"
            alt="Telegram Bot QR Code"
            width={260}
            height={260}
            className="rounded-lg shadow-md z-10"
            priority
          />
          
          {/* Scanning animation */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Scan className="w-10 h-10 text-[#0088cc]/40" />
          </motion.div>
          
          {/* Animated particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#0088cc] rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-300">
            Or open <a href="https://t.me/maanid_bot" target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline font-medium">t.me/maanid_bot</a> in your browser
          </p>
        </div>
      </motion.div>
      
      {/* Skip Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-10 relative z-10"
      >
        <div className="relative">
          {/* Neon glow effect */}
          <div 
            className={`absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 opacity-70 blur-lg transition-all duration-300 ${isHovering ? 'scale-110 opacity-90' : 'scale-100'}`}
          ></div>
          
          {/* Button with animated border */}
          <button
            onClick={() => router.push('/dashboard')}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="neon-button relative px-8 py-4 bg-black/50 backdrop-blur-sm text-white text-lg font-bold rounded-lg flex items-center gap-3 overflow-hidden border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.8)]"
          >
            <span className="relative z-10">Skip for now</span>
            <ChevronRight className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isHovering ? 'translate-x-1' : ''}`} />
            
            {/* Moving light effect */}
            <div className="light-bar"></div>
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .qr-neon-border {
          position: absolute;
          inset: -4px;
          border-radius: 0.5rem;
          padding: 4px;
          background: linear-gradient(
            90deg,
            rgba(0, 136, 204, 0.9),
            rgba(14, 165, 233, 0.9),
            rgba(0, 136, 204, 0.9)
          );
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          animation: rotate 3s linear infinite;
          filter: blur(2px) brightness(1.7);
          box-shadow: 0 0 20px rgba(0, 136, 204, 0.8);
        }
        
        .light-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 10px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
          animation: light-bar-animation 2s linear infinite;
          z-index: 1;
          transform: skewX(-20deg);
          filter: blur(5px);
        }
        
        @keyframes rotate {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 400% center;
          }
        }
        
        @keyframes light-bar-animation {
          0% {
            left: -100px;
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            left: calc(100% + 100px);
            opacity: 0;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default TelegramLoginScreen; 

