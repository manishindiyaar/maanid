import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  
  // Get URL parameters
  const requestParams = requestUrl.searchParams;
  const code = requestParams.get('code');
  const error = requestParams.get('error');
  const errorDescription = requestParams.get('error_description');
  const callbackUrl = requestParams.get('callbackUrl') || '/dashboard'; // Default to dashboard
  
  console.log('Auth callback URL:', requestUrl.toString());
  console.log('Auth callback received with code:', code ? code.substring(0, 5) + '...' : 'missing');
  console.log('Original callback URL:', callbackUrl);

  // Get the host domain for proper cookie setting across subdomains
  const hostname = requestUrl.hostname;
  const isProd = hostname.includes('bladexlab.com');
  // For production, set cookies on .bladexlab.com to work across www and non-www
  const cookieDomain = isProd ? '.bladexlab.com' : undefined;
  
  // Set a cookie to indicate auth in progress to prevent redirect loops
  const cookieStore = cookies();
  
  // Clear any existing redirect counters to start fresh
  cookieStore.set('redirect_count', '0', { 
    maxAge: 0,
    path: '/',
    domain: cookieDomain
  });
  
  // Clear any existing auth flags that might interfere
  cookieStore.set('auth_in_progress', '', { 
    maxAge: 0,
    path: '/',
    domain: cookieDomain
  });
  
  // Set a new auth callback flag with a short timeout
  // This helps middleware recognize we're in an auth flow
  cookieStore.set('auth_callback_in_progress', 'true', { 
    maxAge: 60, // 1 minute max
    path: '/',
    sameSite: 'lax',
    domain: cookieDomain
  });

  // Log the current state for debugging
  console.log('Auth callback state:', {
    hasCode: !!code,
    hasError: !!error,
    errorDescription,
    requestUrl: requestUrl.toString(),
    hostname,
    isProd,
    cookieDomain,
    callbackUrl
  });
  
  // Handle errors from OAuth provider
  if (error) {
    console.error(`Auth callback error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
    cookieStore.set('auth_callback_in_progress', '', { 
      maxAge: 0,
      path: '/',
      domain: cookieDomain
    });
    return NextResponse.redirect(new URL(`/signin?auth_error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin));
  }
  
  if (!code) {
    console.error('Auth callback called without a code parameter');
    // Redirect to signin page with error parameter
    cookieStore.set('auth_callback_in_progress', '', { 
      maxAge: 0,
      path: '/',
      domain: cookieDomain
    });
    return NextResponse.redirect(new URL('/signin?auth_error=missing_code', requestUrl.origin));
  }

  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    console.log('Exchanging code for session...');
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Failed to exchange code for session:', error.message);
      // Redirect to signin page with error
      cookieStore.set('auth_callback_in_progress', '', { 
        maxAge: 0,
        path: '/',
        domain: cookieDomain
      });
      return NextResponse.redirect(
        new URL(`/signin?auth_error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }
    
    console.log('Session created successfully, user:', data.user?.id);
    
    // Clear the auth callback in-progress marker
    cookieStore.set('auth_callback_in_progress', '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // Set has_supabase_credentials cookie to ensure middleware recognizes the authenticated state
    // Use longer expiration for persistent auth
    cookieStore.set('has_supabase_credentials', 'true', {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // Set auth success flag to help the setup page recognize we just completed auth
    cookieStore.set('auth_success', 'true', {
      maxAge: 60 * 5, // 5 minutes
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // Save the callback URL for later redirect after setup
    cookieStore.set('original_callback_url', callbackUrl, {
      maxAge: 60 * 60, // 1 hour
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // ALWAYS redirect to setup first after successful authentication
    // Setup page will redirect to dashboard if setup is already complete
    const response = NextResponse.redirect(new URL('/setup', requestUrl.origin));
    
    // Also set cookies on the response for immediate effect
    response.cookies.set('has_supabase_credentials', 'true', {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    response.cookies.set('auth_success', 'true', {
      maxAge: 60 * 5, // 5 minutes
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    response.cookies.set('original_callback_url', callbackUrl, {
      maxAge: 60 * 60, // 1 hour
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // Explicitly clear auth_in_progress and setup_redirect_in_progress flags
    response.cookies.set('auth_in_progress', '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    response.cookies.set('redirect_count', '0', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    return response;
    
  } catch (error: any) {
    console.error('Unexpected error in auth callback:', error.message);
    
    // Set error cookie
    cookieStore.set('auth_error', error.message, {
      maxAge: 60 * 5, // 5 minutes
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // Clear the in-progress marker
    cookieStore.set('auth_callback_in_progress', '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // Create redirect response with error
    const response = NextResponse.redirect(
      new URL('/signin?auth_error=' + encodeURIComponent(error.message), requestUrl.origin)
    );
    
    // Reset all auth flags on error to prevent loops
    response.cookies.set('auth_in_progress', '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    response.cookies.set('redirect_count', '0', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    return response;
  }
}