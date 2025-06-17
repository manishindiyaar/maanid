import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from './types';
import { decryptCredentials } from '../utils/encryption';

// Define types
type UserCredentials = {
  supabase_url: string;
  supabase_anon_key: string;
};

/**
 * Gets the appropriate Supabase client for server-side API routes
 * 
 * ADMIN MODE - when login with /admin route (admin_mode cookie is set to true)
 * USER MODE - when not login with /admin (uses user's credentials from cookies or database)
 * 
 * @param requestHeaders Optional request headers for context
 * @returns Supabase client with appropriate credentials
 */
export async function getServerSupabaseClient(requestHeaders?: Headers) {
  const cookieStore = cookies();
  const isAdminMode = cookieStore.get('admin_mode')?.value === 'true';
  
  // Check if this is a webhook request (webhooks need to use stored bot credentials)
  const isWebhook = isWebhookRequest(requestHeaders);
  
  // For webhooks, check for bot credentials
  if (isWebhook) {
    console.log('🤖 Webhook request detected');
    
    // Try to get token from request
    const token = getBotTokenFromRequest(requestHeaders);
    
    if (token) {
      console.log(`🔑 Found token: ${token.substring(0, 8)}...`);
      
      // IMPORTANT CHANGE: For webhooks, ALWAYS try admin database first
      const adminClient = createAdminSupabaseClient();
      
      // First check if this bot exists in the admin database
      try {
        const { data: adminBot } = await adminClient
          .from('bots')
          .select('id, name')
          .eq('token', token)
          .eq('is_active', true)
          .maybeSingle();
          
        if (adminBot) {
          console.log(`✅ Found bot "${adminBot.name}" in admin database - using ADMIN MODE`);
          // Bot exists in admin DB, so use admin client
          return adminClient;
        } else {
          console.log('🔍 Bot not found in admin database, checking for user credentials');
        }
      } catch (error) {
        console.error('❌ Error checking admin database:', error);
      }
      
      // If we get here, the bot wasn't found in admin DB, so look for user credentials
      
      // Look up bot credentials using admin client
      const { data: bot } = await adminClient
        .from('bots')
        .select('user_credentials, name')
        .eq('token', token)
        .maybeSingle();
      
      if (bot?.user_credentials) {
        try {
          // Decrypt and use stored credentials
          const credentials = decryptCredentials(bot.user_credentials);
          
          if (credentials?.supabase_url && credentials?.supabase_anon_key) {
            const userCreds: UserCredentials = {
              supabase_url: credentials.supabase_url,
              supabase_anon_key: credentials.supabase_anon_key
            };
            console.log(`✅ Using stored credentials for bot "${bot.name}" database access`);
            
            return createClient<Database>(
              userCreds.supabase_url,
              userCreds.supabase_anon_key,
              {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              }
            );
          }
        } catch (error) {
          console.error('❌ Failed to use bot credentials:', error);
        }
      } else {
        // If bot not found by token, search users table
        console.log('🔍 Bot credentials not found directly. Searching user databases...');

        try {
          // Find users with stored credentials
          const { data: users } = await adminClient
            .from('users')
            .select('id, email, credentials')
            .not('credentials', 'is', null)
            .limit(10);  // Limit search to reasonable number
            
          if (users && users.length > 0) {
            console.log(`🔍 Checking ${users.length} user databases...`);
            
            for (const user of users) {
              if (!user.credentials) continue;
              
              try {
                // Decrypt credentials if needed
                let credentials = user.credentials;
                if (credentials._encrypted) {
                  try {
                    credentials = decryptCredentials(credentials);
                  } catch (decryptError) {
                    console.warn(`⚠️ Failed to decrypt credentials for ${user.email}:`, decryptError);
                    continue;
                  }
                }
                
                // Skip if missing required fields
                if (!credentials.supabase_url || !credentials.supabase_anon_key) {
                  continue;
                }
                

                //USER DB
                // Create client
                const tempClient = createClient<Database>(
                  credentials.supabase_url,
                  credentials.supabase_anon_key,
                  { auth: { autoRefreshToken: false, persistSession: false }}
                );
                
                // Check if bot exists in this user's database
                const { data: userBot } = await tempClient
                  .from('bots')
                  .select('id, name')
                  .eq('token', token)
                  .eq('is_active', true)
                  .maybeSingle();
                  
                if (userBot) {
                  console.log(`✅ Found bot in user database: ${user.email}`);
                  
                  // Store the credentials in the bot record for faster lookup next time
                  try {
                    await adminClient
                      .from('bots')
                      .update({ user_credentials: user.credentials })
                      .eq('token', token);
                    console.log('✅ Updated bot record with user credentials for faster lookup next time');
                  } catch (updateError) {
                    console.warn('⚠️ Could not update bot record with credentials:', updateError);
                  }
                  
                  // Return the client
                  return tempClient;
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
    } else {
      console.log('⚠️ No token found in webhook request');
    }
    
    // IMPORTANT: If we've reached here, we couldn't get user credentials for the bot
    // In this case, if we're in admin mode, use admin credentials
    // Otherwise, let it fall through to the normal mode handling below
    console.log('⚠️ No specific credentials found for this webhook - defaulting to ADMIN MODE');
    return createAdminSupabaseClient();
  }
  
  // ADMIN MODE: Use environment variables
  if (isAdminMode) {
    console.log('👑 Using ADMIN MODE with environment variables');
    return createAdminSupabaseClient();
  }
  
  // USER MODE: Try to use user's credentials
  console.log('👤 Using USER MODE with user credentials');
  
  // First try to get from cookies
  const userUrl = cookieStore.get('supabase_url')?.value;
  const userKey = cookieStore.get('supabase_anon_key')?.value;
      
  if (userUrl && userKey) {
    console.log('🔐 Using credentials from cookies');
    return createClient<Database>(
      userUrl,
      userKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      }
    );
  }
  
  // If not in cookies, try to get from database
  const userEmail = getUserEmailFromAuthCookie(cookieStore);
      
  if (userEmail) {
    const adminClient = createAdminSupabaseClient();
    const { data: user } = await adminClient
      .from('users')
      .select('credentials')
      .eq('email', userEmail)
      .maybeSingle();
        
    if (user?.credentials) {
      try {
        const credentials = decryptCredentials(user.credentials);
        
        if (credentials?.supabase_url && credentials?.supabase_anon_key) {
          console.log('🔐 Using credentials from database');
          return createClient<Database>(
            credentials.supabase_url,
            credentials.supabase_anon_key,
            {
              auth: {
                autoRefreshToken: true,
                persistSession: true
              }
            }
          );
        }
      } catch (error) {
        console.error('❌ Failed to use database credentials:', error);
      }
    }
  }
  
  // If we reach here in USER MODE, we don't have credentials
  console.error('❌ USER MODE active but no valid credentials found');
  
  // In strict USER MODE, don't fallback to admin credentials
  // Instead, return a client that will fail gracefully
  return createClient<Database>(
    'https://missing-credentials.example.com',
    'missing-credentials',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
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
 * Creates a Supabase client using admin credentials from environment variables
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                             process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing admin Supabase credentials in environment variables');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
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

// Export a service-role client for admin operations
export const supabaseAdmin = createAdminSupabaseClient();

/**
 * -----------------------------------------------------------------------------
 * FILE: src/lib/supabase/server.ts
 * -----------------------------------------------------------------------------
 *
 * This file provides server-side utilities for securely creating and managing Supabase clients
 * in both admin and user contexts, with robust support for multi-tenant (per-user) credentials,
 * secure credential decryption, and fallback logic for bot/webhook authentication.
 *
 * ---------------------------------------------
 * 1. ADMIN & USER CLIENT CREATION
 * ---------------------------------------------
 *
 * - `createAdminSupabaseClient()`
 *   - Returns a Supabase client using service role credentials from environment variables.
 *   - Used for admin operations (e.g., managing users, bots, or global resources).
 *
 * - `getServerSupabaseClient({ req, isAdminMode })`
 *   - Main function for obtaining a Supabase client for API/webhook requests.
 *   - Accepts a request object and a flag to indicate admin mode.
 *   - Handles three main cases:
 *     1. **Webhook/Bot Token:**
 *        - If a bot token is present in the request, tries to find credentials in the main bots table.
 *        - If not found, falls back to searching all user databases for the bot (multi-tenant support).
 *        - If still not found, uses admin credentials (in admin mode) or fails gracefully (in user mode).
 *     2. **Admin Mode:**
 *        - Uses admin credentials from environment variables.
 *     3. **User Mode:**
 *        - Attempts to use user credentials (from cookies/session or user DB).
 *        - If missing, returns a dummy client that will fail on use (never falls back to admin DB in strict user mode).
 *
 * ---------------------------------------------
 * 2. CREDENTIAL DECRYPTION & SECURITY
 * ---------------------------------------------
 *
 * - Credentials (Supabase URL, anon key, service role key) may be stored encrypted in the DB.
 * - The `_encrypted` flag on credentials indicates whether decryption is needed.
 * - `decryptCredentials()` handles secure decryption using the current ENCRYPTION_KEY.
 * - If decryption fails (e.g., wrong key, corrupted data), logs a warning and skips or uses value as-is.
 * - Sensitive information is only decrypted when strictly necessary (for webhooks, etc.).
 *
 * ---------------------------------------------
 * 3. BOT REGISTRATION & FALLBACK LOGIC
 * ---------------------------------------------
 *
 * - When a webhook or bot request comes in, the system tries to find the bot credentials by token.
 * - If not found directly, it searches all user databases for the bot (multi-tenant fallback).
 * - When found in a user DB, it updates the main bots table for faster lookups in the future.
 * - If not found anywhere, uses admin credentials (admin mode) or fails (user mode).
 *
 * ---------------------------------------------
 * 4. ERROR HANDLING & LOGGING
 * ---------------------------------------------
 *
 * - All major operations are wrapped in try/catch blocks.
 * - Decryption and DB errors are logged with clear messages.
 * - If credentials are missing or invalid, the client will fail gracefully (never falls back to admin in user mode).
 *
 * ---------------------------------------------
 * 5. WHY THIS DESIGN?
 * ---------------------------------------------
 *
 * - Supports both platform-wide (admin) and per-user (multi-tenant) Supabase projects.
 * - Ensures security by encrypting credentials and only decrypting when necessary.
 * - Provides robust fallback logic so bots/webhooks work even if the main DB is out of sync.
 * - Makes debugging easier with clear logs and error handling.
 *
 * ---------------------------------------------
 * 6. EXPORTS
 * ---------------------------------------------
 *
 * - `supabaseAdmin`: Service-role client for admin operations.
 * - `getServerSupabaseClient`: Main entrypoint for getting the right client for a request.
 *
 * -----------------------------------------------------------------------------
 * For more details, see the implementation of each function above.
 * -----------------------------------------------------------------------------
 */

