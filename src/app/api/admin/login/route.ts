import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Hardcoded admin credentials - should match the frontend (in production, use secure storage)
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123';

// Admin login API route
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      console.log('❌ Admin login failed: Invalid credentials');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('✅ Admin credentials validated');

    // Generate a simple admin token (in production, use a proper JWT)
    const adminToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    // Set admin_session cookie (HTTP only for security)
    const cookieStore = cookies();
    cookieStore.set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day expiry
      path: '/',
      sameSite: 'lax' // Changed from strict to lax for cross-site navigation
    });
    
    // Set admin_mode flag cookie (visible to JavaScript)
    cookieStore.set('admin_mode', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day expiry
      path: '/',
      sameSite: 'lax' // Changed from strict to lax for cross-site navigation
    });

    // Also set session cookie if it doesn't exist (for general auth)
    if (!cookieStore.has('session')) {
      cookieStore.set('session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        sameSite: 'lax'
      });
    }

    // For admins, we want to set these flags to ensure proper access
    cookieStore.set('setup_complete', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax'
    });
    
    cookieStore.set('schema_setup_completed', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax'
    });
    
    // Also set has_supabase_credentials for middleware checks
    cookieStore.set('has_supabase_credentials', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax'
    });

    console.log('✅ Admin login successful - cookies set');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Admin login successful',
        adminToken, // Send token back to client to store in localStorage
        isAdmin: true,
        redirectTo: '/dashboard' // Help client know where to redirect
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 