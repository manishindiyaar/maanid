'use client';

import { motion } from "framer-motion";

export default function SocialProofQuote() {
  return (
    <div className="relative bg-gray-950 text-white py-20 px-6 md:px-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 opacity-80" />
      
      {/* Grid overlay */}
      {/* <div 
        className="absolute inset-0 opacity-5" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      /> */}
      
      {/* Glow effects */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-800/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-teal-800/10 rounded-full blur-3xl" />
      
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-10 max-w-7xl mx-auto">
        {/* Left: Quote block */}
        <div className="max-w-3xl text-left text-2xl md:text-4xl font-medium leading-relaxed relative">
          <motion.span 
            className="text-cyan-400 text-6xl md:text-8xl absolute -left-4 md:-left-10 -top-8 md:-top-14 font-serif opacity-80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            "
          </motion.span>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10"
          >
            Finally, a support AI that doesn't feel like a black box. With Bladex, I can see exactly how decisions are being made in real-time.
          </motion.p>
          
          <motion.span 
            className="text-teal-400 text-6xl md:text-8xl absolute -right-4 md:-right-10 -bottom-8 md:-bottom-14 font-serif opacity-80"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            "
          </motion.span>
        </div>

        {/* Right: Author + Company */}
        <motion.div 
          className="flex items-center gap-4 mt-6 md:mt-0 self-end md:self-center"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="relative">
            {/* <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center overflow-hidden">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div> */}
           
         
          </div>
          
          <div>
            <p className="text-white font-semibold">Anika Mehta</p>
            <p className="text-gray-400 text-sm">Head of Customer Support</p>
            <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-2 py-1 rounded-sm mt-2 text-xs font-medium w-fit shadow-lg shadow-cyan-900/20">
              Early Access Partner
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 