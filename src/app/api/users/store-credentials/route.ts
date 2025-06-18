import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from './../../../../lib/supabase/server';
import { cookies } from 'next/headers';
import { encryptCredentials } from './../../../../lib/utils/encryption';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to store user credentials in the admin database
 * Called after a user completes the OAuth flow with Google and Supabase
 */
export async function POST(request: NextRequest) {
  try {
    // Get admin Supabase client
    const adminClient = createAdminSupabaseClient();
    
    // Get request body with user info
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: email' 
      }, { status: 400 });
    }
    
    // Get user's Supabase credentials from cookies
    const cookieStore = cookies();
    
    const userCredentials = {
      // Store connection details
      supabase_url: cookieStore.get('supabase_url')?.value || null,
      supabase_anon_key: cookieStore.get('supabase_anon_key')?.value || null,
      supabase_service_role_key: cookieStore.get('supabase_service_role_key')?.value || null,
      
      // Store project details
      project_ref: cookieStore.get('supabase_project_ref')?.value || null,
      project_name: cookieStore.get('supabase_project_name')?.value || null,
      
      // Store auth details
      has_google_auth: !!cookieStore.get('supabase-auth-token')?.value,
      
      // Add timestamp for auditing
      stored_at: new Date().toISOString()
    };
    
    // Encrypt sensitive parts of the credentials
    const encryptedCredentials = encryptCredentials(userCredentials);
    
    // Check if user already exists in the database
    const { data: existingUser, error: findError } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
      
    if (findError) {
      console.error('Error checking if user exists:', findError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check if user exists' 
      }, { status: 500 });
    }
    
    let userId;
    
    if (existingUser) {
      // Update existing user
      const { data, error: updateError } = await adminClient
        .from('users')
        .update({
          credentials: encryptedCredentials,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select('id')
        .single();
        
      if (updateError) {
        console.error('Error updating user credentials:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update user credentials' 
        }, { status: 500 });
      }
      
      userId = data.id;
    } else {
      // Create new user
      const { data, error: insertError } = await adminClient
        .from('users')
        .insert({
          email,
          credentials: encryptedCredentials,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (insertError) {
        console.error('Error inserting user credentials:', insertError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to store user credentials' 
        }, { status: 500 });
      }
      
      userId = data.id;
    }
    
    console.log(`✅ Stored credentials for user: ${email} (ID: ${userId})`);
    
    // Return credentials with instructional JavaScript to save to localStorage
    // This will be executed on the client side
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Saving Credentials</title>
        <script>
          // Credentials to save in localStorage
          const credentials = ${JSON.stringify({
            supabase_url: userCredentials.supabase_url,
            supabase_anon_key: userCredentials.supabase_anon_key,
            supabase_access_token: cookieStore.get('supabase-access-token')?.value || null,
            project_ref: userCredentials.project_ref,
            refresh_token: cookieStore.get('supabase-refresh-token')?.value || null,
            stored_at: userCredentials.stored_at
          })};
          
          // Save to localStorage
          Object.entries(credentials).forEach(([key, value]) => {
            if (value) {
              console.log('Saving to localStorage:', key);
              localStorage.setItem(key, value);
              
              // Also save using standard format keys
              if (key === 'supabase_url') {
                localStorage.setItem('NEXT_PUBLIC_SUPABASE_URL', value);
              }
              if (key === 'supabase_anon_key') {
                localStorage.setItem('NEXT_PUBLIC_SUPABASE_ANON_KEY', value);
              }
            }
          });
          
          // Set timestamp
          localStorage.setItem('supabase_credentials_updated_at', new Date().toISOString());
          
          // Redirect back to dashboard or show success
          window.onload = function() {
            // Set a short delay to ensure localStorage is updated
            setTimeout(() => {
              // Check for success URL parameter
              const urlParams = new URLSearchParams(window.location.search);
              const redirectUrl = urlParams.get('redirect') || '/dashboard';
              
              window.location.href = redirectUrl;
            }, 500);
          };
        </script>
      </head>
      <body>
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui, sans-serif;">
          <div style="text-align: center;">
            <h2>Saving credentials...</h2>
            <p>Please wait while we set up your account.</p>
          </div>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
    
  } catch (error) {
    console.error('Error storing user credentials:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred while storing user credentials' 
    }, { status: 500 });
  }
} 
