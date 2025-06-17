'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles } from 'lucide-react';
import { cn } from "./../lib/utils";
import OldSupportScene from './OldSupportScene';
import BladexReveal from './BladexReveal';
import TealGridBackground from './TealGridBackground';

// Register ScrollTrigger with GSAP
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HeroWithScroller() {
  const [isGlinting, setIsGlinting] = useState(false);
  const [subheadlineVisible, setSubheadlineVisible] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for interactive spotlight
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Trigger glinting animation periodically for the "With Soul" text
  useEffect(() => {
    const glintInterval = setInterval(() => {
      setIsGlinting(true);
      setTimeout(() => setIsGlinting(false), 1200);
    }, 5000);

    // Show subheadline after a short delay
    const subheadlineTimer = setTimeout(() => {
      setSubheadlineVisible(true);
    }, 1000);

    return () => {
      clearInterval(glintInterval);
      clearTimeout(subheadlineTimer);
    };
  }, []);

  // GSAP animations for scroll-triggered scenes
  useEffect(() => {
    if (!scrollerRef.current || typeof window === 'undefined') return;

    // Clear any existing animations
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const ctx = gsap.context(() => {
      // Create the main timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollerRef.current,
          start: 'top center',
          end: 'bottom top',
          scrub: 1,
          pin: true,
          pinSpacing: true,
        }
      });

      // Scene transitions
      tl.to('.scroller-progress', { width: '25%', duration: 0.5 })
        .to('.scene-1', { opacity: 1, duration: 0.5 }, '<')
        .to('.scene-1', { opacity: 0, duration: 0.5 }, '+=1')
        .to('.scroller-progress', { width: '50%', duration: 0.5 }, '<')
        .to('.scene-2', { opacity: 1, duration: 0.5 }, '<')
        .to('.scene-2', { opacity: 0, duration: 0.5 }, '+=1')
        .to('.scroller-progress', { width: '75%', duration: 0.5 }, '<')
        .to('.scene-3', { opacity: 1, duration: 0.5 }, '<')
        .to('.scene-3', { opacity: 0, duration: 0.5 }, '+=1')
        .to('.scroller-progress', { width: '76%', duration: 0.1 }, '<')
        // Transition break
        .to('.transition-break', { opacity: 1, scale: 1, duration: 0.5 }, '<')
        .to('.transition-break', { opacity: 0, duration: 0.5 }, '+=0.5')
        .to('.scroller-progress', { width: '100%', duration: 0.5 }, '<')
        // Bladex reveal
        .to('.bladex-reveal', { opacity: 1, duration: 0.5 }, '<');

      timelineRef.current = tl;

      // Animate neon particles in the background
      gsap.to('.particle', {
        y: 'random(-40, 40)',
        x: 'random(-40, 40)',
        opacity: 'random(0.3, 0.9)',
        scale: 'random(0.8, 1.5)',
        duration: 'random(3, 6)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.1
      });

      // Animate sparks
      gsap.to('.spark', {
        y: 'random(-100, 100)',
        x: 'random(-100, 100)',
        rotation: 'random(-45, 45)',
        opacity: 'random(0.2, 0.7)',
        scale: 'random(0.5, 1.2)',
        duration: 'random(2, 5)',
        repeat: -1,
        repeatRefresh: true,
        ease: 'power1.inOut',
        stagger: 0.1
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative">
      {/* Background with grid using TealGridBackground */}
      <TealGridBackground gridSpacing={90} />
      
      {/* Main content */}
      <div ref={containerRef} className="relative overflow-hidden">
        {/* PART 1: Hero Section (Attention Hook) */}
        <section className="relative min-h-screen flex flex-col justify-center items-center px-4 py-20 overflow-hidden">
          <div className="max-w-5xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 tracking-tight"
            >
              <span className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
                Your AI Support Team.
              </span> 
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-teal-500">
                With Memory.
              </span> 
              <span className="relative inline-block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                With Soul.
                {isGlinting && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.5, left: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: 1, left: '100%' }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 w-10 h-full bg-gradient-to-r from-transparent via-white/80 to-transparent transform -skew-x-12 pointer-events-none"
                  />
                )}
              </span>
            </motion.h1>

            <AnimatePresence>
              {subheadlineVisible && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-3xl mx-auto mb-10"
                >
                  <p className="text-neutral-500 font-medium text-lg mb-2">
                    Chatbots were cold, static, and blind.
                  </p>
                  <p className="text-neutral-300 text-lg md:text-xl">
                    Bladex AI is the world's first transparent, intelligent, and autonomous 
                    customer support copilot — built to feel like magic, and work like fire.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="absolute bottom-10 left-0 right-0 flex justify-center"
            >
              <div className="animate-bounce flex flex-col items-center text-neutral-400">
                <span className="text-sm">Scroll to see the difference</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mt-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </motion.div>
          </div>
        </section>

        {/* PART 2: Cinematic Scroller */}
        <div ref={scrollerRef} className="relative h-screen mb-10">
          {/* Enhanced Scroll Progress Bar with glow */}
          <div className="fixed top-0 left-0 right-0 h-1 bg-gray-900 z-50">
            <div className="scroller-progress h-full w-0 bg-gradient-to-r from-teal-500 to-cyan-500 shadow-[0_0_10px_rgba(20,184,166,0.7)]" />
          </div>

          {/* Scenes Container */}
          <div className="h-full relative">
            {/* Scene 1: Cold Robotic Chatbot */}
            <div className="scene-1 absolute inset-0 opacity-0">
              <OldSupportScene 
                sceneNumber={1}
                title="Cold Robotic Responses"
                description="Traditional chatbots can't remember who you are"
              />
            </div>

            {/* Scene 2: Frustration & Silence */}
            <div className="scene-2 absolute inset-0 opacity-0">
              <OldSupportScene 
                sceneNumber={2}
                title="Frustration & Silence"
                description="Customers left waiting for real answers"
              />
            </div>

            {/* Scene 3: Black Box AI */}
            <div className="scene-3 absolute inset-0 opacity-0">
              <OldSupportScene 
                sceneNumber={3}
                title="The Black Box Problem"
                description="You don't know what your AI is doing"
              />
            </div>

            {/* Enhanced Transition Break with 3D teal gradient and neon shadow */}
            <motion.div 
              className="transition-break absolute inset-0 flex items-center justify-center opacity-0 scale-95"
              initial={{ opacity: 0, scale: 0.95 }}
            >
              <div className="relative transform perspective-1000">
                {/* 3D neon container with glow effect */}
                <div className="relative bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 p-[2px] rounded-xl shadow-[0_0_30px_rgba(20,184,166,0.6)] w-full max-w-md transform transition-all duration-500 hover:shadow-[0_0_40px_rgba(20,184,166,0.8)] hover:scale-105 backdrop-blur">
                  {/* Inner neon glow */}
                  <div className="absolute inset-0 -z-10 opacity-80 blur-xl bg-gradient-to-r from-teal-400/60 to-cyan-400/60 rounded-xl"></div>
                  
                  {/* Inner shadows for 3D effect */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-teal-200/10 opacity-50"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                  </div>
                  
                  {/* Content with glass morphism */}
                  <div className="bg-gray-950/80 backdrop-blur-md rounded-xl p-8 text-center relative overflow-hidden border border-teal-500/20">
                    {/* Horizontal lines for tech effect */}
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={`line-${i}`}
                        className="absolute h-[1px] w-full opacity-20"
                        style={{ 
                          top: `${20 * (i + 1)}%`,
                          background: `linear-gradient(90deg, transparent 0%, rgba(20, 184, 166, ${0.5 + i * 0.1}) 50%, transparent 100%)`,
                        }}
                      />
                    ))}
                    
                    <h3 className="text-2xl md:text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 mb-4 flex items-center justify-center">
                      Then came 
                      <span className="inline-block">
                        <img src="/images/bl_removedbg.png" alt="Bladex AI" className="w-10 h-10" />
                      </span>
                      Bladex AI
                    </h3>
                    <p className="text-neutral-300 relative z-10">Everything changed.</p>
                    
                    {/* Particles inside the box */}
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={`inner-particle-${i}`}
                        className="absolute w-1 h-1 rounded-full bg-teal-400/80"
                        style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          boxShadow: '0 0 6px rgba(20, 184, 166, 0.8)',
                          animation: `float ${2 + Math.random() * 3}s infinite ease-in-out ${Math.random() * 2}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Bottom reflection */}
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-3/4 h-10 bg-gradient-to-b from-teal-500/30 to-transparent blur-lg rounded-full"></div>
              </div>
            </motion.div>

            {/* Bladex AI Reveal */}
            <div className="bladex-reveal absolute inset-0 opacity-0">
              <BladexReveal />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 