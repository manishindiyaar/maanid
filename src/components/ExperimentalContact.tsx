"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const ExperimentalContact = () => {
  const [availableInvites, setAvailableInvites] = useState(12);
  
  return (
    <div className="relative overflow-hidden">
      {/* Simple Grid background */}
      <div className="absolute inset-0 z-0" 
        style={{
          backgroundImage: "linear-gradient(to right, rgba(20,184,166,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,184,166,0.1) 1px, transparent 1px)",
          backgroundSize: "90px 90px"
        }}
      />
      
      {/* Simple glow */}
      <div className="absolute top-0 left-0 w-2/3 h-1/2 rounded-full opacity-20 blur-[100px]" 
        style={{background: "radial-gradient(circle, rgba(45,212,191,0.7) 0%, rgba(20,184,166,0) 70%)"}}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="w-full py-16 md:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto px-6"
          >
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 p-8 md:p-12 shadow-xl border border-neutral-800">
              <div className="relative z-10">
                <motion.h2 
                  className="text-3xl md:text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 mb-4"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  We're currently rolling out to 100 handpicked businesses.
                </motion.h2>
                
                <motion.h3 
                  className="mt-2 md:mt-4 text-xl md:text-xl font-medium text-white px-5"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Want to be part of the next wave?
                </motion.h3>
                
                <motion.div 
                  className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-shrink-0"
                  >
                    <Link href="/contacts" className="inline-block px-6 py-3 rounded-full font-medium text-base md:text-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all">
                      Contact Us →
                    </Link>
                  </motion.div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="h-2 w-40 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" 
                        style={{ width: `${(availableInvites/100) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-blue-400 font-medium text-sm">
                      {availableInvites}/100 invites left
                    </span>
                  </div>
                </motion.div>
                
                <div className="mt-12 border-t border-neutral-800 pt-6">
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="text-white font-medium">Join Early. Shape the Future of Support.</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ExperimentalContact; 