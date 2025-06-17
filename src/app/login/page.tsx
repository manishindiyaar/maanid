'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../lib/auth/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Main login component
export default function Login() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}

// Loading fallback
function LoginLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Client component with useSearchParams
function LoginContent() {
  const { signIn, signInWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Check for error parameters from redirects
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    const messageParam = searchParams?.get('message');
    
    if (errorParam) {
      console.log('Login page received error:', errorParam, messageParam);
      
      if (errorParam === 'missing_code') {
        setError('The authentication link is invalid or has expired. Please request a new login link.');
      } else if (errorParam === 'unexpected') {
        setError(`An unexpected error occurred: ${messageParam || 'Please try again'}`);
      } else {
        setError(`Authentication error: ${errorParam}${messageParam ? ` - ${messageParam}` : ''}`);
      }
    }
  }, [searchParams]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your work email');
      return;
    }

    try {
      console.log('Sending magic link to:', email);
      await signIn(email);
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(`Failed to sign in: ${error.message || 'Please try again'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Bladex AI</h1>
          <p className="mt-2 text-gray-600">Customer Support, supercharged with AI</p>
        </div>

        {isEmailSent ? (
          <div className="text-center mt-8 p-4 bg-green-50 rounded-md">
            <h2 className="text-xl font-medium text-green-800">Check your email</h2>
            <p className="mt-2 text-green-600">
              We've sent a magic link to <strong>{email}</strong>.
              <br />Click the link in the email to sign in.
            </p>
            <button 
              onClick={() => setIsEmailSent(false)}
              className="mt-4 text-sm text-green-700 hover:text-green-900"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <form className="mt-8 space-y-6" onSubmit={handleEmailSignIn}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Work Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="name@company.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {isLoading ? 'Signing in...' : 'Sign in with Email'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M12.545 12.151L12.545 12.151L12.545 12.151C12.545 11.166 12.088 10.331 11.365 9.861C11.067 9.675 10.747 9.552 10.394 9.511V9.511L15.029 5.882L15.342 5.624C16.682 6.892 17.436 8.682 17.436 10.695C17.436 13.169 16.236 15.313 14.466 16.652C13.599 17.299 12.635 17.77 11.548 17.977L11.176 18.032C10.384 18.153 9.613 18.125 8.858 17.964L8.858 17.964L8.4 17.877C7.878 17.744 7.271 17.476 6.758 17.119C5.68 16.358 4.793 15.367 4.223 14.21L4.223 14.21L4.053 13.844C3.659 12.918 3.436 11.929 3.436 10.882C3.436 6.989 6.59 3.829 10.485 3.829C11.554 3.829 12.557 4.075 13.465 4.509L13.934 4.741L10.295 7.504C10.267 7.504 10.24 7.504 10.212 7.504C8.73 7.504 7.577 8.659 7.577 10.141C7.577 11.597 8.7 12.752 10.156 12.752C11.092 12.752 11.92 12.223 12.371 11.431L12.545 12.151Z"
                      fill="#EA4335"
                    />
                    <path
                      d="M10.212 7.504V7.504C10.24 7.504 10.267 7.504 10.295 7.504L13.934 4.741L13.465 4.509C12.557 4.075 11.554 3.829 10.485 3.829C6.59 3.829 3.436 6.989 3.436 10.882C3.436 11.929 3.659 12.918 4.053 13.844L4.223 14.21C4.793 15.367 5.68 16.358 6.758 17.119C7.271 17.476 7.878 17.744 8.4 17.877L8.858 17.964C9.613 18.125 10.384 18.153 11.176 18.032L11.548 17.977C12.635 17.77 13.599 17.299 14.466 16.652C16.236 15.313 17.436 13.169 17.436 10.695C17.436 8.682 16.682 6.892 15.342 5.624L15.029 5.882L10.394 9.511V9.511C10.747 9.552 11.067 9.675 11.365 9.861C12.088 10.331 12.545 11.166 12.545 12.151L12.371 11.431C11.92 12.223 11.092 12.752 10.156 12.752C8.7 12.752 7.577 11.597 7.577 10.141C7.577 8.659 8.73 7.504 10.212 7.504Z"
                      fill="#4285F4"
                    />
                  </svg>
                  Sign in with Google
                </button>
              </div>
            </div>
          </>
        )}

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up for free
            </Link>
          </p>
          <p className="mt-2 text-gray-600">
            <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
              ← Back to home page
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 