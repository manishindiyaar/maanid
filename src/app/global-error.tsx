'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-800 via-gray-900 to-black">
          <div className="text-center max-w-md px-6">
            <h1 className="text-4xl font-bold text-white mb-6">Critical Error</h1>
            <p className="text-xl text-gray-300 mb-8">
              A critical error has occurred. Please try refreshing the page or go to the sign in page.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => reset()}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Try again
              </button>
              <a 
                href="/signin" 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Sign In
              </a>
            </div>
            {error.digest && (
              <p className="text-gray-400 text-sm">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
