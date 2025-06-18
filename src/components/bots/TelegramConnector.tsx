'use client'

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scan } from 'lucide-react';

interface TelegramConnectorProps {
  className?: string;
  buttonOnly?: boolean;
}

const TelegramConnector: React.FC<TelegramConnectorProps> = ({ className, buttonOnly = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Telegram Connect Button */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#0088cc]/90 to-[#0099dd]/90 hover:from-[#0088cc] hover:to-[#0099dd] text-white rounded-lg shadow-md transition-all border border-white/10 backdrop-blur-sm ${className}`}
        whileHover={{ scale: 1.03, boxShadow: "0 4px 12px rgba(0, 136, 204, 0.3)" }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.25l-1.97 9.296c-.146.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.603.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.534-.19 1.005.13.83.926z" />
          </svg>
          <motion.div 
            className="absolute inset-0 bg-white rounded-full opacity-20"
            animate={{ 
              scale: [0.8, 1.2, 0.8], 
              opacity: [0.1, 0.3, 0.1] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
        </div>
        {!buttonOnly && <span className="text-sm font-medium">Connect Telegram</span>}
      </motion.button>

      {/* QR Code Modal with Cyberpunk Style */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
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
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,136,204,0.3)] p-6 max-w-sm w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Terminal-style Header */}
              <div className="flex items-center bg-black/60 px-4 py-3 -mx-6 -mt-6 rounded-t-xl border-b border-white/10 mb-4">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 bg-rose-500 rounded-full"></div>
                  <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
                  <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
                </div>
                <div className="flex-1 text-center text-sm text-gray-400 font-mono">maanid-telegram ~ connecting</div>
                
                {/* Close button */}
                <motion.button
                  className="p-1 rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={16} className="text-gray-400" />
                </motion.button>
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Connect to Telegram Bot
                </h3>
                <p className="text-sm text-gray-400 mt-1 mb-10">
                  Scan this QR code with your phone camera
                </p>
              </div>
              
              {/* QR Code with modern neon effect */}
              <div className="relative mx-auto w-64 h-64 flex items-center justify-center">
                {/* Progress line similar to TransparencyLayer */}
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
                  width={240}
                  height={240}
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
                  <Scan className="w-8 h-8 text-[#0088cc]/40" />
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
          </motion.div>
        )}
      </AnimatePresence>

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
        
        @keyframes rotate {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 400% center;
          }
        }
      `}</style>
    </>
  );
};

export default TelegramConnector; 