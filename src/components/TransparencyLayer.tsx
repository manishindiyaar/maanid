'use client'

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Brain, Database, Send, CheckCircle } from 'lucide-react';

// AI Processing step data
const steps = [
  {
    title: 'Incoming Message',
    description: 'Riya: "Can I get the updated pricing?"',
    icon: MessageSquare,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    title: 'Agent Scoring',
    description: 'Best-fit agent: Pricing head agent. Scoring: 0.92',
    icon: Brain,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    title: 'Memory Pulled',
    description: 'Customer has asked about pricing before, preferred PDF format.',
    icon: Database,
    color: 'from-fuchsia-500 to-pink-600',
  },
  {
    title: 'AI fetch information from Pricing head agent',
    description: 'We have pricing listed below .......',
    icon: Send,
    color: 'from-pink-500 to-rose-600',
  },
  {
    title: 'Final Message',
    description: 'Hi Riya! Here\'s the updated pricing PDF you requested last time 👇',
    icon: CheckCircle,
    color: 'from-emerald-500 to-teal-600',
  },
];

export default function TransparencyLayer() {
  const [activeStep, setActiveStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Initialize timeout variable
    let timeout: NodeJS.Timeout | undefined = undefined;
    
    const nextStep = () => {
      setIsAnimating(true);
      
      // Short delay before changing the step
      timeout = setTimeout(() => {
        setActiveStep((prev) => (prev + 1) % steps.length);
      }, 200);
      
      // Allow time for animation to complete
      timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    };
    
    const interval = setInterval(() => {
      nextStep();
    }, 3000);
    
    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden py-8 bg-gray-950 mt-20 pt-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Cyberpunk Grid */}
        <div 
          className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: 'linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: 'perspective(1000px) rotateX(60deg) translateY(100px) scale(2)',
            transformOrigin: 'center bottom'
          }}
        />
        
        {/* Glow Spots */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        
        {/* Noise Texture */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>
      
      <div ref={containerRef} className="relative z-10 container max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="mt-20 text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 mb-4">
            AI Transparency Layer
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-lg">
            Watch our AI process messages in real-time with intelligent context and memory
          </p>
        </motion.div>
        
        {/* Main UI Display Box */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          {/* Terminal-style Header */}
          <div className="flex items-center bg-black/60 px-4 py-3 border-b border-white/10">
            <div className="flex space-x-2">
              <div className="h-3 w-3 bg-rose-500 rounded-full"></div>
              <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
              <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
            </div>
            <div className="flex-1 text-center text-sm text-gray-400 font-mono">bladex-ai-terminal ~ processing</div>
          </div>
          
          {/* Content */}
          <div className="p-6 md:p-10">
            {/* Progress Line */}
            <div className="relative h-1 bg-gray-800 rounded-full mb-8 overflow-hidden">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 to-teal-400"
                style={{ 
                  width: `${((activeStep + 1) / steps.length) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>

            {/* Main Interface */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Step Visualization - Left Side */}
              <div className="order-2 md:order-1">
                <div className="relative aspect-square max-w-md mx-auto">
                  {/* Center Hub */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black flex items-center justify-center">
                    <div className="absolute w-full h-full rounded-full border-2 border-cyan-500/50 animate-ping" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute w-full h-full rounded-full border-2 border-teal-500 opacity-70"></div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{activeStep + 1}/{steps.length}</span>
                    </div>
                  </div>

                  {/* Orbiting Steps */}
                  {steps.map((step, index) => {
                    // Calculate positions in a circle
                    const angle = (index * (2 * Math.PI / steps.length)) - Math.PI/2;
                    const radius = 130; // Distance from center
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    // Calculate if this node should be connected to center
                    const isActive = index === activeStep;
                    const isPrevious = (index === activeStep - 1) || (activeStep === 0 && index === steps.length - 1);
                    const isNext = (index === activeStep + 1) || (activeStep === steps.length - 1 && index === 0);
                    
                    return (
                      <div key={index} className="absolute top-1/2 left-1/2" style={{
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                      }}>
                        {/* Connection Line to Center */}
                        <div className="absolute top-1/2 left-1/2 w-[130px] h-0.5 -z-10 origin-left"
                          style={{ 
                            transform: `rotate(${angle + Math.PI/2}rad)`,
                            background: isActive 
                              ? `linear-gradient(90deg, ${step.color.split(' ')[1]} 0%, rgba(17, 17, 17, 0.5) 100%)` 
                              : 'rgba(255, 255, 255, 0.1)'
                          }}>
                        </div>
                        
                        {/* Node */}
                        <motion.div 
                          animate={{ 
                            scale: isActive ? 1.1 : 1,
                            boxShadow: isActive ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none'
                          }}
                          className={`w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center
                            ${isActive 
                              ? `bg-gradient-to-br ${step.color} shadow-lg` 
                              : 'bg-gray-800 border border-white/10'}`}
                        >
                          <step.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Information - Right Side */}
              <div className="order-1 md:order-2 h-[250px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <div className={`w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-gradient-to-br ${steps[activeStep].color}`}>
                      {(() => {
                        const Icon = steps[activeStep].icon;
                        return <Icon className="h-6 w-6 text-white" />;
                      })()}
                    </div>
                    
                    <h3 className={`text-2xl font-bold mb-2 bg-gradient-to-r ${steps[activeStep].color} bg-clip-text text-transparent`}>
                      {steps[activeStep].title}
                    </h3>
                    
                    <div className="bg-black/30 border border-white/10 rounded-lg p-4 mt-4">
                      <p className="text-white/90 font-mono text-sm leading-relaxed">
                        $ processing {steps[activeStep].title.toLowerCase()}...
                        <span className="block mt-1 text-gray-400">
                          {steps[activeStep].description}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        
        {/* Step Pills */}
        <div className="flex justify-center mt-8 space-x-2">
          {steps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`w-8 h-2 rounded-full ${index === activeStep ? 'bg-cyan-500' : 'bg-gray-700'}`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
