'use client'

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TelegramConnectorProps {
  className?: string;
}

const TelegramConnector: React.FC<TelegramConnectorProps> = ({ className }) => {
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
        <span className="text-sm font-medium">Connect Telegram</span>
      </motion.button>

      {/* QR Code Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <motion.button
                className="absolute top-3 right-3 p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </motion.button>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Connect to Telegram Bot
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Scan this QR code with your phone camera
                </p>
              </div>
              
              {/* QR Code with pulsing animation */}
              <div className="relative mx-auto w-64 h-64 flex items-center justify-center">
                {/* Multiple pulsing rings for better effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-[#0088cc]"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.7, 0.3, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-[#0088cc]"
                  animate={{
                    scale: [1, 1.08, 1],
                    opacity: [0.5, 0.2, 0.5],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                />
                
                {/* Telegram logo watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <svg 
                    width="120" 
                    height="120" 
                    viewBox="0 0 24 24" 
                    fill="#0088cc"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.25l-1.97 9.296c-.146.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.603.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.534-.19 1.005.13.83.926z" />
                  </svg>
                </div>
                
                {/* QR Code Image */}
                <Image
                  src="/images/tele_maanid_bot.jpg"
                  alt="Telegram Bot QR Code"
                  width={240}
                  height={240}
                  className="rounded-lg shadow-md z-10"
                  priority
                />
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Or open <a href="https://t.me/maanid_bot" target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline">t.me/maanid_bot</a> in your browser
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TelegramConnector; 