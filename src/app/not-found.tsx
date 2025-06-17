'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function NotFound() {
  // Add a redirect to signin after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/signin';
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-800 via-gray-900 to-black">
      <div className="text-center max-w-md px-6">
        <h1 className="text-4xl font-bold text-white mb-6">404 - Page Not Found</h1>
        <p className="text-xl text-gray-300 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mb-8">
          <Link 
            href="/signin" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
        <p className="text-gray-400 text-sm">
          You will be automatically redirected to the sign in page in 5 seconds...
        </p>
      </div>
    </div>
  );
}
