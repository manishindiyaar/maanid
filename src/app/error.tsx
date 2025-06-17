'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-800 via-gray-900 to-black">
      <div className="text-center max-w-md px-6">
        <h1 className="text-4xl font-bold text-white mb-6">Something went wrong</h1>
        <p className="text-xl text-gray-300 mb-8">
          We apologize for the inconvenience. Please try again or go to the sign in page.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Try again
          </button>
          <Link 
            href="/signin" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
        {error.digest && (
          <p className="text-gray-400 text-sm">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
