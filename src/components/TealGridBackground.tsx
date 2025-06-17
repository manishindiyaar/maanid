'use client';

import { useState, useEffect } from 'react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Our own cn function in case utils isn't available
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface TealGridBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  includeInteractiveSpotlight?: boolean;
  includeParticles?: boolean;
  gridSpacing?: number; // in pixels, default is 90px
}

export default function TealGridBackground({
  children,
  className,
  includeInteractiveSpotlight = true,
  includeParticles = true,
  gridSpacing = 90
}: TealGridBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for interactive spotlight
  useEffect(() => {
    if (!includeInteractiveSpotlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [includeInteractiveSpotlight]);

  return (
    <div className={cn("relative", className)} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Grid background container - non-fixed for more reliable rendering */}
      <div className="absolute inset-0 z-0">
        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(20,184,166,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(20,184,166,0.1) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSpacing}px ${gridSpacing}px`
          }}
        />
        
        {/* Glowing area 1 */}
        <div 
          className="absolute opacity-20 w-full md:w-2/3 h-1/2 rounded-full blur-[100px]"
          style={{
            top: '-10%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(45,212,191,0.7) 0%, rgba(20,184,166,0) 70%)'
          }}
        />
        
        {/* Glowing area 2 */}
        <div 
          className="absolute opacity-20 w-full md:w-2/3 h-1/2 rounded-full blur-[100px]"
          style={{
            bottom: '-10%',
            right: '15%',
            background: 'radial-gradient(circle, rgba(45,212,191,0.7) 0%, rgba(20,184,166,0) 70%)'
          }}
        />
        
        {/* Interactive spotlight */}
        {includeInteractiveSpotlight && (
          <div 
            className="absolute pointer-events-none opacity-30"
            style={{
              left: mousePosition.x - 300,
              top: mousePosition.y - 300,
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20,184,166,0.3) 0%, rgba(20,184,166,0) 70%)',
              transition: 'all 0.15s ease'
            }}
          />
        )}
        
        {/* Particles */}
        {includeParticles && (
          <>
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`particle-${i}`}
                className="absolute rounded-full"
                style={{
                  width: Math.random() * 3 + 1 + 'px',
                  height: Math.random() * 3 + 1 + 'px',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: 0.5,
                  backgroundColor: 'rgba(20, 184, 166, 0.8)',
                  boxShadow: '0 0 8px rgba(20, 184, 166, 0.8)',
                  animation: `float-particle ${3 + Math.random() * 7}s infinite ease-in-out ${Math.random() * 2}s`
                }}
              />
            ))}
          </>
        )}
      </div>
      
      {/* Children content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(10px); }
          50% { transform: translateY(5px) translateX(15px); }
          75% { transform: translateY(10px) translateX(-5px); }
        }
      `}</style>
    </div>
  );
} 