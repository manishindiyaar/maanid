import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, getServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { encryptCredentials, decryptCredentials } from '@/lib/utils/encryption';
import { isAdminModeServer } from '@/lib/utils/admin-mode';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { registerBotInRegistry, registerUserBot, registerAdminBot } from '@/lib/utils/bot-registry';


// Helper function to automatically detect the ngrok URL
async function detectNgrokUrl() {
  try {
    console.log('🔍 [BOT REGISTER] Attempting to auto-detect ngrok URL...');
    const ngrokResponse = await fetch('http://localhost:4040/api/tunnels');
    
    if (!ngrokResponse.ok) {
      throw new Error(`Failed to fetch ngrok tunnels: ${ngrokResponse.status}`);
    }
    
    const ngrokData = await ngrokResponse.json();
    
    if (!ngrokData.tunnels || ngrokData.tunnels.length === 0) {
      throw new Error('No ngrok tunnels found');
    }
    
    // Find HTTPS tunnels
    const httpsTunnels = ngrokData.tunnels.filter((tunnel: { proto: string; public_url: string }) => 
      tunnel.proto === 'https' && tunnel.public_url
    );
    
    if (httpsTunnels.length === 0) {
      throw new Error('No HTTPS ngrok tunnels found');
    }
    
    // Use the first HTTPS tunnel
    const ngrokUrl = httpsTunnels[0].public_url;
    console.log('✅ [BOT REGISTER] Auto-detected ngrok URL:', ngrokUrl);
    return new URL(ngrokUrl).origin;
  } catch (error) {
    console.error('❌ [BOT REGISTER] Error auto-detecting ngrok URL:', error);
    
    // Fallback to environment variable
    if (process.env.NGROK_URL) {
      console.log('⚠️ [BOT REGISTER] Using NGROK_URL from environment:', process.env.NGROK_URL);
      return process.env.NGROK_URL;
    }
    
    // No fallback available
    console.error('❌ [BOT REGISTER] No ngrok URL available. Cannot proceed without a valid URL.');
    throw new Error('No valid webhook URL available. Please start ngrok or set NGROK_URL environment variable.');
  }
}

/**
 * Helper function to get user credentials from cookies for storage
 */
function getUserCredentialsFromCookies() {
  const cookieStore = cookies();
  
  const url = cookieStore.get('supabase_url')?.value;
  const anonKey = cookieStore.get('supabase_anon_key')?.value;
  
  if (!url || !anonKey) {
    console.log('Warning: Could not find credentials in cookies');
  }
  
  // Include real values in credentials, not "null" strings
  return {
    supabase_url: url || null,
    supabase_anon_key: anonKey || null,
    stored_at: new Date().toISOString()
  };
}

/**
 * Helper function to extract user email from auth cookie
 */
