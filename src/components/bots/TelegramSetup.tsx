'use client'

import { useState, useEffect } from 'react';
import { supabase } from './../../lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bot, AlertCircle, CheckCircle, Copy, Info, ExternalLink, RefreshCw } from 'lucide-react';

interface TelegramSetupProps {
  onBack: () => void;
}

// Telegram logo SVG
const TelegramSVG = () => (
  <svg viewBox="0 0 512 512" width="100%" height="100%" fill="#27A7E5">
    <path d="M256,0c141.4,0 256,114.6 256,256c0,141.4 -114.6,256 -256,256c-141.4,0 -256,-114.6 -256,-256c0,-141.4 114.6,-256 256,-256Z"/>
    <path fill="#FFFFFF" d="M199,404c-11,0 -10,-4 -13,-14l-32,-105l245,-144"/>
    <path fill="#FFFFFF" d="M199,404c7,0 11,-4 16,-8l45,-43l-56,-34"/>
    <path fill="#FFFFFF" d="M204,319l135,99c14,9 26,4 30,-14l55,-258c5,-22 -9,-32 -24,-25l-323,125c-21,8 -21,21 -4,26l83,26l190,-121c9,-5 17,-3 11,4"/>
  </svg>
);

export default function TelegramSetup({ onBack }: TelegramSetupProps) {
  const [botToken, setBotToken] = useState('');
  const [botName, setBotName] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isReconnection, setIsReconnection] = useState(false);

  // Example commands for bot setup
  const exampleCommands = [
    { name: "/start", description: "Initiates conversation with the bot" },
    { name: "/help", description: "Displays available commands" },
    { name: "/settings", description: "Configure bot preferences" }
  ];

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Auto-hide success animation after 3 seconds
  useEffect(() => {
    if (showSuccessAnimation) {
      const timer = setTimeout(() => setShowSuccessAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!botToken || !botName) {
      setError('Please provide both Bot Token and Bot Name');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSavingStatus('saving');
    setIsReconnection(false);
    
    try {
      // Check for admin mode cookie
      const cookies = document.cookie.split(';');
      let isAdminMode = false;
      
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'admin_mode' && value === 'true') {
          isAdminMode = true;
          break;
        }
      }
      
      console.log(`🔐 Registering bot in ${!isAdminMode ? 'USER' : 'ADMIN'} mode`);
      
      // Always use the simple-register endpoint which is more reliable
      const endpoint = '/api/bots/simple-register';
      console.log(`🔗 Using endpoint: ${endpoint} for bot registration`);
      
      // Call the API to register the bot
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass the user mode header explicitly - true means USER mode
          'x-bladex-user-mode': isAdminMode ? 'false' : 'true'
        },
        body: JSON.stringify({
          token: botToken,
          name: botName,
          platform: 'telegram'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register bot');
      }
      
      // Success! The bot was registered in the API endpoint
      console.log('✅ Bot successfully registered via API!', data);
      
      // Use username from the response
      const extractedUsername = data.bot?.username || manualUsername || `bot_${Math.random().toString(36).substring(2, 10)}`;
      setBotUsername(extractedUsername);
      
      // Show success animation and move to success step
      setShowSuccessAnimation(true);
      setSavingStatus('success');
      setCurrentStep(3);
      setSuccess('Bot successfully registered! Your bot is now ready to receive messages.');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while registering your bot');
      setSavingStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full-page success animation overlay
  const SuccessOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ 
          scale: [0.5, 1.2, 1],
          opacity: [0, 1, 1] 
        }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <motion.div 
          className={`absolute -inset-12 ${isReconnection ? 'bg-teal-500/30' : 'bg-green-500/30'} rounded-full blur-3xl`}
          animate={{ scale: [0.8, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: 0, repeatType: "reverse" }}
        />
        <motion.div
          className={`w-32 h-32 rounded-full ${
            isReconnection 
              ? 'bg-gradient-to-r from-teal-500 to-cyan-400' 
              : 'bg-gradient-to-r from-green-500 to-emerald-400'
          } flex items-center justify-center`}
          animate={{ 
            boxShadow: [
              "0 0 0 0 rgba(74, 222, 128, 0)",
              "0 0 0 20px rgba(74, 222, 128, 0.3)",
              "0 0 0 40px rgba(74, 222, 128, 0)"
            ] 
          }}
          transition={{ duration: 1.5, repeat: 0 }}
        >
          {isReconnection ? (
            <RefreshCw className="w-16 h-16 text-white" />
          ) : (
            <CheckCircle className="w-16 h-16 text-white" />
          )}
        </motion.div>
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute mt-40 text-2xl font-bold text-white text-center"
      >
        {isReconnection ? 'Bot Reconnected!' : 'Bot Connected!'}
      </motion.h2>
    </motion.div>
  );

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
      className="max-w-3xl mx-auto"
    >
      {/* Show success animation overlay */}
      <AnimatePresence>
        {showSuccessAnimation && <SuccessOverlay />}
      </AnimatePresence>

      <motion.div 
        variants={fadeInUp}
        className="flex items-center gap-4 mb-8"
      >
        <div className="w-14 h-14 relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
          <div className="relative w-full h-full">
            <TelegramSVG />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Setup Telegram Bot
          </h1>
          <p className="text-gray-300">Connect your Telegram bot to Bladex AI</p>
        </div>
      </motion.div>
      
      {/* Progress Steps */}
      <motion.div variants={fadeInUp} className="mb-8 flex items-center justify-center">
        <div className="flex items-center">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/5 text-gray-400'
                } ${currentStep === step ? 'ring-2 ring-blue-300 ring-offset-2 ring-offset-gray-900' : ''}`}
              >
                {currentStep > step ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step
                )}
              </div>
              {step < 3 && (
                <div 
                  className={`w-24 h-0.5 ${
                    currentStep > step ? 'bg-blue-500' : 'bg-white/10'
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* Step 1: Instructions */}
      {currentStep === 1 && (
        <motion.div variants={fadeInUp}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-white mb-2">How to create your Telegram Bot:</h2>
                <ol className="space-y-4 text-gray-300">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <p>Open Telegram and search for <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">@BotFather</span></p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <p>Start a chat and send <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">/newbot</span></p>
                      <div className="mt-2 bg-white/5 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                        <p className="font-mono text-sm text-gray-400">/newbot</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyToClipboard('/newbot')}
                          className="text-blue-400 p-1 rounded hover:bg-white/5"
                        >
                          <Copy size={14} />
                        </motion.button>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <p>Give your bot a name when asked by BotFather</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                    <div>
                      <p>Provide a username for your bot (must end in "bot")</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">5</div>
                    <div>
                      <p>BotFather will give you a token that looks like:</p>
                      <div className="mt-2 bg-white/5 p-3 rounded-lg border border-white/5">
                        <p className="font-mono text-sm text-gray-400 break-all">123456789:ABCDefGhIJklmNoPQRsTUVwxyZ</p>
                      </div>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <motion.a
                href="https://telegram.me/botfather"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                Open BotFather <ExternalLink size={16} />
              </motion.a>
            </div>
          </div>
          
          <div className="flex justify-between">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 rounded-lg hover:bg-white/5 text-white flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </motion.button>
            
            <motion.button
              onClick={() => setCurrentStep(2)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              Continue
            </motion.button>
          </div>
        </motion.div>
      )}
      
      {/* Step 2: Bot Details Form */}
      {currentStep === 2 && (
        <motion.div variants={fadeInUp}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
              <h2 className="font-semibold text-white mb-4">Enter your bot details</h2>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-4 flex items-start gap-2"
                >
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="botName" className="block text-sm font-medium text-gray-300 mb-1">
                    Bot Name
                  </label>
                  <input
                    type="text"
                    id="botName"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="My Awesome Bot"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-400">The name you gave your bot in BotFather</p>
                  <div className="mt-2 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-blue-300 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Demo bot name: <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Maanid</span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="botToken" className="block text-sm font-medium text-gray-300 mb-1">
                    Bot Token
                  </label>
                  <input
                    type="text"
                    id="botToken"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCDefGhIJklmNoPQRsTUVwxyZ"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-400">The token provided to you by BotFather</p>
                  <div className="mt-2 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-blue-300 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Demo bot token: <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white select-all">7411578924:AAEyuwZEse6hkH6DYmxciQhMLJoZvJtTzaw</span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="botUsername" className="block text-sm font-medium text-gray-300 mb-1">
                    Bot Username <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="botUsername"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    placeholder="myawesomebot"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-400">Leave empty to use the username from BotFather</p>
                  <div className="mt-2 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-blue-300 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Demo bot username: <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Maanid_bot</span>
                    </p>
                  </div>
                </div>
                
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-indigo-300 mb-1">Demo Bot Available</h3>
                      <p className="text-sm text-gray-300">For demo purposes, we recommend using the provided bot details above to save time. You can also create your own bot through BotFather if you prefer.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
            <div className="flex justify-between">
              <motion.button
                type="button"
                onClick={() => setCurrentStep(1)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-4 py-2 rounded-lg hover:bg-white/5 text-white flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </motion.button>
              
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={!isSubmitting ? { scale: 1.03 } : {}}
                whileTap={!isSubmitting ? { scale: 0.97 } : {}}
                className={`relative px-6 py-2 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 ${
                  isSubmitting ? 'bg-blue-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Connect Bot</span>
                  </>
                )}
                {savingStatus === 'error' && (
                  <div className="absolute -top-10 left-0 right-0 text-center text-red-400 text-sm bg-red-500/10 py-1 px-2 rounded">
                    Failed to save bot
                  </div>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}
      
      {/* Step 3: Success */}
      {currentStep === 3 && (
        <motion.div variants={fadeInUp}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-6">
            <div className="text-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={`w-20 h-20 mx-auto ${
                  isReconnection 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-400' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                } rounded-full flex items-center justify-center mb-4`}
              >
                {isReconnection ? (
                  <RefreshCw className="w-10 h-10 text-white" />
                ) : (
                  <CheckCircle className="w-10 h-10 text-white" />
                )}
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                {isReconnection ? 'Bot Successfully Reconnected!' : 'Bot Successfully Connected!'}
              </h2>
              <p className="text-gray-300">Your Telegram bot is now ready to receive messages</p>
            </div>
            
            <div className={`${
              isReconnection ? 'bg-teal-500/10 border-teal-500/30' : 'bg-green-500/10 border-green-500/30'
            } border p-4 rounded-lg mb-6`}>
              <div className="flex items-start gap-3">
                <div className={`${
                  isReconnection ? 'bg-teal-500/20' : 'bg-green-500/20'
                } rounded-full p-1`}>
                  <Info className={`w-4 h-4 ${
                    isReconnection ? 'text-teal-400' : 'text-green-400'
                  }`} />
                </div>
                <div>
                  <h3 className={`font-medium ${
                    isReconnection ? 'text-teal-400' : 'text-green-400'
                  } mb-1`}>Bot information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-400">Name:</div>
                    <div className="text-white font-medium">{botName}</div>
                    
                    <div className="text-gray-400">Username:</div>
                    <div className="text-white font-medium">@{botUsername}</div>
                    
                    <div className="text-gray-400">Status:</div>
                    <div className={`${
                      isReconnection ? 'text-teal-400' : 'text-green-400'
                    } font-medium flex items-center gap-1`}>
                      <span className={`w-2 h-2 ${
                        isReconnection ? 'bg-teal-500' : 'bg-green-500'
                      } rounded-full`}></span>
                      Active
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-white">Next steps:</h3>
              <ol className="space-y-4">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <div className="text-gray-300">
                    <p>Go to Telegram and search for <span className="font-medium text-white">@{botUsername}</span></p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <div className="text-gray-300">
                    <p>Start a conversation with your bot by clicking the Start button or sending <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">/start</span></p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <div className="text-gray-300">
                    <p>Your messages will now appear in the Bladex AI dashboard</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
          
          <div className="flex justify-between">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 rounded-lg hover:bg-white/5 text-white flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to platforms
            </motion.button>
            
            <motion.a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              Open Bot in Telegram <ExternalLink size={16} />
            </motion.a>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
} 