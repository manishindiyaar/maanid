import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      supabaseUrl, 
      supabaseAnonKey, 
      supabaseServiceRoleKey,
      projectRef,
      projectName
    } = body;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();

    // Set secure HttpOnly cookies
    // User credentials (secure but accessible to API routes)
    cookieStore.set('user-supabase-url', supabaseUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax'
    });

    cookieStore.set('user-supabase-key', supabaseAnonKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax'
    });

    // Admin credentials (if provided)
    if (supabaseServiceRoleKey) {
      cookieStore.set('admin-supabase-key', supabaseServiceRoleKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax'
      });
    }

    // Additional metadata (if provided)
    if (projectRef) {
      cookieStore.set('supabase-project-ref', projectRef, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax'
      });
    }

    if (projectName) {
      cookieStore.set('supabase-project-name', projectName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax'
      });
    }

    // Set a flag cookie to indicate we have credentials (non-HttpOnly for checking in JavaScript)
    cookieStore.set('has-supabase-credentials', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax'
    });

    return NextResponse.json(
      { success: true, message: 'Credentials stored securely' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error storing credentials:', error);
    return NextResponse.json(
      { error: 'Failed to store credentials' },
      { status: 500 }
    );
  }
} 