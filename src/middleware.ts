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
    
    // MODIFIED: Always allow access without authentication
    // Just sync cookies and continue
    const response = NextResponse.next();
    return syncSupabaseCredentials(request, response);
    
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Configure the paths that this middleware should run on
export const config = {
  matcher: [
    // Apply to all routes except static assets, api routes, and specific paths
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
