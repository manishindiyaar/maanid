import { cookies } from 'next/headers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decryptCredentials } from '@/lib/utils/encryption';
import { Database } from './types';

// Types
export type UserCredentials = {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key?: string;
};

export type ClientResult = {
  client: SupabaseClient<Database>;
  mode: 'ADMIN' | 'USER';
  credentials: UserCredentials;
};

/**
 * Gets the appropriate Supabase client based on the request context
 * Handles both admin mode and user mode with webhook detection
 * 
 * @param requestHeaders Optional request headers for context
 * @returns Object with client, mode, and credentials
 */
export async function getClientFromRequest(requestHeaders?: Headers): Promise<ClientResult> {
  const cookieStore = cookies();
  
  // Determine mode
  const isAdminMode = cookieStore.get('admin_mode')?.value === 'true';
  let mode: 'ADMIN' | 'USER' = isAdminMode ? 'ADMIN' : 'USER';
  
  // Initialize credentials object
  let credentials: UserCredentials = {
    supabase_url: '',
    supabase_anon_key: '',
  };
  
  let client: SupabaseClient<Database> | null = null;
  
  // Check if this is a webhook request
  const isWebhook = isWebhookRequest(requestHeaders);
  
  // For webhooks, check for bot credentials
  if (isWebhook) {
    console.log('🤖 Webhook request detected');
    
    // Try to get token from request
    const token = getBotTokenFromRequest(requestHeaders);
    
    if (token) {
      console.log(`🔑 Found token: ${token.substring(0, 8)}...`);
      
      // IMPORTANT: For webhooks, ALWAYS try admin database first
      const adminClient = createAdminClient();
      
      // First check if this bot exists in the admin database
      try {
        const { data: adminBot, error: adminBotError } = await adminClient
          .from('bots')
          .select('id, name')
          .eq('token', token as any)
          .eq('is_active', true as any)
          .maybeSingle();
          
        if (adminBot && !adminBotError) {
          console.log(`✅ Found bot "${adminBot.name}" in admin database - using ADMIN MODE`);
          // Bot exists in admin DB, so use admin client
          mode = 'ADMIN';
          credentials = getAdminCredentials();
          return { 
            client: adminClient,
            mode,
            credentials
          };
        } else {
          console.log('🔍 Bot not found in admin database, checking for user credentials');
        }
      } catch (error) {
        console.error('❌ Error checking admin database:', error);
      }
      
      // Look up bot credentials using admin client
      try {
        const { data: bot, error: botError } = await adminClient
          .from('bots')
          .select('user_credentials, name')
          .eq('token', token as any)
          .maybeSingle();
        
        if (bot && !botError && bot.user_credentials) {
          try {
            // Decrypt and use stored credentials
            const decrypted = decryptCredentials(bot.user_credentials);
            
            if (decrypted?.supabase_url && decrypted?.supabase_anon_key) {
              credentials = {
                supabase_url: decrypted.supabase_url,
                supabase_anon_key: decrypted.supabase_anon_key,
                supabase_service_role_key: decrypted.supabase_service_role_key
              };
              console.log(`✅ Using stored credentials for bot "${bot.name}" database access`);
              mode = 'USER';
              
              client = createClient<Database>(
                credentials.supabase_url,
                credentials.supabase_anon_key,
                {
                  auth: {
                    autoRefreshToken: false,
                    persistSession: false
                  }
                }
              );
              
              return { client, mode, credentials };
            }
          } catch (error) {
            console.error('❌ Failed to use bot credentials:', error);
          }
        } else {
          // If bot not found by token, search users table
          console.log('🔍 Bot credentials not found directly. Searching user databases...');

          try {
            // Find users with stored credentials
            const { data: users, error: usersError } = await adminClient
              .from('users')
              .select('id, email, credentials')
              .not('credentials', 'is', null as any)
              .limit(10);
              
            if (users && !usersError && users.length > 0) {
              console.log(`🔍 Checking ${users.length} user databases...`);
              
              for (const user of users) {
                if (!user.credentials) continue;
                
                try {
                  // Decrypt credentials if needed
                  let userCredentials = user.credentials;
                  if (userCredentials._encrypted) {
                    try {
                      userCredentials = decryptCredentials(userCredentials);
                    } catch (decryptError) {
                      console.warn(`⚠️ Failed to decrypt credentials for ${user.email}:`, decryptError);
                      continue;
                    }
                  }
                  
                  // Skip if missing required fields
                  if (!userCredentials.supabase_url || !userCredentials.supabase_anon_key) {
                    continue;
                  }
                  
                  // Create client
                  const tempClient = createClient<Database>(
                    userCredentials.supabase_url,
                    userCredentials.supabase_anon_key,
                    { auth: { autoRefreshToken: false, persistSession: false }}
                  );
                  
                  // Check if bot exists in this user's database
                  const { data: userBot, error: userBotError } = await tempClient
                    .from('bots')
                    .select('id, name')
                    .eq('token', token as any)
                    .eq('is_active', true as any)
                    .maybeSingle();
                    
                  if (userBot && !userBotError) {
                    console.log(`✅ Found bot in user database: ${user.email}`);
                    
                    // Store the credentials in the bot record for faster lookup next time
                    try {
                      await adminClient
                        .from('bots')
                        .update({ user_credentials: user.credentials })
                        .eq('token', token as any);
                      console.log('✅ Updated bot record with user credentials for faster lookup next time');
                    } catch (updateError) {
                      console.warn('⚠️ Could not update bot record with credentials:', updateError);
                    }
                    
                    // Update credentials for return
                    credentials = {
                      supabase_url: userCredentials.supabase_url,
                      supabase_anon_key: userCredentials.supabase_anon_key,
                      supabase_service_role_key: userCredentials.supabase_service_role_key
                    };
                    
                    mode = 'USER';
                    
                    // Return the client
                    return { 
                      client: tempClient,
                      mode,
                      credentials
                    };
                  }
                } catch (userCheckError) {
                  console.warn(`⚠️ Error checking user database:`, userCheckError);
                }
              }
            }
          } catch (searchError) {
            console.error('❌ Error searching for bot in user databases:', searchError);
          }
          
          console.log('⚠️ No user_credentials found for this bot');
        }
      } catch (error) {
        console.error('❌ Error looking up bot credentials:', error);
      }
    } else {
      console.log('⚠️ No token found in webhook request');
    }
    
    // IMPORTANT: If we've reached here, we couldn't get user credentials for the bot
    // In this case, if we're in admin mode, use admin credentials
    console.log('⚠️ No specific credentials found for this webhook - defaulting to ADMIN MODE');
    mode = 'ADMIN';
    credentials = getAdminCredentials();
    return { 
      client: createAdminClient(),
      mode,
      credentials 
    };
  }
  
  // ADMIN MODE: Use environment variables
  if (mode === 'ADMIN') {
    console.log('👑 Using ADMIN MODE with environment variables');
    credentials = getAdminCredentials();
    client = createAdminClient();
    return { client, mode, credentials };
  }
  
  // USER MODE: Try to use user's credentials from cookies or database
  console.log('👤 Using USER MODE with user credentials');
  
  // First try to get from cookies
  const userUrl = cookieStore.get('supabase_url')?.value;
  const userKey = cookieStore.get('supabase_anon_key')?.value;
      
  if (userUrl && userKey) {
    console.log('🔐 Using credentials from cookies');
    credentials = {
      supabase_url: userUrl,
      supabase_anon_key: userKey
    };
    
    client = createClient<Database>(
      userUrl,
      userKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      }
    );
    
    return { client, mode, credentials };
  }
  
  // If not in cookies, try to get from database
  const userEmail = getUserEmailFromAuthCookie(cookieStore);
      
  if (userEmail) {
    const adminClient = createAdminClient();
    
    try {
      const { data: user, error: userError } = await adminClient
        .from('users')
        .select('credentials')
        .eq('email', userEmail)
        .maybeSingle();
          
      if (user && !userError && user.credentials) {
        try {
          const decrypted = decryptCredentials(user.credentials);
          
          if (decrypted?.supabase_url && decrypted?.supabase_anon_key) {
            console.log('🔐 Using credentials from database');
            credentials = {
              supabase_url: decrypted.supabase_url,
              supabase_anon_key: decrypted.supabase_anon_key,
              supabase_service_role_key: decrypted.supabase_service_role_key
            };
            
            client = createClient<Database>(
              credentials.supabase_url,
              credentials.supabase_anon_key,
              {
                auth: {
                  autoRefreshToken: true,
                  persistSession: true
                }
              }
            );
            
            return { client, mode, credentials };
          }
        } catch (error) {
          console.error('❌ Failed to use database credentials:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user:', error);
    }
  }
  
  // If we reach here in USER MODE, we don't have credentials
  console.error('❌ USER MODE active but no valid credentials found');
  
  // In strict USER MODE, don't fallback to admin credentials
  // Instead, return a client that will fail gracefully
  credentials = {
    supabase_url: 'https://missing-credentials.example.com',
    supabase_anon_key: 'missing-credentials'
  };
  
  client = createClient<Database>(
    credentials.supabase_url,
    credentials.supabase_anon_key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  return { client, mode, credentials };
}

/**
 * Check if the current request is a webhook
 */
function isWebhookRequest(requestHeaders?: Headers): boolean {
  if (!requestHeaders) return false;
  
  const invokePath = requestHeaders.get('x-invoke-path') || '';
  const url = requestHeaders.get('x-url') || requestHeaders.get('referer') || '';
  
  return (
    // Check explicit webhook flag
    requestHeaders.get('x-webhook') === 'true' ||
    requestHeaders.get('x-telegram-bot-api-secret-token') !== null ||
    requestHeaders.get('x-token') !== null ||
    
    // Check path patterns
    invokePath.includes('/webhook/') || 
    invokePath.includes('/api/bots/') ||
    
    // Check URL patterns
    url.includes('/webhook/') || 
    url.includes('/api/bots/')
  );
}

/**
 * Extract bot token from request headers or paths
 */
function getBotTokenFromRequest(requestHeaders?: Headers): string | null {
  if (!requestHeaders) return null;
  
  // Check direct token header first
  const directToken = requestHeaders.get('x-token');
  if (directToken) return directToken;
  
  // Try to extract from paths
  const invokePath = requestHeaders.get('x-invoke-path') || '';
  const url = requestHeaders.get('x-url') || requestHeaders.get('referer') || '';
  
  // Common webhook path patterns
  const telegramPattern = /\/api\/bots\/telegram\/webhook\/([^\/]+)/;
  const genericPattern = /\/webhook\/([^\/]+)/;
  
  // Try matching patterns on invokePath
  let match = invokePath.match(telegramPattern) || invokePath.match(genericPattern);
  if (match && match[1]) return match[1];
  
  // Try matching patterns on URL
  match = url.match(telegramPattern) || url.match(genericPattern);
  if (match && match[1]) return match[1];
  
  return null;
}

/**
 * Creates a Supabase client using admin credentials
 */
function createAdminClient(): SupabaseClient<Database> {
  const { supabase_url, supabase_service_role_key } = getAdminCredentials();
  
  return createClient<Database>(supabase_url, supabase_service_role_key!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

/**
 * Gets admin credentials from environment variables
 */
function getAdminCredentials(): UserCredentials {
  const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase_service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabase_url || !supabase_service_role_key) {
    throw new Error('Missing admin Supabase credentials in environment variables');
  }
  
  return {
    supabase_url,
    supabase_anon_key,
    supabase_service_role_key
  };
}

/**
 * Helper function to extract the user email from the Supabase auth cookie
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

// Export compatibility functions for server.ts
/**
 * For backwards compatibility with the original getServerSupabaseClient function
 */
export async function getServerSupabaseClient(requestHeaders?: Headers): Promise<SupabaseClient<Database>> {
  const { client } = await getClientFromRequest(requestHeaders);
  return client;
}

/**
 * For backwards compatibility with the original createAdminSupabaseClient function
 */
export function createAdminSupabaseClient(): SupabaseClient<Database> {
  return createAdminClient();
}

// Export a service-role client for admin operations (for compatibility)
export const supabaseAdmin = createAdminClient(); 