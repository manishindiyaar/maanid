import React from 'react';

const EpicVideoComponent = () => {
  return (
    <div className="relative min-h-screen bg-gray-950 overflow-hidden flex items-center justify-center">
      {/* Cyberpunk Grid Background - similar to TransparencyLayer */}
      <div className="absolute inset-0 opacity-20" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'perspective(1000px) rotateX(60deg) translateY(100px) scale(2)',
          transformOrigin: 'center bottom'
        }}
      />

      {/* Glow Spots - similar to TransparencyLayer */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
      
      {/* Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Teal particles - matching TransparencyLayer theme */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              backgroundColor: ['#0ea5e9', '#06b6d4', '#0d9488', '#14b8a6', '#2dd4bf'][Math.floor(Math.random() * 5)],
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${1 + Math.random() * 3}s`,
              opacity: 0.5 + Math.random() * 0.3
            }}
          />
        ))}
      </div>

      {/* Orbital teal rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-cyan-500/30 animate-ping"
            style={{
              width: `${300 + i * 100}px`,
              height: `${300 + i * 100}px`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: '4s',
            }}
          />
        ))}
      </div>

      {/* Video container with bold neon teal border */}
      <div className="relative z-20">
        <div className="relative bg-black/40 backdrop-blur-xl rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.3)]">
          {/* Terminal-style Header - like in TransparencyLayer */}
          <div className="flex items-center bg-black/60 px-4 py-3 border-b border-white/10">
            <div className="flex space-x-2">
              <div className="h-3 w-3 bg-rose-500 rounded-full"></div>
              <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
              <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
            </div>
            <div className="flex-1 text-center text-sm text-gray-400 font-mono">maanid_product_demo.mp4 ~ streaming</div>
          </div>
          
          {/* Bold neon border with teal glow - inspired by line loader */}
          <div className="relative p-1">
            {/* Progress line similar to TransparencyLayer */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-cyan-400 to-teal-400 animate-progress"></div>
            </div>
            
            {/* Bold neon border */}
            <div className="absolute inset-0 z-10 rounded-b-xl">
              <div className="absolute inset-0 border-4 border-teal-500/50 rounded-b-xl"></div>
              <div className="neon-border"></div>
            </div>
            
            <iframe 
              width="800" 
              height="450" 
              src="https://www.youtube.com/embed/8qI-4j3XLy4?si=mXV9VI3aFOyiFELW" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              className="block relative z-0 rounded-b-xl"
            />
          </div>
        </div>
      </div>

      {/* Teal glow corners - matching TransparencyLayer */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-cyan-500/20 via-teal-500/10 to-transparent blur-3xl"></div>
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-radial from-teal-500/20 via-cyan-400/10 to-transparent blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-88 h-88 bg-gradient-radial from-cyan-400/20 via-teal-500/10 to-transparent blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-radial from-teal-500/20 via-cyan-500/10 to-transparent blur-2xl"></div>

      <style jsx>{`
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
        
        @media (max-width: 768px) {
          iframe {
            width: 90vw;
            height: 50vw;
          }
        }
        
        /* Bold neon border animation - similar to line loader in TransparencyLayer */
        .neon-border {
          position: absolute;
          inset: -4px;
          border-radius: 0 0 0.75rem 0.75rem;
          padding: 4px;
          background: linear-gradient(
            90deg,
            rgba(6, 182, 212, 0.9),
            rgba(20, 184, 166, 0.9),
            rgba(45, 212, 191, 0.9),
            rgba(6, 182, 212, 0.9)
          );
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          animation: rotate 3s linear infinite;
          filter: blur(2px) brightness(1.7);
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.8);
        }
        
        @keyframes rotate {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 400% center;
          }
        }
        
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
        
        .animate-progress {
          animation: progress 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EpicVideoComponent;