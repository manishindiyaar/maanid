'use client'

import { useState, useEffect } from 'react';
import { ArrowLeft, Bot, Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TelegramSetup from './../../components/bots/TelegramSetup';
import { motion, AnimatePresence } from 'framer-motion';
import { BackButton } from "./../../components/ui/back-button"

// Actual SVG logos for messaging platforms
const TelegramSVG = () => (
  <svg viewBox="0 0 512 512" width="100%" height="100%" fill="#27A7E5">
    <path d="M256,0c141.4,0 256,114.6 256,256c0,141.4 -114.6,256 -256,256c-141.4,0 -256,-114.6 -256,-256c0,-141.4 114.6,-256 256,-256Z"/>
    <path fill="#FFFFFF" d="M199,404c-11,0 -10,-4 -13,-14l-32,-105l245,-144"/>
    <path fill="#FFFFFF" d="M199,404c7,0 11,-4 16,-8l45,-43l-56,-34"/>
    <path fill="#FFFFFF" d="M204,319l135,99c14,9 26,4 30,-14l55,-258c5,-22 -9,-32 -24,-25l-323,125c-21,8 -21,21 -4,26l83,26l190,-121c9,-5 17,-3 11,4"/>
  </svg>
);

const WhatsAppSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
    <path fill="#25D366" d="M 25 2 C 12.3 2 2 12.3 2 25 C 2 29.1 3.1 32.899219 5 36.199219 L 2 46.699219 C 1.9 46.999219 1.9992187 47.399219 2.1992188 47.699219 C 2.4992187 47.999219 2.8992187 48 3.1992188 48 L 14.199219 45.300781 C 17.399219 47.000781 21.1 48 25 48 C 37.7 48 48 37.7 48 25 C 48 12.3 37.7 2 25 2 z M 25 4 C 36.6 4 46 13.4 46 25 C 46 36.6 36.6 46 25 46 C 21.3 46 17.800781 45.000781 14.800781 43.300781 C 14.600781 43.200781 14.299609 43.099219 14.099609 43.199219 L 4.5 45.599609 L 7 36.400391 C 7.1 36.100391 7.0003906 35.899609 6.9003906 35.599609 C 5.1003906 32.499609 4 28.9 4 25 C 4 13.4 13.4 4 25 4 z M 18.113281 12.988281 C 17.925781 12.975781 17.800781 13 17.800781 13 L 16.599609 13 C 15.999609 13 15.100781 13.2 14.300781 14 C 13.800781 14.5 12 16.3 12 19.5 C 12 22.9 14.299609 25.799609 14.599609 26.099609 C 14.599609 26.099609 15 26.600781 15.5 27.300781 C 16 28.000781 16.699609 28.800781 17.599609 29.800781 C 19.399609 31.700781 21.899609 33.899219 25.099609 35.199219 C 26.499609 35.799219 27.699609 36.2 28.599609 36.5 C 30.199609 37 31.700781 36.900781 32.800781 36.800781 C 33.600781 36.700781 34.500391 36.299219 35.400391 35.699219 C 36.300391 35.099219 37.199609 34.400391 37.599609 33.400391 C 37.899609 32.600391 37.999609 31.900781 38.099609 31.300781 L 38.099609 30.5 C 38.099609 30.2 38.000781 30.200781 37.800781 29.800781 C 37.300781 29.000781 36.799219 29.000781 36.199219 28.800781 C 35.899219 28.600781 34.999219 28.200781 34.199219 27.800781 C 33.299219 27.400781 32.599609 27.000781 32.099609 26.800781 C 31.799609 26.700781 31.400391 26.499609 30.900391 26.599609 C 30.400391 26.699609 29.899609 27 29.599609 27.5 C 29.299609 27.9 28.200781 29.299219 27.800781 29.699219 L 27.699219 29.599609 C 27.299219 29.399609 26.7 29.200781 26 28.800781 C 25.2 28.400781 24.299219 27.800781 23.199219 26.800781 C 21.599219 25.400781 20.499219 23.699609 20.199219 23.099609 C 20.499219 22.699609 20.899609 22.3 21.099609 22 C 21.199609 21.9 21.280859 21.799219 21.349609 21.699219 C 21.418359 21.599219 21.475391 21.500391 21.525391 21.400391 C 21.625391 21.200391 21.700781 21.000781 21.800781 20.800781 C 22.200781 20.100781 22.000781 19.300391 21.800781 18.900391 C 21.800781 18.900391 21.7 18.600781 21.5 18.300781 C 21.4 18.000781 21.2 17.499609 21 17.099609 C 20.6 16.199609 20.2 15.199609 20 14.599609 C 19.7 13.899609 19.300781 13.399219 18.800781 13.199219 C 18.550781 13.049219 18.300781 13.000781 18.113281 12.988281 z M 16.599609 15 L 17.699219 15 L 17.900391 15 C 17.900391 15 17.999609 15.100391 18.099609 15.400391 C 18.299609 16.000391 18.799609 17.000391 19.099609 17.900391 C 19.299609 18.300391 19.499609 18.799609 19.599609 19.099609 C 19.699609 19.399609 19.800391 19.600781 19.900391 19.800781 C 19.900391 19.900781 20 19.900391 20 19.900391 C 19.8 20.300391 19.8 20.399219 19.5 20.699219 C 19.2 21.099219 18.799219 21.499219 18.699219 21.699219 C 18.599219 21.899219 18.299609 22.1 18.099609 22.5 C 17.899609 22.9 18.000781 23.599609 18.300781 24.099609 C 18.700781 24.699609 19.900781 26.700391 21.800781 28.400391 C 23.000781 29.500391 24.1 30.199609 25 30.599609 C 25.9 31.099609 26.600781 31.300391 26.800781 31.400391 C 27.200781 31.600391 27.599609 31.699219 28.099609 31.699219 C 28.599609 31.699219 29.000781 31.3 29.300781 31 C 29.700781 30.6 30.699219 29.399609 31.199219 28.599609 L 31.400391 28.699219 C 31.400391 28.699219 31.699609 28.8 32.099609 29 C 32.499609 29.2 32.900391 29.399609 33.400391 29.599609 C 34.300391 29.999609 35.100391 30.399609 35.400391 30.599609 L 36 30.900391 L 36 31.199219 C 36 31.599219 35.899219 32.200781 35.699219 32.800781 C 35.599219 33.100781 35.000391 33.699609 34.400391 34.099609 C 33.700391 34.499609 32.899609 34.800391 32.599609 34.900391 C 31.699609 35.000391 30.600781 35.099219 29.300781 34.699219 C 28.500781 34.399219 27.4 34.1 26 33.5 C 23.2 32.3 20.899219 30.3 19.199219 28.5 C 18.399219 27.6 17.699219 26.799219 17.199219 26.199219 C 16.699219 25.599219 16.500781 25.2 16.300781 25 C 15.900781 24.6 14 21.999609 14 19.599609 C 14 17.099609 15.200781 16.100391 15.800781 15.400391 C 16.100781 15.000391 16.499609 15 16.599609 15 z"></path>
  </svg>
);

