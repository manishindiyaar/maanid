import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { encryptCredentials } from '@/lib/utils/encryption';
import { isAdminModeServer } from '@/lib/utils/admin-mode';
import { registerUserBot, registerAdminBot } from '@/lib/utils/bot-registry';

/**
 * Helper function to extract user ID from the auth cookie
 */
function getUserIdFromAuthCookie(cookieStore: ReturnType<typeof cookies>): string | null {
  try {
    const authToken = cookieStore.get('supabase-auth-token')?.value;
    if (!authToken) return null;
    
    const tokenData = JSON.parse(authToken);
    
    if (Array.isArray(tokenData) && tokenData.length >= 2 && 
        typeof tokenData[1] === 'object' && tokenData[1].sub) {
      return tokenData[1].sub;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting user ID from auth cookie:', error);
    return null;
  }
}

/**
 * Register a bot in the registry, handling both USER and ADMIN modes
 */
async function registerBotInBotRegistry(token: string, isAdminMode: boolean, userCredentials: any = null) {
  try {
    console.log('[SIMPLE REGISTER] Registering bot in registry');
    
    // Get user ID from various sources
    let ownerId = null;
    let ownerEmail = null;
    
    // Try to get from auth cookie first
    const cookieStore = cookies();
    try {
      const authToken = cookieStore.get('supabase-auth-token')?.value;
      if (authToken) {
        const tokenData = JSON.parse(authToken);
        
        // Get user ID
        if (Array.isArray(tokenData) && tokenData.length >= 2 && 
            typeof tokenData[1] === 'object' && tokenData[1].sub) {
          ownerId = tokenData[1].sub;
        }
        
        // Get user email
        if (Array.isArray(tokenData) && tokenData.length >= 3 && 
            typeof tokenData[2] === 'object' && tokenData[2].email) {
          ownerEmail = tokenData[2].email;
        }
      }
    } catch (error) {
      console.error('[SIMPLE REGISTER] Error extracting user info from auth cookie:', error);
    }
    
    // If not in auth cookie, try to get from user database
    if (!ownerId || !ownerEmail) {
      const adminClient = createAdminSupabaseClient();
      
      // Try to find by first user with credentials in the admin DB
      const { data: userWithCredentials } = await adminClient
        .from('users')
        .select('id, email')
        .not('credentials', 'is', null)
        .limit(1)
        .maybeSingle();
        
      if (userWithCredentials) {
        ownerId = userWithCredentials.id;
        ownerEmail = userWithCredentials.email;
      }
    }
    
    // Register in the appropriate mode
    if (isAdminMode) {
      // In ADMIN mode, use admin credentials
      if (!ownerId) ownerId = '00000000-0000-0000-0000-000000000000';
      if (!ownerEmail) ownerEmail = 'admin@bladexlab.com';
      
      await registerAdminBot(token, ownerId, ownerEmail);
      console.log('[SIMPLE REGISTER] Registered bot in registry with ADMIN mode');
    } else if (userCredentials) {
      // In USER mode, use the user's credentials
      if (ownerId && ownerEmail) {
        const creds = {
          supabase_url: userCredentials.supabase_url,
          supabase_anon_key: userCredentials.supabase_anon_key
        };
        
        await registerUserBot(token, ownerId, ownerEmail, creds);
        console.log('[SIMPLE REGISTER] Registered bot in registry with USER mode');
      } else {
        console.error('[SIMPLE REGISTER] Missing user info for registry');
      }
    } else {
      console.error('[SIMPLE REGISTER] Missing credentials for registry');
    }
    
    return true;
  } catch (registryError) {
    console.error('[SIMPLE REGISTER] Error registering bot in registry:', registryError);
    return false;
  }
}

/**
 * Simplified bot registration endpoint used by the TelegramSetup component
 * This is a wrapper around the full telegram registration process
 */
export async function POST(request: Request) {
  try {
    const { token, name, platform } = await request.json();
    
    if (!token || !name || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: token, name, or platform' },
        { status: 400 }
      );
    }
    
    // Check if this is overriding the mode
    const userModeHeader = request.headers.get('x-bladex-user-mode');
    
    // Determine whether we're in admin or user mode
    const cookieStore = cookies();
    let isAdminMode = isAdminModeServer(cookieStore);
    
    // Override with header if provided
    if (userModeHeader !== null) {
      // This is critical - we need to make sure we're interpreting the header correctly
      isAdminMode = userModeHeader !== 'true';
      console.log(`📋 Mode override from header: ${isAdminMode ? 'ADMIN' : 'USER'} mode`);
    }
    
    console.log(`🔐 [SIMPLE REGISTER] Operating in ${isAdminMode ? 'ADMIN' : 'USER'} mode`);
    
    // For Telegram, we need to register the webhook
    if (platform === 'telegram') {
      // First, try to get a user ID if we're in user mode
      let userId = null;
      
      if (!isAdminMode) {
        // Get the user ID directly from the auth cookie
        userId = getUserIdFromAuthCookie(cookieStore);
        
        // If found from cookie, use that
        if (userId) {
          console.log('📝 Found user ID from auth cookie:', userId);
        } 
        // Otherwise, try to get from email in auth cookie
        else {
          // Try to get from auth cookie first
          const authToken = cookieStore.get('supabase-auth-token')?.value;
          if (authToken) {
            try {
              const tokenData = JSON.parse(authToken);
              
              if (Array.isArray(tokenData) && tokenData.length >= 3 && 
                  typeof tokenData[2] === 'object' && tokenData[2].email) {
                const userEmail = tokenData[2].email;
                
                // Create admin client
                const adminClient = createAdminSupabaseClient();
                
                // Find user by email
                const { data: userData } = await adminClient
                  .from('users')
                  .select('id')
                  .eq('email', userEmail)
                  .maybeSingle();
                  
                if (userData?.id) {
                  userId = userData.id;
                  console.log('📝 Found user ID from email lookup:', userId);
                }
              }
            } catch (error) {
              console.error('Error extracting user info from auth cookie:', error);
            }
          }
        }
        
        // If we still don't have a user ID, get a specific user with credentials
        if (!userId) {
          const adminClient = createAdminSupabaseClient();
          
          // Look for the specific user with credentials in the request's cookies
          const supabaseUrl = cookieStore.get('supabase_url')?.value;
          
          if (supabaseUrl) {
            console.log('🔍 Looking for user with supabase URL:', supabaseUrl);
            
            // Try to find a user with matching credentials
            const { data: userWithCredentials } = await adminClient
              .from('users')
              .select('id, credentials')
              .not('credentials', 'is', null)
              .limit(10); // Get several to search through
            
            if (userWithCredentials) {
              // Check each user to find one with matching URL
              const matchingUser = userWithCredentials.find(user => 
                user.credentials && 
                user.credentials.supabase_url === supabaseUrl
              );
              
              if (matchingUser) {
                userId = matchingUser.id;
                console.log('📝 Found user ID by matching credentials:', userId);
              }
            }
          }
          
          // If still no user, get the first available user with credentials as fallback
          if (!userId) {
            const { data: anyUser } = await adminClient
              .from('users')
              .select('id')
              .not('credentials', 'is', null)
              .limit(1)
              .maybeSingle();
              
            if (anyUser?.id) {
              userId = anyUser.id;
              console.log('⚠️ No user ID from cookie, using first available user:', userId);
            }
          }
        }
      }
      
      // Forward the request to the telegram registration endpoint
      const telegramRegisterUrl = `${request.url.split('/simple-register')[0]}/telegram/register`;
      console.log(`📡 Forwarding to Telegram register endpoint: ${telegramRegisterUrl}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // Forward mode information explicitly
        'x-bladex-user-mode': isAdminMode ? 'false' : 'true'
      };
      
      // Add user ID header if we have one
      if (userId) {
        headers['x-bladex-user-id'] = userId;
        console.log('📝 Adding user ID to request headers:', userId);
      }
      
      // Use standard fetch to forward the request
      const forwardedResponse = await fetch(telegramRegisterUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token, name })
      });
      
      const data = await forwardedResponse.json();
      
      // Return the response
      return NextResponse.json(data, { status: forwardedResponse.status });
    }
    
    // Default flow for other platform types
    const supabase = createAdminSupabaseClient();
    
    // Encrypt user credentials if in user mode
    let userCredentials = null;
    
    if (!isAdminMode) {
      // Get credentials from cookies
      const credentials = {
        supabase_url: cookieStore.get('supabase_url')?.value || null,
        supabase_anon_key: cookieStore.get('supabase_anon_key')?.value || null,
        stored_at: new Date().toISOString()
      };
      
      // Check if we have valid credentials
      if (!credentials.supabase_url || !credentials.supabase_anon_key) {
        return NextResponse.json(
          { error: 'Missing user credentials. Please set up your Supabase connection first.' },
          { status: 400 }
        );
      }
      
      // Encrypt the credentials
      userCredentials = encryptCredentials(credentials);
    }
    
    // Check if bot already exists
    const { data: existingBot, error: checkError } = await supabase
      .from('bots')
      .select('id, name')
      .eq('token', token)
      .single();
      
    if (existingBot) {
      // Update existing bot
      const updateData: any = {
        name,
        platform,
        is_active: true,
        updated_at: new Date().toISOString()
      };
      
      // Only include user credentials in user mode
      if (!isAdminMode && userCredentials) {
        updateData.user_credentials = userCredentials;
      }
      
      const { data: updatedBot, error: updateError } = await supabase
        .from('bots')
        .update(updateData)
        .eq('id', existingBot.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('[SIMPLE REGISTER] Error updating bot:', updateError);
        return NextResponse.json(
          { error: 'Failed to update bot information' },
          { status: 500 }
        );
      }
      
      // Register the bot in the registry for faster webhook routing
      await registerBotInBotRegistry(token, isAdminMode, userCredentials);
      
      return NextResponse.json({ 
        success: true, 
        bot: updatedBot,
        status: 'updated'
      });
    }
    
    // Create new bot
    const insertData: any = {
      name,
      platform,
      token,
      is_active: true
    };
    
    // Only include user credentials in user mode
    if (!isAdminMode && userCredentials) {
      insertData.user_credentials = userCredentials;
    }
    
    const { data: newBot, error: insertError } = await supabase
      .from('bots')
      .insert(insertData)
      .select()
      .single();
      
    if (insertError) {
      console.error('[SIMPLE REGISTER] Error inserting bot:', insertError);
      return NextResponse.json(
        { error: 'Failed to create bot' },
        { status: 500 }
      );
    }
    
    // Register the bot in the registry for faster webhook routing
    await registerBotInBotRegistry(token, isAdminMode, userCredentials);
    
    return NextResponse.json({ 
      success: true, 
      bot: newBot,
      status: 'created'
    });
    
  } catch (error: any) {
    console.error('[SIMPLE REGISTER] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}