import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from './../../../lib/supabase/server';
import { encryptCredentials } from './../../../lib/utils/encryption';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { code, codeVerifier, clientId, clientSecret, redirectUri } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    if (!codeVerifier) {
      return NextResponse.json({ error: 'No code verifier provided' }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'No client ID provided' }, { status: 400 });
    }

    // Use the provided redirectUri or determine it based on the current origin
    const finalRedirectUri = redirectUri || `${request.headers.get('origin')}/setup/complete`;
    console.log('Using redirect URI:', finalRedirectUri);

    console.log('Exchanging code for token with Supabase');
    
    // Prepare the form data for the token exchange
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('code_verifier', codeVerifier);
    formData.append('redirect_uri', finalRedirectUri);
    formData.append('client_id', clientId);
    if (clientSecret) {
      formData.append('client_secret', clientSecret);
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://api.supabase.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.json({ 
        error: 'Token exchange failed', 
        details: errorData 
      }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, response:', JSON.stringify(tokenData, null, 2));
    
    // If project_ref is not in the response, try to get it
    if (!tokenData.project_ref && tokenData.access_token) {
      try {
        console.log('No project_ref in token response, fetching project info');
        const projectsResponse = await fetch('https://api.supabase.com/v1/projects', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          console.log('Projects API response:', JSON.stringify(projectsData, null, 2));
          
          if (projectsData && Array.isArray(projectsData) && projectsData.length > 0) {
            // Get the first project's reference
            const firstProject = projectsData[0];
            tokenData.project_ref = firstProject.id;
            tokenData.project_name = firstProject.name;
            console.log('Added project_ref to response:', tokenData.project_ref);
            
            // Fetch API keys for the project
            try {
              console.log('Fetching API keys for project:', firstProject.id);
              const apiKeysResponse = await fetch(`https://api.supabase.com/v1/projects/${firstProject.id}/api-keys`, {
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                },
              });
              
              if (apiKeysResponse.ok) {
                const apiKeysData = await apiKeysResponse.json();
                console.log('API Keys response:', JSON.stringify(apiKeysData, null, 2));
                
                // Find anon key and service role key
                if (apiKeysData && Array.isArray(apiKeysData)) {
                  const anonKey = apiKeysData.find(key => key.name === 'anon' || key.name === 'public');
                  const serviceRoleKey = apiKeysData.find(key => key.name === 'service_role' || key.name === 'service-role');
                  
                  if (anonKey) {
                    tokenData.anon_key = anonKey.api_key;
                    console.log('Added anon_key to response');
                  } else {
                    console.warn('No anon key found in API keys response');
                  }
                  
                  if (serviceRoleKey) {
                    tokenData.service_role_key = serviceRoleKey.api_key;
                    console.log('Added service_role_key to response');
                  } else {
                    console.warn('No service role key found in API keys response');
                  }
                } else {
                  console.warn('API keys response is not an array or is empty');
                }
              } else {
                console.error('Failed to fetch API keys:', await apiKeysResponse.text());
              }
            } catch (apiKeysError) {
              console.error('Error fetching API keys:', apiKeysError);
            }
            
            // Set the project URL
            tokenData.project_url = `https://${firstProject.id}.supabase.co`;
            console.log('Added project_url to response:', tokenData.project_url);
          } else {
            console.warn('No projects found in projects API response');
            
            // Generate a project reference from the client ID as fallback
            const simplifiedId = clientId.replace(/-/g, '').substring(0, 8);
            tokenData.project_ref = `proj_${simplifiedId}`;
            console.log('Using generated project_ref:', tokenData.project_ref);
          }
        } else {
          console.error('Failed to fetch projects:', await projectsResponse.text());
          
          // Generate a project reference from the client ID as fallback
          const simplifiedId = clientId.replace(/-/g, '').substring(0, 8);
          tokenData.project_ref = `proj_${simplifiedId}`;
          console.log('Using generated project_ref after error:', tokenData.project_ref);
        }
      } catch (projectError) {
        console.error('Error fetching project info:', projectError);
        
        // Generate a project reference from the client ID as fallback
        const simplifiedId = clientId.replace(/-/g, '').substring(0, 8);
        tokenData.project_ref = `proj_${simplifiedId}`;
        console.log('Using fallback project_ref after error:', tokenData.project_ref);
      }
    }
    
    // Final check - ensure we have a project_ref
    if (!tokenData.project_ref) {
      tokenData.project_ref = 'default-project-ref';
      console.warn('Using default project_ref as final fallback');
    }
    
    // Store user credentials in the admin database - using project name to extract email
    try {
      // Try to extract email from project name (common pattern in Supabase projects)
      let userEmail = null;
      
      if (tokenData.project_name && tokenData.project_name.includes("@")) {
        // Many Supabase projects are named like "user@email.com's Project"
        const emailMatch = tokenData.project_name.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        if (emailMatch && emailMatch[1]) {
          userEmail = emailMatch[1];
          console.log(`📝 Extracted email from project name: ${userEmail}`);
        }
      }
      
      // Fallback option - use a placeholder email based on project ref
      if (!userEmail && tokenData.project_ref) {
        let userEmail = `user_${tokenData.project_ref}@example.com`;
        console.log(`📝 Using placeholder email: ${userEmail}`);
      }
      
      if (userEmail) {
        console.log(`📝 Storing credentials for user ${userEmail} in admin database`);
        
        // Create credentials object
        const credentials = {
          supabase_url: tokenData.project_url,
          supabase_anon_key: tokenData.anon_key,
          supabase_service_role_key: tokenData.service_role_key,
          project_ref: tokenData.project_ref,
          project_name: tokenData.project_name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          stored_at: new Date().toISOString()
        };
        
        // Encrypt credentials
        const encryptedCredentials = encryptCredentials(credentials);
        
        // Get admin Supabase client
        const adminClient = createAdminSupabaseClient();
        
        // Check if user exists
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (existingUser) {
          // Update existing user
          const { error: updateError } = await adminClient
            .from('users')
            .update({
              credentials: encryptedCredentials,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id);
          
          if (updateError) {
            console.error('❌ Error updating user:', updateError);
          } else {
            console.log(`✅ Updated credentials for existing user: ${userEmail}`);
          }
        } else {
          // Create new user
          const { data, error: insertError } = await adminClient
            .from('users')
            .insert({
              email: userEmail,
              credentials: encryptedCredentials,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (insertError) {
            console.error('❌ Error creating user in admin database:', insertError);
          } else {
            console.log(`✅ Created new user with credentials: ${userEmail}, ID: ${data.id}`);
          }
        }
      } else {
        console.log('⚠️ Could not determine user email, skipping credential storage');
      }
    } catch (storeError) {
      console.error('❌ Error storing credentials in admin database:', storeError);
    }
    
    return NextResponse.json(tokenData);
  } catch (error: any) {
    console.error('Error processing token exchange:', error);
    return NextResponse.json({ error: error.message || 'Error processing token exchange' }, { status: 500 });
  }
} 
