'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from './../components/ui/button';
import { ChevronRight, Database, MessageSquare, Zap } from 'lucide-react';
import Navbar from './../components/Navbar';
import Hero from './../components/Hero';
import { FeaturesSectionDemo } from './../components/BentoFeature';
import { CopilotBoxDemo } from "./../components/CopilotBox";
import TransparencyLayer from './../components/TransparencyLayer';
import HeroWithScroller from './../components/HeroWithScroller';
import SocialProofQuote from './../components/SocialProofQuote';
import ExperimentalContact from './../components/ExperimentalContact';
import FAQSection from './../components/FAQsection';
import Link from 'next/link';
import EpicVideoComponent from '@/components/FIREVIDEO';

export default function LandingPage() {
  const router = useRouter();

  // REMOVED: No longer automatically redirect to signin
  // Now users can browse the landing page freely
  
  return (
    <div className="min-h-screen bg-black text-white">

      {/* <Navbar /> */}

      {/* Get Started Button */}
      {/* <div className="flex justify-center mt-8">
        <Button 
          onClick={() => router.push('/admin')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2"
        >
          Get Started <ChevronRight className="w-5 h-5" />
        </Button>
      </div> */}

       {/* Hero Section */}
       {/* <Hero /> */}


      {/* Cinematic Hero with Scroller */}
      {/* <HeroWithScroller /> */}




      {/* Transparency Layer Section */}
      <TransparencyLayer />

      <EpicVideoComponent />


      {/* Social Proof Quote */}
      {/* <SocialProofQuote /> */}


      <CopilotBoxDemo />

      {/* Bento Features Section */}
      {/* <FeaturesSectionDemo /> */}

      {/* <ExperimentalContact /> */}

      {/* <FAQSection /> */}

      <footer className="container mx-auto max-w-6xl px-4 py-8 border-t border-white/10 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            © 2023 Maanid AI. All rights reserved.      
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