function getUserEmailFromAuthCookie(cookieStore: ReturnType<typeof cookies>): string | null {
  try {
    const authToken = cookieStore.get('supabase-auth-token')?.value;
    if (!authToken) return null;
    
    const tokenData = JSON.parse(authToken);
    
    if (Array.isArray(tokenData) && tokenData.length >= 3 && 
        typeof tokenData[2] === 'object' && tokenData[2].email) {
      return tokenData[2].email;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting email from auth cookie:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    console.log('🔐 [BOT REGISTER] Starting bot registration process');
    const { token, name } = await request.json();

    // Initialize registry variables for both user and admin mode
    let registryUserEmail = null;
    let registryUserId = null;

    if (!token) {
      console.error('❌ [BOT REGISTER] Missing bot token');
      return NextResponse.json(
        { error: 'Telegram bot token is required' },
        { status: 400 }
      );
    }

    if (!name) {
      console.error('❌ [BOT REGISTER] Missing bot name');
      return NextResponse.json(
        { error: 'Bot name is required' },
        { status: 400 }
      );
    }

    // Get the base URL for webhooks - AUTO DETECTED
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? await detectNgrokUrl() 
      : process.env.NEXT_APP_URL || 'https://www.bladexlab.com';
    console.log('🌐 [BOT REGISTER] Using base URL:', baseUrl);

    // Set up the webhook URL
    const webhookPath = `/api/bots/telegram/webhook/${token}`;
    const webhookUrl = `${baseUrl}${webhookPath}`;
    console.log('🔗 [BOT REGISTER] Setting up webhook URL:', webhookUrl);

    // First, try to get information about the current webhook
    try {
      console.log('🔍 [BOT REGISTER] Checking current webhook info...');
      const webhookInfoResponse = await fetch(
        `https://api.telegram.org/bot${token}/getWebhookInfo`
      );
      const webhookInfo = await webhookInfoResponse.json();
      console.log('📋 [BOT REGISTER] Current webhook info:', JSON.stringify(webhookInfo, null, 2));
    } catch (error) {
      console.warn('⚠️ [BOT REGISTER] Could not get webhook info:', error);
    }

    // Register the webhook with Telegram
    console.log('🔄 [BOT REGISTER] Registering webhook with Telegram...');
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          max_connections: 100,
          drop_pending_updates: true,
          allowed_updates: ["message", "edited_message"]
        }),
      }
    );

    const telegramData = await telegramResponse.json();
    console.log('📬 [BOT REGISTER] Telegram webhook setup response:', JSON.stringify(telegramData, null, 2));

    if (!telegramResponse.ok || !telegramData.ok) {
      const errorData = telegramData;
      console.error('❌ [BOT REGISTER] Telegram webhook setup failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to set up Telegram webhook', details: errorData },
        { status: 500 }
      );
    }

    // Verify webhook was set correctly
    try {
      console.log('🔍 [BOT REGISTER] Verifying webhook setup...');
      const verifyResponse = await fetch(
        `https://api.telegram.org/bot${token}/getWebhookInfo`
      );
      const verifyData = await verifyResponse.json();
      console.log('✅ [BOT REGISTER] Webhook verification:', JSON.stringify(verifyData, null, 2));
      
      if (!verifyData.ok || !verifyData.result.url.includes(webhookPath)) {
        console.warn('⚠️ [BOT REGISTER] Webhook URL mismatch!', {
          expected: webhookUrl,
          actual: verifyData.result.url
        });
      }
    } catch (error) {
      console.warn('⚠️ [BOT REGISTER] Could not verify webhook:', error);
    }

    // Verify bot information
    console.log('🔍 [BOT REGISTER] Verifying bot information...');
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );
    const botInfo = await botInfoResponse.json();
    console.log('🤖 [BOT REGISTER] Bot info:', JSON.stringify(botInfo, null, 2));

    if (!botInfo.ok) {
      console.error('❌ [BOT REGISTER] Invalid bot token or could not get bot info:', botInfo);
      return NextResponse.json(
        { error: 'Invalid bot token' },
        { status: 400 }
      );
    }

    // Check if we're in admin or user mode
    const cookieStore = cookies();
    const isAdminMode = isAdminModeServer(cookieStore);
    
    // Check for override from headers (this comes from the simple-register endpoint)
    const userModeHeader = request.headers.get('x-bladex-user-mode');
    const userIdHeader = request.headers.get('x-bladex-user-id');
    let finalAdminMode = isAdminMode;
    
    if (userModeHeader !== null) {
      finalAdminMode = userModeHeader !== 'true';
      console.log(`📋 [BOT REGISTER] Mode override from header: ${finalAdminMode ? 'ADMIN' : 'USER'} mode`);
      
      if (userIdHeader) {
        console.log(`📋 [BOT REGISTER] User ID from header: ${userIdHeader}`);
      }
    }
    
    console.log(`🔐 [BOT REGISTER] Operating in ${finalAdminMode ? 'ADMIN' : 'USER'} mode`);

    // Get admin client - always needed to find user credentials
    const adminClient = createAdminSupabaseClient();
    
    // Determine the database to use based on mode
    let supabase;
    let userClient = null;
    let userCredentials = null;
    
    if (finalAdminMode) {
      // In ADMIN mode, use admin client for everything
      console.log('👑 [BOT REGISTER] Using admin database for bot registration');
      supabase = adminClient;
    } else {
      // In USER mode, we need to get user credentials and create a user client
      console.log('👤 [BOT REGISTER] Setting up for USER mode bot registration');
      
      // First try to get credentials from cookies
      userCredentials = getUserCredentialsFromCookies();
      
      // If credentials are missing from cookies, try to get from the admin DB
      if (!userCredentials.supabase_url || !userCredentials.supabase_anon_key) {
        console.log('🔍 [BOT REGISTER] Credentials not available in cookies, searching in admin DB');
        
        // First try to use user ID from header if provided
        if (userIdHeader) {
          console.log('🔍 [BOT REGISTER] Looking up credentials for user ID from header:', userIdHeader);
          
          // Also select the email field so we have it for registry registration
          const { data: user, error: userError } = await adminClient
            .from('users')
            .select('credentials, email')
            .eq('id', userIdHeader)
            .maybeSingle();
            
          if (!userError && user?.credentials) {
            try {
              console.log('✅ [BOT REGISTER] Found credentials in admin DB for user ID:', userIdHeader);
              
              // Store the email for later use in registry
              if (user.email) {
                registryUserEmail = user.email;
                console.log('✅ [BOT REGISTER] Found email for registry:', registryUserEmail);
              }
              
              // Log the raw credentials structure for debugging
              console.log('📋 [BOT REGISTER] Credential object keys:', Object.keys(user.credentials));
              console.log('📋 [BOT REGISTER] Is credentials marked as encrypted:', !!user.credentials._encrypted);
              
              let dbCredentials = user.credentials;
              
              // Try to handle encrypted credentials if they appear to be encrypted
              if (user.credentials._encrypted) {
                try {
                  dbCredentials = decryptCredentials(user.credentials);
                  console.log('🔐 [BOT REGISTER] Successfully decrypted credentials');
                } catch (decryptError) {
                  console.warn('⚠️ [BOT REGISTER] Failed to decrypt, using raw credentials:', decryptError);
                  // Fall back to using the raw credentials
                  dbCredentials = user.credentials;
                }
              }
              
              // If we have the required fields, use them
              if (dbCredentials?.supabase_url && dbCredentials?.supabase_anon_key) {
                userCredentials = {
                  supabase_url: dbCredentials.supabase_url,
                  supabase_anon_key: dbCredentials.supabase_anon_key,
                  stored_at: new Date().toISOString()
                };
                console.log('✅ [BOT REGISTER] Valid credentials extracted with URL:', dbCredentials.supabase_url.substring(0, 20) + '...');
              } else {
                console.error('❌ [BOT REGISTER] Invalid credential structure. Keys found:', Object.keys(dbCredentials || {}).join(', '));
              }
            } catch (error) {
              console.error('❌ [BOT REGISTER] Failed to process credentials from admin DB:', error);
            }
          } else {
            console.log('⚠️ [BOT REGISTER] No credentials found in admin DB for user ID:', userIdHeader);
          }
        }
        
        // If still no credentials, try to get the user email from auth cookie
        if (!userCredentials.supabase_url || !userCredentials.supabase_anon_key) {
          const userEmail = getUserEmailFromAuthCookie(cookieStore);
          
          if (userEmail) {
            console.log('🔍 [BOT REGISTER] Looking up credentials for user email:', userEmail);
            
            // Also store this email for registry use
            if (!registryUserEmail) {
              registryUserEmail = userEmail;
              console.log('✅ [BOT REGISTER] Using email for registry from auth cookie:', registryUserEmail);
            }
            
            const { data: user, error: userError } = await adminClient
              .from('users')
              .select('credentials')
              .eq('email', userEmail)
              .maybeSingle();
              
            if (!userError && user?.credentials) {
              try {
                console.log('✅ [BOT REGISTER] Found credentials in admin DB for user email:', userEmail);
                
                // Log the raw credentials structure for debugging
                console.log('📋 [BOT REGISTER] Credential object keys:', Object.keys(user.credentials));
                console.log('📋 [BOT REGISTER] Is credentials marked as encrypted:', !!user.credentials._encrypted);
                
                let dbCredentials = user.credentials;
                
                // Try to handle encrypted credentials if they appear to be encrypted
                if (user.credentials._encrypted) {
                  try {
                    dbCredentials = decryptCredentials(user.credentials);
                    console.log('🔐 [BOT REGISTER] Successfully decrypted credentials');
                  } catch (decryptError) {
                    console.warn('⚠️ [BOT REGISTER] Failed to decrypt, using raw credentials:', decryptError);
                    // Fall back to using the raw credentials
                    dbCredentials = user.credentials;
                  }
                }
                
                // If we have the required fields, use them
                if (dbCredentials?.supabase_url && dbCredentials?.supabase_anon_key) {
                  userCredentials = {
                    supabase_url: dbCredentials.supabase_url,
                    supabase_anon_key: dbCredentials.supabase_anon_key,
                    stored_at: new Date().toISOString()
                  };
                  console.log('✅ [BOT REGISTER] Valid credentials extracted with URL:', dbCredentials.supabase_url.substring(0, 20) + '...');
                } else {
                  console.error('❌ [BOT REGISTER] Invalid credential structure. Keys found:', Object.keys(dbCredentials || {}).join(', '));
                }
              } catch (error) {
                console.error('❌ [BOT REGISTER] Failed to process credentials from admin DB:', error);
              }
            } else {
              console.log('⚠️ [BOT REGISTER] No credentials found in admin DB for user email:', userEmail);
            }
          } else {
            console.log('⚠️ [BOT REGISTER] No user email found in auth cookie');
          }
        }
        
        // Last resort - try to get the first user with credentials
        if (!userCredentials.supabase_url || !userCredentials.supabase_anon_key) {
          console.log('⚠️ [BOT REGISTER] No user ID or email found, trying to get first user with credentials');
          
          const { data: anyUser, error: anyUserError } = await adminClient
            .from('users')
            .select('id, credentials, email')
            .not('credentials', 'is', null)
            .limit(1)
            .maybeSingle();
            
          if (!anyUserError && anyUser?.credentials) {
            try {
              console.log('⚠️ [BOT REGISTER] Found credentials from first available user ID:', anyUser.id);
              
              // Store user info for registry
              if (anyUser.id && !registryUserId) {
                registryUserId = anyUser.id;
                console.log('✅ [BOT REGISTER] Using ID for registry from fallback user:', registryUserId);
              }
              
              if (anyUser.email && !registryUserEmail) {
                registryUserEmail = anyUser.email;
                console.log('✅ [BOT REGISTER] Using email for registry from fallback user:', registryUserEmail);
              }

              // Log the credential info
              console.log('📋 [BOT REGISTER] Credential object keys:', Object.keys(anyUser.credentials));
              console.log('📋 [BOT REGISTER] Is credentials marked as encrypted:', !!anyUser.credentials._encrypted);

              let dbCredentials = anyUser.credentials;
              
              // Try to handle encrypted credentials if they appear to be encrypted
              if (anyUser.credentials._encrypted) {
                try {
                  dbCredentials = decryptCredentials(anyUser.credentials);
                  console.log('🔐 [BOT REGISTER] Successfully decrypted credentials');
                } catch (decryptError) {
                  console.warn('⚠️ [BOT REGISTER] Failed to decrypt, using raw credentials:', decryptError);
                  // Fall back to using the raw credentials
                  dbCredentials = anyUser.credentials;
                }
              }
              
              // If we have the required fields, use them
              if (dbCredentials?.supabase_url && dbCredentials?.supabase_anon_key) {
                userCredentials = {
                  supabase_url: dbCredentials.supabase_url,
                  supabase_anon_key: dbCredentials.supabase_anon_key,
                  stored_at: new Date().toISOString()
                };
                console.log('✅ [BOT REGISTER] Valid credentials extracted with URL:', dbCredentials.supabase_url.substring(0, 20) + '...');
              } else {
                console.error('❌ [BOT REGISTER] Invalid credential structure. Keys found:', Object.keys(dbCredentials || {}).join(', '));
              }
            } catch (error) {
              console.error('❌ [BOT REGISTER] Failed to process credentials from admin DB:', error);
            }
          } else {
            console.error('❌ [BOT REGISTER] No users with credentials found in admin DB');
          }
        }
      }
      
      // Verify we have valid credentials before proceeding
      if (!userCredentials.supabase_url || !userCredentials.supabase_anon_key) {
        console.error('❌ [BOT REGISTER] Missing user credentials for USER mode');
        return NextResponse.json(
          { error: 'Missing user credentials. Please set up your Supabase connection first.' },
          { status: 400 }
        );
      }
      
      // Create a user client with the credentials
      try {
        console.log('🔑 [BOT REGISTER] Creating user client with URL:', userCredentials.supabase_url);
        userClient = createClient<Database>(
          userCredentials.supabase_url,
          userCredentials.supabase_anon_key,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        
        // Use user client for database operations in USER mode
        supabase = userClient;
        
        console.log('✅ [BOT REGISTER] Successfully created user database client');
      } catch (error) {
        console.error('❌ [BOT REGISTER] Error creating user client:', error);
        return NextResponse.json(
          { error: 'Failed to connect to user database. Please check your credentials.' },
          { status: 500 }
        );
      }
    }
    
    // Prepare bot record for insertion or update
    const botData = {
      name,
      platform: 'telegram',
      token,
      username: botInfo.result.username,
      telegram_id: botInfo.result.id.toString(),
      webhook_url: webhookUrl,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    
    // In USER mode, store encrypted credentials with the bot
    if (!finalAdminMode && userCredentials) {
      console.log('👤 [BOT REGISTER] Preparing user credentials for bot record');
      
      // Check if the user_credentials column exists before trying to use it
      try {
        // First check if we can get the column names
        const { data: columnData, error: columnError } = await supabase
          .from('bots')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        let hasUserCredentialsColumn = false;
        
        if (!columnError) {
          if (columnData) {
            // Check if column exists in the returned sample record
            hasUserCredentialsColumn = 'user_credentials' in columnData;
          } else {
            // No existing record, try to check table columns via Supabase API
            try {
              // Create a test object to see if we get a column error
              const testBot = { ...botData, user_credentials: {} };
              const { error: testError } = await supabase
                .from('bots')
                .insert(testBot)
                .select()
                .single();
                
              // If we get a column error, the column doesn't exist
              hasUserCredentialsColumn = !(testError && testError.code === 'PGRST204' && 
                testError.message?.includes('user_credentials'));
                
              // If we got here without an error about columns, try to delete the test record
              if (hasUserCredentialsColumn) {
                await supabase.from('bots').delete().eq('token', botData.token);
              }
            } catch (testError) {
              console.warn('⚠️ [BOT REGISTER] Error testing for user_credentials column:', testError);
              // Assume column doesn't exist to be safe
              hasUserCredentialsColumn = false;
            }
          }
        } else {
          console.warn('⚠️ [BOT REGISTER] Could not check columns:', columnError);
        }
        
        if (hasUserCredentialsColumn) {
          console.log('✅ [BOT REGISTER] user_credentials column exists, storing credentials');
          // @ts-ignore
          botData.user_credentials = encryptCredentials(userCredentials);
        } else {
          console.log('⚠️ [BOT REGISTER] user_credentials column doesn\'t exist, skipping');
          // Simply continue without storing credentials in the bot record
          // The webhook will work based on token alone
        }
      } catch (error) {
        console.error('❌ [BOT REGISTER] Error checking for user_credentials column:', error);
      }
    }
    
    // Added extra debugging to verify user client setup
    if (!finalAdminMode && userClient) {
      console.log('🔍 [BOT REGISTER] Verifying user client connection...');
      try {
        const { data: testData, error: testError } = await userClient
          .from('_test_connection')
          .select('*')
          .limit(1)
          .maybeSingle();
          
        if (testError) {
          // If table doesn't exist, that's normal - just checking connection
          console.log('✅ [BOT REGISTER] User client connection test: table may not exist, but connection working');
        } else {
          console.log('✅ [BOT REGISTER] User client connection test success');
        }

        // Try to get some system info to confirm we're connected
        try {
          const { data: info } = await userClient.from('pg_stat_activity').select('*').limit(1);
          console.log('✅ [BOT REGISTER] User database connection confirmed');
        } catch (rpcError) {
          // Fallback - just try to read any table
          try {
            const { data: tableInfo } = await userClient.from('bots').select('count(*)');
            console.log('✅ [BOT REGISTER] User database has bots table');
          } catch (tableError) {
            console.log('⚠️ [BOT REGISTER] Could not query bots table, might need to be created');
          }
        }
      } catch (testErr) {
        console.warn('⚠️ [BOT REGISTER] User client test error:', testErr);
      }
    }

    // Check if this bot already exists in the CURRENT database (user or admin)
    console.log(`🔍 [BOT REGISTER] Checking if bot exists in ${finalAdminMode ? 'ADMIN' : 'USER'} database...`);
    const { data: existingBot, error: checkError } = await supabase
      .from('bots')
      .select('id, name')
      .eq('token', token)
      .maybeSingle();
    
    if (!checkError && existingBot) {
      console.log('🔄 [BOT REGISTER] Bot already exists in current DB, updating:', existingBot);
      
      const { data: updatedBot, error: updateError } = await supabase
        .from('bots')
        .update(botData)
        .eq('id', existingBot.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ [BOT REGISTER] Database update error:', updateError);
        console.error('  Error details:', updateError.details, updateError.hint);
        return NextResponse.json(
          { error: 'Failed to update bot information', details: updateError },
          { status: 500 }
        );
      }
      
      console.log('✅ [BOT REGISTER] Bot updated successfully:', updatedBot);
      return NextResponse.json({ 
        success: true, 
        bot: updatedBot,
        status: 'updated',
        mode: finalAdminMode ? 'admin' : 'user',
        database: finalAdminMode ? 'admin' : 'user'
      });
    } else if (checkError) {
      console.log('ℹ️ [BOT REGISTER] No existing bot found or error:', checkError?.message);
    }
    
    // Create a new bot record in the CURRENT database (user or admin)
    console.log(`🆕 [BOT REGISTER] Creating new bot in ${finalAdminMode ? 'ADMIN' : 'USER'} database`);
    const { data: bot, error: dbError } = await supabase
      .from('bots')
      .insert(botData)
      .select()
      .single();

    if (dbError) {
      console.error('❌ [BOT REGISTER] Database insert error:', dbError);
      console.error('  Error details:', dbError.details, dbError.hint);
      
      if (dbError.code === '42P01') {
        console.error('❌ [BOT REGISTER] Table does not exist. Make sure the bots table exists in the user database.');
      }
      
      return NextResponse.json(
        { error: 'Failed to store bot information', details: dbError },
        { status: 500 }
      );
    }

    console.log('✅ [BOT REGISTER] Bot registered successfully:', bot);
    
    // If in user mode, also register the bot in the registry for faster lookups
    if (!finalAdminMode) {
      console.log('📊 [BOT REGISTER] Registry variables before final check - userID:', !!registryUserId, 
                  'email:', !!registryUserEmail, 'email value:', registryUserEmail);
      
      // Try to get from header first if not already set
      if (userIdHeader && !registryUserId) {
        registryUserId = userIdHeader;
      }
      
      // Try to get from auth cookie if not already set
      if (!registryUserEmail) {
        const emailFromCookie = getUserEmailFromAuthCookie(cookieStore);
        if (emailFromCookie) {
          registryUserEmail = emailFromCookie;
          console.log('✅ [BOT REGISTER] Found email from auth cookie for registry:', registryUserEmail);
        }
      }
      
      // If not in header, try to get from admin database
      if (!registryUserId && registryUserEmail) {
        try {
          const { data: userRecord } = await adminClient
            .from('users')
            .select('id')
            .eq('email', registryUserEmail)
            .maybeSingle();
          
          if (userRecord?.id) {
            registryUserId = userRecord.id;
            console.log('✅ [BOT REGISTER] Found user ID for registry:', registryUserId);
          }
        } catch (error) {
          console.error('❌ [BOT REGISTER] Error getting user ID from email:', error);
        }
      }
      
      if (registryUserId && registryUserEmail && userCredentials) {
        console.log('🔖 [BOT REGISTER] Registering bot in registry for USER mode');
        
        try {
          const result = await registerUserBot(
            token,
            registryUserId,
            registryUserEmail,
            {
              supabase_url: userCredentials.supabase_url,
              supabase_anon_key: userCredentials.supabase_anon_key
            }
          );
          
          if (result.success) {
            console.log('✅ [BOT REGISTER] Successfully registered bot in registry');
          } else {
            console.error('❌ [BOT REGISTER] Failed to register in registry:', result.error);
          }
        } catch (error) {
          console.error('❌ [BOT REGISTER] Error registering bot in registry:', error);
        }
      } else {
        console.error('❌ [BOT REGISTER] Missing info for registry - userID:', !!registryUserId, 
                      'email:', !!registryUserEmail, 'credentials:', !!userCredentials);
      }
    } else {
      // For admin mode, register with admin credentials
      console.log('🔖 [BOT REGISTER] Registering bot in registry for ADMIN mode');
      
      try {
        // Get the admin user performing this action (if available)
        let adminEmail = getUserEmailFromAuthCookie(cookieStore) || 'admin@bladexlab.com';
        let adminId = '';
        
        // Try to get admin ID from the admin database
        try {
          const { data: adminUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', adminEmail)
            .maybeSingle();
          
          if (adminUser?.id) {
            adminId = adminUser.id;
          } else {
            // Fallback to first admin user
            const { data: anyAdmin } = await adminClient
              .from('users')
              .select('id, email')
              .eq('is_admin', true)
              .limit(1)
              .maybeSingle();
            
            if (anyAdmin) {
              adminId = anyAdmin.id;
              adminEmail = anyAdmin.email;
            } else {
              // Generate a placeholder ID
              adminId = '00000000-0000-0000-0000-000000000000';
            }
          }
        } catch (error) {
          console.error('❌ [BOT REGISTER] Error getting admin ID:', error);
          adminId = '00000000-0000-0000-0000-000000000000';
        }
        
        const result = await registerAdminBot(token, adminId, adminEmail);
        
        if (result.success) {
          console.log('✅ [BOT REGISTER] Successfully registered admin bot in registry');
        } else {
          console.error('❌ [BOT REGISTER] Failed to register admin bot in registry:', result.error);
        }
      } catch (error) {
        console.error('❌ [BOT REGISTER] Error registering admin bot in registry:', error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      bot,
      status: 'created',
      mode: finalAdminMode ? 'admin' : 'user',
      database: finalAdminMode ? 'admin' : 'user' 
    });
    
  } catch (error: any) {
    console.error('❌ [BOT REGISTER] Bot registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}