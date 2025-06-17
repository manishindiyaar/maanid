import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Check admin session API route
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin session check API called');
    
    // Get domain for proper cookie handling
    const hostname = request.headers.get('host') || '';
    const isProd = hostname.includes('bladexlab.com');
    const cookieDomain = isProd ? '.bladexlab.com' : undefined;
    
    // Get admin_session cookie
    const cookieStore = cookies();
    const adminSession = cookieStore.get('admin_session');
    const adminMode = cookieStore.get('admin_mode');
    const setupComplete = cookieStore.get('setup_complete');
    const schemaSetupCompleted = cookieStore.get('schema_setup_completed');

    console.log('🍪 Admin cookie check:', {
      adminSession: adminSession?.value || 'Not found',
      adminMode: adminMode?.value || 'Not found',
      setupComplete: setupComplete?.value || 'Not found',
      schemaSetupCompleted: schemaSetupCompleted?.value || 'Not found'
    });

    // Check if the admin session exists
    if (!adminSession || adminSession.value !== 'true') {
      console.log('❌ Admin session invalid or missing');
      
      // Clear any inconsistent admin cookies if they exist
      if (adminMode) {
        cookieStore.delete('admin_mode');
      }
      
      return NextResponse.json(
        { isAdmin: false, message: 'Admin session not found' },
        { status: 401 }
      );
    }

    // Set up all related admin cookies to ensure consistency
    
    // Admin session exists but mode flag is missing
    if (!adminMode || adminMode.value !== 'true') {
      console.log('⚠️ Admin session exists but admin_mode cookie is missing, setting it');
      
      cookieStore.set('admin_mode', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 day expiry
        path: '/',
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
    
    // Ensure setup_complete flag is set
    if (!setupComplete || setupComplete.value !== 'true') {
      console.log('⚠️ Admin session exists but setup_complete cookie is missing, setting it');
      
      cookieStore.set('setup_complete', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days expiry
        path: '/',
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
    
    // Ensure schema_setup_completed flag is set
    if (!schemaSetupCompleted || schemaSetupCompleted.value !== 'true') {
      console.log('⚠️ Admin session exists but schema_setup_completed cookie is missing, setting it');
      
      cookieStore.set('schema_setup_completed', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days expiry
        path: '/',
        sameSite: 'lax',
        domain: cookieDomain
      });
    }
    
    // Ensure has_supabase_credentials is set for middleware checks
    cookieStore.set('has_supabase_credentials', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      domain: cookieDomain
    });
    
    // Clear any redirect flags that might interfere with admin access
    cookieStore.set('redirect_count', '0', {
      maxAge: 0,
      path: '/',
      domain: cookieDomain
    });
    
    cookieStore.set('auth_in_progress', '', {
      maxAge: 0,
      path: '/',
      domain: cookieDomain
    });
    
    cookieStore.set('auth_callback_in_progress', '', {
      maxAge: 0,
      path: '/',
      domain: cookieDomain
    });

    // Admin session exists and all cookies are properly set
    console.log('✅ Admin session is valid');
    return NextResponse.json(
      { 
        isAdmin: true, 
        message: 'Admin session is valid',
        redirectTo: '/dashboard'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Admin session check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 