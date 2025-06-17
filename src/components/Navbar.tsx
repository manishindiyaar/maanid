'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const Navbar = () => {
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);

  // Handle scroll events to resize navbar
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node) && !isMobileMenuOpen) {
        setIsProductsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <div className={`w-full flex justify-center fixed top-0 z-50 px-4 transition-all duration-500 ease-in-out ${isScrolled ? 'py-2' : 'py-6'}`}>
      <motion.nav
        ref={navbarRef}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`rounded-2xl transition-all duration-500 ease-in-out backdrop-blur-xl p-3 px-4 mx-auto border ${
          isScrolled
            ? 'max-w-5xl bg-white/15 border-white/20 shadow-lg'
            : 'w-full max-w-[95%] bg-white/10 border-white/10'
        }`}
        style={{
          boxShadow: isScrolled
            ? '0 10px 30px rgba(0, 0, 0, 0.1), 0 1px 5px rgba(255, 255, 255, 0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div className={`flex items-center gap-4 transition-all duration-300 ease-in-out ${
          isProductsOpen ? 'border-b border-white/20 pb-4 mb-2' : ''
        }`}>
          {/* Logo with brain icon */}
          <div className="flex-shrink-0 mx-1">
            <Link href="/" className="flex items-center">
              <img src="/images/bl_removedbg.png" alt="Bladex AI" className="w-10 h-10" />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-3 mx-auto">
            {/* Products Button */}
            <button
              className={`relative px-5 py-2.5 rounded-lg text-white hover:text-teal-400 transition-all duration-300 font-medium flex items-center gap-1 group ${
                isProductsOpen ? 'text-teal-400 bg-white/10 border-white/10 border' : ''
              }`}
              onMouseEnter={() => setIsProductsOpen(true)}
              onClick={() => setIsProductsOpen(!isProductsOpen)}
            >
              <span className="relative z-10">Products</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-300 ${isProductsOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>

              {/* Hover background effect */}
              <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>

              {/* Hover border effect */}
              <div className="absolute inset-0 rounded-lg border border-white/0 group-hover:border-white/20 transition-all duration-300 -z-10"></div>
            </button>

            <Link
              href="/about"
              className="relative px-5 py-2.5 rounded-lg text-white hover:text-teal-400 transition-all duration-300 font-medium group"
            >
              <span className="relative z-10">About</span>
              {/* Hover background effect */}
              <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>

              {/* Hover border effect */}
              <div className="absolute inset-0 rounded-lg border border-white/0 group-hover:border-white/20 transition-all duration-300 -z-10"></div>
            </Link>

            <Link
              href="/blogs"
              className="relative px-5 py-2.5 rounded-lg text-white hover:text-teal-400 transition-all duration-300 font-medium group"
            >
              <span className="relative z-10">Blogs</span>
              {/* Hover background effect */}
              <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>

              {/* Hover border effect */}
              <div className="absolute inset-0 rounded-lg border border-white/0 group-hover:border-white/20 transition-all duration-300 -z-10"></div>
            </Link>

            <Link
              href="/contact"
              className="relative px-5 py-2.5 rounded-lg text-white hover:text-teal-400 transition-all duration-300 font-medium group"
            >
              <span className="relative z-10">Contact</span>
              {/* Hover background effect */}
              <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>

              {/* Hover border effect */}
              <div className="absolute inset-0 rounded-lg border border-white/0 group-hover:border-white/20 transition-all duration-300 -z-10"></div>
            </Link>
          </div>

          
          <div className="hidden md:flex space-x-3">
            
             
          

            <Link href="/dashboard">
              <button className="relative overflow-hidden px-6 py-2.5 rounded-lg text-white bg-gradient-to-r from-teal-600/80 to-teal-500/80 font-medium transition-all duration-300 hover:shadow-[0_0_15px_rgba(20,184,166,0.5)] border border-teal-400/30 group">
                <span className="relative z-10">Try Demo</span>

                {/* Button shine effect */}
                <div className="absolute top-0 -inset-full h-full w-1/3 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine"></div>
              </button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center ml-auto">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-white hover:text-teal-400 hover:bg-white/10 focus:outline-none transition-colors duration-300"
              aria-label="Open main menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className={`h-6 w-6 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Products Dropdown Content - Appears directly in the navbar */}
        <div
          className={`grid grid-cols-2 gap-4 px-4 transition-all duration-500 ease-in-out overflow-hidden ${
            isProductsOpen ? 'max-h-[300px] opacity-100 py-4' : 'max-h-0 opacity-0 py-0'
          }`}
          onMouseLeave={() => setIsProductsOpen(false)}
        >
          <Link
            href="/products/bl_customer_support"
            className="p-4 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-3 border border-white/0 hover:border-white/20"
          >
            <div className="bg-blue-900/30 p-3 rounded-full border border-blue-500/30">
              <img src="/images/bl_removedbg.png" alt="BladeX AI" className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-white">BladeX AI</p>
              <p className="text-sm text-white/60">Automate your customer support</p>
            </div>
          </Link>

          {/* for further products you can just copy paste <Link></Link> and change the href and the text */}

          {/* <Link
            href="/products/support"
            className="p-4 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-3 border border-white/0 hover:border-white/20"
          >
            <div className="bg-yellow-900/30 p-3 rounded-full border border-yellow-500/30">
              <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Support</p>
              <p className="text-sm text-white/60">Help customers 24/7</p>
            </div>
          </Link>

          <Link
            href="/products/survey"
            className="p-4 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-3 border border-white/0 hover:border-white/20"
          >
            <div className="bg-orange-900/30 p-3 rounded-full border border-orange-500/30">
              <svg className="h-6 w-6 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10"></path>
                <path d="M18 20V4"></path>
                <path d="M6 20v-4"></path>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Survey</p>
              <p className="text-sm text-white/60">Know customers better</p>
            </div>
          </Link>

          <Link
            href="/products/qualification"
            className="p-4 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-3 border border-white/0 hover:border-white/20"
          >
            <div className="bg-green-900/30 p-3 rounded-full border border-green-500/30">
              <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Lead Qualification</p>
              <p className="text-sm text-white/60">Filter hot leads</p>
            </div>
          </Link> */}
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden transition-all duration-500 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pt-2 pb-4 space-y-1 border-t border-white/20 mt-2">
            <div>
              <button
                onClick={() => setIsProductsOpen(!isProductsOpen)}
                className="w-full flex justify-between items-center px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-teal-400 transition-all duration-200 border border-white/0 hover:border-white/20"
              >
                <span className="font-medium">Products</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-300 ${isProductsOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Mobile Products Submenu */}
              {/* <div className={`px-3 py-2 transition-all duration-500 ease-in-out overflow-hidden ${
                isProductsOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <Link
                  href="/products/sales"
                  className="block py-2 px-4 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/0 hover:border-white/20 mt-1"
                >
                  <p className="font-medium text-white">Sales</p>
                  <p className="text-sm text-white/60">Automate your sales</p>
                </Link>
                <Link
                  href="/products/support"
                  className="block py-2 px-4 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/0 hover:border-white/20 mt-1"
                >
                  <p className="font-medium text-white">Support</p>
                  <p className="text-sm text-white/60">Help customers 24/7</p>
                </Link>
                <Link
                  href="/products/survey"
                  className="block py-2 px-4 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/0 hover:border-white/20 mt-1"
                >
                  <p className="font-medium text-white">Survey</p>
                  <p className="text-sm text-white/60">Know customers better</p>
                </Link>
                <Link
                  href="/products/qualification"
                  className="block py-2 px-4 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/0 hover:border-white/20 mt-1"
                >
                  <p className="font-medium text-white">Lead Qualification</p>
                  <p className="text-sm text-white/60">Filter hot leads</p>
                </Link>
              </div>
            */}

