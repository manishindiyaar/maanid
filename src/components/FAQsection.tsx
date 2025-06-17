"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    question: "How is Bladex AI different from traditional chatbots?",
    answer: "We never call ourself chatbots. we are beyond chatbots. we are setting standards for what comes after chatbots. Bladex isn't rule-based or static. It remembers past conversations, scores context, and transparently shows decision-making in real time. it works same like your employees and it has great agentic capabilities."
  },
  {
    question: "Can I customize the AI agents?",
    answer: "Absolutely. You can create any of AI agents and this only requires Agent Name and Agent Description and you are done. you can even plug your own data sources like Google Sheets, Salesforce, or CSVs (coming soon feature) and the best part our state of the orchestration AI layer will decide which agent to use for responding to the customer."
  },
  {
    question: "How does memory work?",
    answer: "Bladex AI recalls customer history and uses it to tailor responses — so your customers never have to repeat themselves. we have this great feature like when you will ask in Query Box 'Tell me about that customer who has recently purchased 3 products' then it will memory of that customer and will give their complete profile based on their past conversation "
  },
  {
    question: "What does 'autonomous' mean here?",
    answer: "It means 60%+ of support is handled by AI with Agentic capabilities ,smart escalation, task assignment, and orchestration — like having a mini AGI handling your customer support"
  },
  {
    question: "Can I see how it makes decisions?",
    answer: "Yes. Our 'Transparency Layer' shows incoming messages, memory pulled, scoring, prompt generation, and final response — all in real time."
  }
];

const FAQSection = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Simple Grid background */}
      <div className="absolute inset-0 z-0" 
        style={{
          backgroundImage: "linear-gradient(to right, rgba(20,184,166,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,184,166,0.1) 1px, transparent 1px)",
          backgroundSize: "100px 100px"
        }}
      />
      
      {/* Simple glow */}
      <div className="absolute top-0 left-0 w-2/3 h-1/2 rounded-full opacity-20 blur-[100px]" 
        style={{background: "radial-gradient(circle, rgba(45,212,191,0.7) 0%, rgba(20,184,166,0) 70%)"}}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="w-full py-16 md:py-24 bg-black bg-opacity-80">
          <div className="max-w-4xl mx-auto px-6">
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 mb-2 text-center"
            >
              Frequently Asked Questions
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-neutral-400 text-center mb-12 max-w-2xl mx-auto"
            >
              Everything you need to know about our autonomous AI support platform.
            </motion.p>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  className={`backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden 
                    hover:ring-1 hover:ring-blue-500/30 transition-all duration-300
                    ${activeIndex === index ? 'bg-gradient-to-r from-neutral-900/80 to-neutral-800/80' : 'bg-neutral-900/30'}`}
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="flex justify-between items-center w-full p-5 text-left"
                  >
                    <span className="text-lg md:text-xl font-medium text-white">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: activeIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="h-5 w-5 text-blue-400" />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence>
                    {activeIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 pt-0 text-neutral-300 border-t border-neutral-800">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12 text-center"
            >
              <p className="text-neutral-400 mb-4">Still got questions?</p>
              <Link 
                href="/contact" 
                className="inline-flex items-center px-6 py-3 rounded-full font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
              >
                Contact Support →
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQSection; 