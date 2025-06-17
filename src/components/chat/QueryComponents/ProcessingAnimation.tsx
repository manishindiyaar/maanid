import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './../../../lib/utils';
import { ProcessingStep } from './helpers';

/**
 * Props for the ProcessingAnimation component
 */
interface ProcessingAnimationProps {
  steps: ProcessingStep[];
  activeStepIndex: number;
  animationProgress: number;
}

/**
 * ProcessingAnimation Component
 * 
 * Displays the current processing steps with animations
 * Shows a progress bar and step-by-step completion indicators
 */
export function ProcessingAnimation({ 
  steps, 
  activeStepIndex, 
  animationProgress 
}: ProcessingAnimationProps) {
  return (
    <div className="space-y-6">
      {/* Processing progress bar with animated particles */}
      <div className="relative">
        {/* Dynamic particles flowing along the progress bar */}
        <div className="absolute inset-y-0 left-0 w-full h-6 -top-2 overflow-hidden opacity-50 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-teal-300"
              initial={{ 
                x: `-10%`, 
                y: Math.random() * 6 - 3,
                opacity: 0.3 + Math.random() * 0.7,
                scale: 0.5 + Math.random() * 1
              }}
              animate={{ 
                x: `${animationProgress * 110}%`,
                opacity: [0.3 + Math.random() * 0.7, 0.7, 0.3 + Math.random() * 0.7]
              }}
              transition={{ 
                duration: 1 + Math.random(),
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              }}
              style={{
                left: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500"
            style={{ 
              width: `${animationProgress * 100}%`,
              transition: "width 0.2s cubic-bezier(0.65, 0, 0.35, 1)"
            }}
          >
            {/* Enhanced shine effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              animate={{ 
                x: ["-100%", "100%"]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1, 
                ease: "easeOut" 
              }}
            />
          </motion.div>
        </div>
        
        {/* Animated pulse dot at progress position */}
        <motion.div
          className="absolute -bottom-0.5 h-3 w-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50"
          style={{ 
            left: `${animationProgress * 100}%`,
            transform: "translateX(-50%)"
          }}
          animate={{ 
            scale: [1, 1.5, 1],
            boxShadow: [
              '0 0 5px 0px rgba(34, 211, 238, 0.5)',
              '0 0 15px 5px rgba(34, 211, 238, 0.8)',
              '0 0 5px 0px rgba(34, 211, 238, 0.5)'
            ]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 1.5,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Processing Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative group p-4 rounded-lg transition-all duration-300",
              step.status === 'completed' && "bg-teal-500/5 border border-teal-500/20",
              step.status === 'active' && "bg-teal-400/10 border border-teal-400/30",
              step.status === 'pending' && "bg-slate-800/30 border border-slate-700/30"
            )}
          >
            {/* Modern hover effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative flex items-center gap-4">
              <div className={cn(
                "relative h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-300",
                step.status === 'completed' && "bg-teal-500 text-white",
                step.status === 'active' && "bg-teal-400/20 text-teal-300",
                step.status === 'pending' && "bg-slate-800/50 text-slate-400"
              )}>
                {step.status === 'active' ? (
                  <>
                    {/* Dynamic loader animation */}
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      style={{ 
                        border: "2px solid rgba(20, 184, 166, 0.5)",
                        borderRadius: "8px",
                      }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      style={{ 
                        borderTop: "2px solid rgb(56, 189, 248)",
                        borderRight: "2px solid rgb(56, 189, 248)",
                        borderRadius: "8px",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ 
                        duration: 1, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                    />
                    <motion.div
                      className="h-1.5 w-1.5 rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        backgroundColor: [
                          "rgb(20, 184, 166)",
                          "rgb(56, 189, 248)",
                          "rgb(20, 184, 166)"
                        ]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </>
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-base",
                  step.status === 'completed' && "text-teal-300",
                  step.status === 'active' && "text-teal-200",
                  step.status === 'pending' && "text-slate-400"
                )}>
                  {step.name}
                </p>
                <p className={cn(
                  "text-sm mt-0.5",
                  step.status === 'completed' && "text-teal-300/70",
                  step.status === 'active' && "text-teal-200/70",
                  step.status === 'pending' && "text-slate-500"
                )}>
                  {step.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 