</div>

            <Link
              href="/about"
              className="block px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-teal-400 transition-all duration-200 font-medium border border-white/0 hover:border-white/20"
            >
              About
            </Link>
            <Link
              href="/blogs"
              className="block px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-teal-400 transition-all duration-200 font-medium border border-white/0 hover:border-white/20"
            >
              Blogs
            </Link>
            <Link
              href="/contact"
              className="block px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-teal-400 transition-all duration-200 font-medium border border-white/0 hover:border-white/20"
            >
              Contact
            </Link>

            {/* Mobile Sign In and Get Started buttons */}
            <div className="pt-2 space-y-2">
             
             
              <Link href="/dashboard">
                <button className="w-full relative overflow-hidden px-6 py-2.5 rounded-lg text-white bg-gradient-to-r from-teal-600/80 to-teal-500/80 font-medium transition-all duration-300 border border-teal-400/30 group">
                  <span>Get Started</span>

                  {/* Button shine effect */}
                  <div className="absolute top-0 -inset-full h-full w-1/3 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine"></div>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Animation keyframes */}
        <style jsx global>{`
          @keyframes shine {
            0% { left: -100%; }
            100% { left: 150%; }
          }

          .animate-shine {
            animation: shine 1.5s ease-in-out;
          }
        `}</style>
      </motion.nav>
    </div>
  );
};

export default Navbar;