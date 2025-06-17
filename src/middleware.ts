// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

// Define cookie timeouts for consistency
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SESSION_TIMEOUT = 5000; // 5 seconds timeout for auth operations

/**
 * Synchronizes Supabase credentials between localStorage and cookies
 * so server-side code can access the right Supabase instance
 */
function syncSupabaseCredentials(req: NextRequest, res: NextResponse): NextResponse {
  // Extract credentials from localStorage cookies (set by client-side code)
  const hasCredentials = req.cookies.get('has_supabase_credentials')?.value === 'true';
  
  // Get domain for proper cookie handling
  const hostname = req.nextUrl.hostname;
  const isProd = hostname.includes('bladexlab.com');
  const cookieDomain = isProd ? '.bladexlab.com' : undefined;
  
  if (hasCredentials) {
    // These cookies might be set by the setup page - make sure they're available for all paths
    const supabaseUrl = req.cookies.get('supabase_url');
    const supabaseAnonKey = req.cookies.get('supabase_anon_key');
    const supabaseProjectRef = req.cookies.get('supabase_project_ref');
    const accessToken = req.cookies.get('supabase_access_token');
    const schemaCompleted = req.cookies.get('schema_setup_completed');
    
    // Ensure all these cookies are set with proper paths
    if (supabaseUrl?.value) {
      res.cookies.set('supabase_url', supabaseUrl.value, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
    
    if (supabaseAnonKey?.value) {
      res.cookies.set('supabase_anon_key', supabaseAnonKey.value, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
    
    if (supabaseProjectRef?.value) {
      res.cookies.set('supabase_project_ref', supabaseProjectRef.value, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
    
    if (accessToken?.value) {
      res.cookies.set('supabase_access_token', accessToken.value, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
    
    if (schemaCompleted?.value) {
      res.cookies.set('schema_setup_completed', schemaCompleted.value, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
  }
  
  // Also preserve admin mode cookies
  const adminMode = req.cookies.get('admin_mode');
  const adminSession = req.cookies.get('admin_session');
  
  if (adminMode?.value) {
    res.cookies.set('admin_mode', adminMode.value, {
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
      domain: cookieDomain
    });
  }
  
  if (adminSession?.value) {
    res.cookies.set('admin_session', adminSession.value, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
      domain: cookieDomain
    });
  }
  
  return res;
}

// This middleware only runs on protected routes that require authentication
export async function middleware(request: NextRequest) {
  try {
    // Log the current path for debugging
    console.log("Middleware running on:", request.nextUrl.pathname);
    
    // Get domain for proper cookie handling
    const hostname = request.nextUrl.hostname;
    const isProd = hostname.includes('bladexlab.com');
    const cookieDomain = isProd ? '.bladexlab.com' : undefined;
    
    // Check for authentication through cookies
    const hasSupabaseCredentials = request.cookies.get('has_supabase_credentials')?.value === 'true';
    const schemaSetupCompleted = request.cookies.get('schema_setup_completed')?.value === 'true';
    const authInProgress = request.cookies.get('auth_in_progress')?.value === 'true';
    const authCallbackInProgress = request.cookies.get('auth_callback_in_progress')?.value === 'true';
    const setupRedirectInProgress = request.cookies.get('setup_redirect_in_progress')?.value === 'true';
    const isAdmin = request.cookies.get('is_admin')?.value === 'true' || 
                    request.cookies.get('admin_mode')?.value === 'true' || 
                    request.cookies.get('admin_session')?.value === 'true';
    
    // Check for auth-related paths that should never be redirected
    // This is critical to prevent redirect loops
    const isAuthPath = 
      request.nextUrl.pathname === '/signin' ||
      request.nextUrl.pathname === '/loading' ||
      request.nextUrl.pathname.startsWith('/auth/') ||
      request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname.startsWith('/api/users/') ||
      request.nextUrl.pathname.startsWith('/api/admin/');
    
    // Check for static assets that should never be redirected
    const isStaticAsset =
      request.nextUrl.pathname.includes('_next') ||
      request.nextUrl.pathname.includes('favicon.ico') ||
      request.nextUrl.pathname.includes('.svg') ||
      request.nextUrl.pathname.includes('.png') ||
      request.nextUrl.pathname.includes('.jpg') ||
      request.nextUrl.pathname.includes('.css') ||
      request.nextUrl.pathname.includes('.js');
    
    // If it's an auth path or static asset, allow access without authentication check
    if (isAuthPath || isStaticAsset) {
      console.log("Auth path or static asset detected, allowing access without auth check");
      return NextResponse.next();
    }
    
    // Special case: Check for OAuth-related paths to bypass authentication
    // This prevents redirect loops during the OAuth flow
    if (request.nextUrl.pathname.startsWith('/auth/callback') || 
        request.nextUrl.pathname.startsWith('/api/auth') ||
        authCallbackInProgress ||
        setupRedirectInProgress) {
      console.log("Auth callback in progress, bypassing authentication check");
      return NextResponse.next();
    }

    // Special case: if user is admin, always allow access to any route
    if (isAdmin) {
      console.log("Admin access granted");
      return NextResponse.next();
    }
    
    // Track redirect counts to prevent infinite loops
    let redirectCount = parseInt(request.cookies.get('redirect_count')?.value || '0');
    
    // If redirect count is too high, show error page and reset the counter
    if (redirectCount > 5) {
      console.log("Too many redirects detected, showing error page");
      
      // Create response with reset redirect count
      const response = NextResponse.redirect(new URL('/signin?auth_error=redirect_loop', request.url));
      
      // Reset redirect count and clear potentially problematic cookies
      response.cookies.set('redirect_count', '0', {
        path: '/',
        maxAge: 0,
        domain: cookieDomain
      });
      
      response.cookies.set('auth_in_progress', '', {
        path: '/',
        maxAge: 0,
        domain: cookieDomain
      });
      
      response.cookies.set('auth_callback_in_progress', '', {
        path: '/',
        maxAge: 0,
        domain: cookieDomain
      });
      
      return response;
    }

    // Not authenticated, redirect to the signin page
    if (!hasSupabaseCredentials && !authInProgress) {
      console.log("User not authenticated, redirecting to signin");
      
      // Create URL for the signin page
      const signinUrl = new URL('/signin', request.url);
      
      // Save the original URL to redirect back after authentication
      signinUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      
      // Set redirect count cookie and auth_in_progress flag
      const response = NextResponse.redirect(signinUrl);
      response.cookies.set('redirect_count', String(redirectCount + 1), {
        path: '/',
        maxAge: 60 * 5, // 5 minutes
        sameSite: 'lax',
        domain: cookieDomain
      });
      
      response.cookies.set('auth_in_progress', 'true', {
        path: '/',
        maxAge: 60 * 5, // 5 minutes timeout
        sameSite: 'lax',
        domain: cookieDomain
      });
      
      return response;
    }

    // Special case: /setup routes should always be accessible if authenticated
    if (request.nextUrl.pathname.startsWith('/setup')) {
      console.log("User authenticated and accessing setup page, allowing access");
      return NextResponse.next();
    }

    // For authenticated users accessing dashboard, check if setup is completed
    if (request.nextUrl.pathname.startsWith('/dashboard') && !schemaSetupCompleted) {
      console.log("User authenticated but setup not completed, redirecting to setup");
      
      // Redirect to setup page
      const setupUrl = new URL('/setup', request.url);
      
      // Set redirect count cookie
      const response = NextResponse.redirect(setupUrl);
      response.cookies.set('redirect_count', String(redirectCount + 1), {
        path: '/',
        maxAge: 60 * 5, // 5 minutes
        sameSite: 'lax',
        domain: cookieDomain
      });
      
      return response;
    }

    // User is authenticated and setup is completed (or accessing a non-dashboard protected route)
    console.log("User authenticated, allowing access");
    
    // Reset redirect count when successfully authenticated
    const response = NextResponse.next();
    response.cookies.set('redirect_count', '0', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    return syncSupabaseCredentials(request, response);

  } catch (error) {
    console.error("Middleware error:", error);
    // On error, redirect to the signin page as a fallback
    return NextResponse.redirect(new URL('/signin', request.url));
  }
}

// Only run this middleware on the protected routes
export const config = {
  matcher: [
    /*
     * Match ONLY these specific protected routes that require authentication.
     * Do NOT include the homepage or any public routes.
     */
    '/dashboard',
    '/dashboard/:path*',
    '/account',
    '/account/:path*', 
    '/settings',
    '/settings/:path*',
    '/setup',
    '/setup/:path*'
  ]
};