export default function CreateBotPage() {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 font-['Be_Vietnam_Pro']">
      <div className="container mx-auto py-12 px-6">
        <div className="mb-6">
          <BackButton />
        </div>

        {selectedPlatform === 'telegram' ? (
          <TelegramSetup onBack={() => setSelectedPlatform(null)} />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent"
            >
              Create Your Bot
            </motion.h1>
            
            <motion.div 
              variants={fadeInUp}
              className="grid md:grid-cols-2 gap-8 mt-8"
            >
              {/* Telegram Option */}
              <motion.div 
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPlatform('telegram')}
                className="relative group rounded-2xl overflow-hidden border border-teal-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg p-8 cursor-pointer transition-all shadow-xl shadow-black/20 hover:shadow-teal-500/20"
              >
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-2000 ease-in-out"></div>
                
                <div className="mb-6 w-28 h-28 mx-auto relative">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative w-full h-full">
                    <TelegramSVG />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold mb-3 text-center relative z-10 text-white group-hover:text-teal-300 transition-colors">
                  Telegram Bot
                </h2>
                
                <p className="text-gray-300 text-center group-hover:text-white/90 transition-colors relative z-10">
                  Create a new bot using your BotFather token
                </p>
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 right-4 p-2 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full text-white shadow-lg shadow-teal-500/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent rounded-full"></div>
                  <div className="relative z-10">
                    <Check className="w-5 h-5" />
                  </div>
                </motion.div>
              </motion.div>

              {/* WhatsApp Option - Coming Soon */}
              <motion.div 
                className="relative rounded-2xl overflow-hidden border border-teal-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg p-8 shadow-xl shadow-black/20"
              >
                <div className="absolute top-3 right-3 px-3 py-1 bg-teal-800/30 backdrop-blur-md rounded-full text-sm font-medium text-teal-300 border border-teal-500/20">
                  Coming Soon
                </div>
                
                <div className="mb-6 w-28 h-28 mx-auto relative opacity-60">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl transition-all" />
                  <div className="relative w-full h-full">
                    <WhatsAppSVG />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold mb-3 text-center text-white/70">
                  WhatsApp Integration
                </h2>
                
                <p className="text-gray-400 text-center">
                  Connect with your business account
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 