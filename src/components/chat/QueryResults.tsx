'use client'

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Database, Brain, Sparkles } from 'lucide-react';
import { Button } from './../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CustomerSummaryDashboard from './CustomerSummaryDashboard';


// Import our new components
import { ActionResults } from './QueryComponents/ActionResults';
import { SearchResults } from './QueryComponents/SearchResults';
import { ContactsList } from './QueryComponents/ContactComponents';
import { ErrorDisplay } from './QueryComponents/ErrorDisplay';
import { ProcessingAnimation } from './QueryComponents/ProcessingAnimation';
import { LoadingIndicator } from './QueryComponents/LoadingIndicator';

// Import helper functions and types
import { 
  getCompletionMessage, 
  getCurrentPhaseMessage,
  ProcessingStep,
  Contact,
  Memory,
  QueryResult
} from './QueryComponents/helpers';

/**
 * Props for the QueryResults component
 */
interface QueryResultsProps {
  queryResult: QueryResult;
  onClose?: () => void;
  queryText?: string;
  onSelectContact?: (contactId: string) => void;
}

/**
 * QueryResults Component
 * 
 * Main component that handles all query result types and displays appropriate UI
 * Manages animations, processing steps, and renders different sub-components based on result type
 */
export default function QueryResults({
  queryResult,
  onClose,
  queryText,
  onSelectContact
}: QueryResultsProps) {
  // State for animation and processing
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<'search' | 'process' | 'action' | 'summary'>('search');
  const animationRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Determine query type from the result
  const isSummaryQuery = queryResult.type === 'summary_result';
  const isActionQuery = queryResult.type === 'action_result' || queryResult.type === 'pending_action';
  const isContactQuery = queryResult.type === 'query_result' && 
                         queryResult.memories?.some(m => m.memory_data?.type === 'contact' || m.user_id);
  
  // Debug message to console to help diagnose issues
  useEffect(() => {
    console.log("QueryResults component received:", queryResult);
    console.log("Query type:", queryResult.type);
    console.log("Memory count:", queryResult.memories?.length);
  }, [queryResult]);
  
  // Step durations based on query type
  const stepDurationsRef = useRef<number[]>(
    isSummaryQuery ? [800, 1000, 1200] : 
    isActionQuery ? [400, 500] : 
    [400, 600]
  );
  
  // Generate dynamic steps based on query type and phase
  useEffect(() => {
    if (isProcessingComplete) return; // Don't regenerate steps if already complete
    
    const hasMemories = queryResult.memories && queryResult.memories.length > 0;
    const customerName = isSummaryQuery && queryResult.contact ? queryResult.contact.name : 
                         queryText?.toLowerCase().includes("tell me about") ? 
                         queryText.replace(/tell me about/i, "").trim() : "";
    
    // Update step durations when query type changes
    stepDurationsRef.current = isSummaryQuery 
      ? [800, 1000, 1200]
      : isActionQuery
        ? [400, 500]
        : [400, 600];
    
    let newSteps: ProcessingStep[] = [];
    
    // Initial processing step
    newSteps.push({
      name: 'Processing request',
      description: `"${queryText}"`,
      icon: <Brain className="h-5 w-5" />,
      status: 'pending',
      phase: 'search'
    });

    if (isSummaryQuery) {
      // Summary query specific steps
      newSteps = newSteps.concat([
        {
          name: `Finding ${customerName || 'customer'} data`,
          description: 'Accessing customer records',
          icon: <Search className="h-5 w-5" />,
          status: 'pending',
          phase: 'search'
        },
        {
          name: 'Building customer profile',
          description: `Analyzing interaction history`,
          icon: <Database className="h-5 w-5" />,
          status: 'pending',
          phase: 'process'
        }
      ]);
    } else if (isActionQuery) {
      // Action query specific steps
      newSteps = newSteps.concat([
        {
          name: 'Finding recipients',
          description: 'Searching for matching contacts',
          icon: <Search className="h-5 w-5" />,
          status: 'pending',
          phase: 'search'
        }
      ]);
      } else {
      // Regular search query steps
      newSteps = newSteps.concat([
        {
          name: 'Searching database',
          description: hasMemories 
            ? `Found ${queryResult.memories!.length} results` 
            : 'Looking through records',
          icon: <Database className="h-5 w-5" />,
          status: 'pending',
          phase: 'search'
        }
      ]);
    }
    
    setSteps(newSteps);
    setActiveStepIndex(0);
    setAnimationProgress(0);
    
    // Start animation sequence
    startAnimationSequence(newSteps);
    
    // Cleanup animation on unmount
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [queryResult.type, queryResult.memories, queryResult.contact, queryText, isSummaryQuery, isActionQuery, isContactQuery, isProcessingComplete]);

  /**
   * Animation sequence for processing steps
   * Manages the timing and transitions between steps
   */
  const startAnimationSequence = (stepsToAnimate: ProcessingStep[]) => {
    // Calculate total animation time
    const stepsDuration = stepDurationsRef.current;
    const totalAnimationTime = isSummaryQuery 
      ? Math.max(3000, stepsDuration.reduce((sum, time) => sum + time, 0))
      : stepsDuration.reduce((sum, time) => sum + time, 0);
    
    const startTime = performance.now();
    
    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const totalProgress = Math.min(Math.max(elapsed / totalAnimationTime, 0), 1);
      
      // Add easing for more dynamic effect
      const easedProgress = Math.pow(totalProgress, 0.8);
      setAnimationProgress(easedProgress);
      
      // Calculate current step with transitions
      let timeAccumulated = 0;
      let currentStep = 0;
      
      for (let i = 0; i < stepsDuration.length; i++) {
        timeAccumulated += stepsDuration[i];
        if (elapsed < timeAccumulated) {
          currentStep = i;
          break;
        }
        currentStep = i;
      }
      
      // Update current phase and step status
      if (currentStep !== activeStepIndex) {
        setActiveStepIndex(currentStep);
        if (stepsToAnimate[currentStep]?.phase) {
          setCurrentPhase(stepsToAnimate[currentStep].phase!);
        }
        
        // Update step statuses
        setSteps(prevSteps => 
          prevSteps.map((step, idx) => ({
            ...step,
            status: idx < currentStep 
              ? 'completed' 
              : idx === currentStep 
                ? 'active' 
                : 'pending'
          }))
        );
      }
      
      if (totalProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Complete all steps
        setSteps(prevSteps => 
          prevSteps.map(step => ({ ...step, status: 'completed' }))
        );
        
        // Transition to results with delay based on query type
        setTimeout(() => {
          setIsProcessingComplete(true);
        }, isSummaryQuery ? 600 : 200);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Early return for summary results
  if (queryResult.type === 'summary_result' && queryResult.contact && queryResult.memories) {
    return (
      <CustomerSummaryDashboard
        contact={queryResult.contact}
        memories={queryResult.memories}
        onClose={onClose}
      />
    );
  }

  // Early return for error results
  if (queryResult.type === 'error') {
    return (
      <ErrorDisplay 
        errorMessage={queryResult.error} 
        onClose={onClose} 
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Enhanced backdrop with animated gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-md">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.1),transparent_50%)]" />
          {/* Dynamic pulse animation */}
          <motion.div 
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.05, 0],
              scale: [0.95, 1.05, 0.95]
            }}
            transition={{ 
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle at center, rgba(20,184,166,0.2) 0%, transparent 50%)',
            }}
          />
        </div>

        <motion.div 
          className="relative w-full max-w-2xl overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Ambient glow effects */}
          <div className="absolute -inset-1">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 blur-xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 blur-3xl opacity-50" />
          </div>
          
          {/* Main card */}
          <div className="relative rounded-xl border border-teal-500/30 shadow-2xl shadow-teal-500/10 backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-teal-500/30 bg-gradient-to-r from-slate-900/80 via-slate-800/50 to-slate-900/80">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {/* Animated ring around icon */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition" />
                  <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-0.5">
                    <div className="h-full w-full rounded-[7px] bg-slate-950 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-teal-400" />
                    </div>
                  </div>
                  {/* Power pulsing effect */}
                  <motion.div
                    className="absolute -inset-1 rounded-lg bg-teal-500/20"
                    animate={{ 
                      scale: [1, 1.3, 1], 
                      opacity: [0.5, 0.2, 0.5],
                      boxShadow: [
                        '0 0 0 0 rgba(20, 184, 166, 0)',
                        '0 0 10px 5px rgba(20, 184, 166, 0.3)',
                        '0 0 0 0 rgba(20, 184, 166, 0)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 text-transparent bg-clip-text">
                    {isProcessingComplete && isActionQuery ? "Action Ready" : 
                     isSummaryQuery ? "Customer Profile" : "Autonomous Agent"}
                  </h2>
                  <p className="text-sm text-teal-300/70">
                    {isProcessingComplete 
                      ? getCompletionMessage(isSummaryQuery ? "summary_result" : queryResult.type, queryResult.memories?.length || 0)
                      : getCurrentPhaseMessage(currentPhase, steps[activeStepIndex]?.name || '')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="relative group"
                onClick={onClose}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 rounded-full opacity-0 group-hover:opacity-100 transition duration-300 blur" />
                <X className="h-4 w-4 text-teal-300 relative z-10 group-hover:text-teal-200" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6">
              {/* Show processing animation or results based on completion state */}
              {!isProcessingComplete ? (
                <ProcessingAnimation 
                  steps={steps}
                  activeStepIndex={activeStepIndex}
                  animationProgress={animationProgress}
                              />
                          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="relative space-y-4 mt-6"
                  >
                    {/* Results background effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
                    
                  {/* Show different components based on response type */}
                    {isContactQuery && queryResult.memories && queryResult.memories.length > 0 ? (
                      <ContactsList
                        memories={queryResult.memories} 
                        onSelect={onSelectContact}
                      />
                    ) : (isActionQuery || queryResult.type === 'pending_action') ? (
                      <ActionResults
                        memories={queryResult.memories || 
                          // Convert recipients to match the expected ActionResults input format
                          (queryResult.recipients?.map(recipient => ({
                            id: recipient.id,
                            user_id: recipient.id,
                            content: recipient.name,
                            name: recipient.name,
                            contact_info: recipient.contact_info,
                            created_at: new Date().toISOString(),
                            memory_data: { type: 'contact' }
                          })) || [])}
                        actionMessage={queryResult.message || queryResult.actionMessage}
                        onSelectContact={onSelectContact}
                        onClose={onClose}
                      />
                    ) : queryResult.memories && queryResult.memories.length > 0 ? (
                      <SearchResults
                        memories={queryResult.memories}
                        onSelectContact={onSelectContact}
                      />
                    ) : (
                    <LoadingIndicator 
                      isSummaryQuery={isSummaryQuery}
                      isActionQuery={isActionQuery}
                            />
                    )}
                  </motion.div>
              )}
              </div>
              </div>
        </motion.div>
      </motion.div>

      {/* Add styles for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </AnimatePresence>
  );
}
