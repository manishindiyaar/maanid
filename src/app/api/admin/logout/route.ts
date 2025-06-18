import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Admin logout API route
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing admin logout request');
    
    // Clear all admin-related cookies
    const cookieStore = cookies();
    
    // Clear direct admin cookies
    cookieStore.delete('admin_session');
    cookieStore.delete('admin_mode');
    
    // Clear other authentication-related cookies that might have been set during admin login
    // This ensures we don't leave half-authenticated states
    cookieStore.delete('setup_complete');
    cookieStore.delete('schema_setup_completed');
    cookieStore.delete('has_supabase_credentials');
    
    console.log('✅ Admin cookies cleared');
    
    // Return clear instruction for admin token in localStorage
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Admin logout successful', 
        clearAdminToken: true,
        redirectTo: '/' // Redirect back to homepage
      },
      { status: 200 }
    );

    return response;
  } catch (error) {
    console.error('❌ Admin logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
