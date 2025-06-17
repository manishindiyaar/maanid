import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from './types';
import { decryptCredentials } from '../utils/encryption';

type SupabaseClientMode = 'ADMIN' | 'USER';

interface SupabaseClientOptions {
  forceAdmin?: boolean;
  forceUser?: boolean;
  requestHeaders?: Headers;
}




//This Function is best Modular and Modest

/**
 * Get a Supabase client based on mode (ADMIN or USER)
 * HYBRID APPROACH:
 * 1. First tries to use cookies (for backward compatibility)
 * 2. If cookies fail, uses secure session-based auth
 * 3. Fetches user credentials from database when needed
 * 
 * @param options Configuration options for the client
 * @returns Supabase client with the appropriate credentials
 */
export async function getSupabaseClient(options: SupabaseClientOptions = {}) {
  const { forceAdmin, forceUser, requestHeaders } = options;
  const cookieStore = cookies();
  
  let mode: SupabaseClientMode;
  let supabaseClient = null;

  // Determine mode based on options or auto-detect
  if (forceAdmin) {
    mode = 'ADMIN';
  } else if (forceUser) {
    mode = 'USER';
  } else {
    // Auto mode: check for user credentials in cookies
    // Look for legacy Supabase credentials cookies (supabase_url & supabase_anon_key)
    const userUrl = cookieStore.get('supabase_url')?.value;
    const userKey = cookieStore.get('supabase_anon_key')?.value;

    if (userUrl && userKey) {
      mode = 'USER';
    } else {
      mode = 'ADMIN';
    }
  }

  // // Check for webhook or bot credentials first
  // if (requestHeaders) {
  //   const isWebhook = isWebhookRequest(requestHeaders);
    
  //   if (isWebhook) {
  //     console.log('🤖 Webhook request detected');
  //     const token = getBotTokenFromRequest(requestHeaders);
      
  //     if (token) {
  //       console.log(`🔑 Found token: ${token.substring(0, 8)}...`);
        
  //       // Create admin client to query the database
  //       const adminClient = createAdminClient();
        
  //       try {
  //         // Check if this bot exists in admin database
  //         const { data: adminBot, error: adminBotError } = await adminClient
  //           .from('bots')
  //           .select('id, name')
  //           .eq('token', token)
  //           .eq('is_active', true)
  //           .maybeSingle();
            
  //         if (adminBot && !adminBotError) {
  //           console.log(`✅ Found bot "${adminBot.name}" in admin database`);
  //           return adminClient;
  //         }
          
  //         // Try to find user_credentials linked to this bot
  //         const { data: bot, error: botError } = await adminClient
  //           .from('bots')
  //           .select('user_credentials, name')
  //           .eq('token', token)
  //           .maybeSingle();
            
  //         if (bot?.user_credentials) {
  //           try {
  //             // Decrypt and use stored credentials
  //             const credentials = decryptCredentials(bot.user_credentials);
              
  //             if (credentials?.supabase_url && credentials?.supabase_anon_key) {
  //               console.log(`✅ Using stored credentials for bot "${bot.name}"`);
  //               return createClient<Database>(
  //                 credentials.supabase_url,
  //                 credentials.supabase_anon_key,
  //                 {
  //                   auth: {
  //                     autoRefreshToken: false,
  //                     persistSession: false
  //                   }
  //                 }
  //               );
  //             }
  //           } catch (decryptError) {
  //             console.error('❌ Failed to decrypt bot credentials:', decryptError);
  //           }
  //         }
          
  //         // If we still don't have credentials, search all users
  //         console.log('🔍 Bot credentials not found directly. Searching user databases...');
          
  //         try {
  //           // Find users with stored credentials
  //           const { data: users } = await adminClient
  //             .from('users')
  //             .select('id, email, credentials')
  //             .not('credentials', 'is', null)
  //             .limit(10);  // Limit search to reasonable number
              
  //           if (users && users.length > 0) {
  //             console.log(`🔍 Checking ${users.length} user databases...`);
              
  //             for (const user of users) {
  //               if (!user.credentials) continue;
                
  //               try {
  //                 // Decrypt credentials if needed
  //                 let credentials = user.credentials;
  //                 if (credentials._encrypted) {
  //                   try {
  //                     credentials = decryptCredentials(credentials);
  //                   } catch (decryptError) {
  //                     console.warn(`⚠️ Failed to decrypt credentials for user ${user.id}:`, decryptError);
  //                     continue;
  //                   }
  //                 }
                  
  //                 // Skip if missing required fields
  //                 if (!credentials.supabase_url || !credentials.supabase_anon_key) {
  //                   continue;
  //                 }
                  
  //                 // Create client
  //                 const tempClient = createClient<Database>(
  //                   credentials.supabase_url,
  //                   credentials.supabase_anon_key,
  //                   { auth: { autoRefreshToken: false, persistSession: false }}
  //                 );
                  
  //                 // Check if bot exists in this user's database
  //                 const { data: userBot } = await tempClient
  //                   .from('bots')
  //                   .select('id, name')
  //                   .eq('token', token)
  //                   .eq('is_active', true)
  //                   .maybeSingle();
                    
  //                 if (userBot) {
  //                   console.log(`✅ Found bot in user database: ${user.email}`);
                    
  //                   // Store the credentials in the bot record for faster lookup next time
  //                   try {
  //                     await adminClient
  //                       .from('bots')
  //                       .update({ user_credentials: user.credentials })
  //                       .eq('token', token);
  //                     console.log('✅ Updated bot record with user credentials for faster lookup next time');
  //                   } catch (updateError) {
  //                     console.warn('⚠️ Could not update bot record with credentials:', updateError);
  //                   }
                    
  //                   // Return the client
  //                   return tempClient;
  //                 }
  //               } catch (userCheckError) {
  //                 console.warn(`⚠️ Error checking user database:`, userCheckError);
  //               }
  //             }
  //           }
  //         } catch (searchError) {
  //           console.error('❌ Error searching for bot in user databases:', searchError);
  //         }
          
  //         // Fallback to admin client for webhook requests
  //         console.log('⚠️ No matching user found for this bot - defaulting to ADMIN MODE');
  //         return adminClient;
  //       } catch (error) {
  //         console.error('❌ Error handling webhook request:', error);
  //         return adminClient;
  //       }
  //     }
  //   }
  // }

  // STEP 1: Try cookies first (original approach for backward compatibility)
  if (mode === 'USER') {
    const url = cookieStore.get('supabase_url')?.value;
    const key = cookieStore.get('supabase_anon_key')?.value;

    if (url && key) {
      try {
        console.log('👤 Using USER MODE with cookie credentials');
        return createClient<Database>(url, key, {
          auth: {
            autoRefreshToken: true,
            persistSession: true
          }
        });
      } catch (error) {
        console.warn('⚠️ Failed to create client with cookie credentials:', error);
        // Will fall through to session-based approach
      }
    }
  }

  // STEP 2: If cookies didn't work or aren't available, use session-based approach
  
  // Get session cookie and extract user info
  const sessionToken = cookieStore.get('session_token')?.value;
  const sessionData = sessionToken ? await verifySessionToken(sessionToken) : null;
  
  if (sessionData) {
    if (sessionData.role === 'admin' || mode === 'ADMIN') {
      // ADMIN MODE: Use environment variables
      console.log('👑 Using ADMIN MODE with environment variables (from session)');
      return createAdminClient();
    } else {
      // USER MODE: Fetch stored credentials from database
      console.log('👤 Using USER MODE with database credentials (from session)');
      try {
        const adminClient = createAdminClient();
        const { data: user } = await adminClient
          .from('users')
          .select('credentials')
          .eq('id', sessionData.userId)
          .single();

        if (user?.credentials) {
          const credentials = decryptCredentials(user.credentials);
          
          if (credentials?.supabase_url && credentials?.supabase_anon_key) {
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
        }
      } catch (error) {
        console.error('❌ Failed to get user credentials from database:', error);
      }
    }
  }
  
  // STEP 3: Final fallback: use environment mode based on earlier determination
  if (mode === 'ADMIN') {
    console.log('👑 Using ADMIN MODE with environment variables (fallback)');
    return createAdminClient();
  } else {
    // We've tried everything for USER mode and failed
    console.error('❌ Could not determine USER credentials after multiple attempts');
    throw new Error('User credentials not found');
  }
}

/**
 * Creates a Supabase client using admin credentials
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing admin Supabase credentials in environment variables');
  }
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

/**
 * Verify and decode session token - you'll need to implement this 
 * based on your chosen auth system (NextAuth.js, etc.)
 */
async function verifySessionToken(token: string): Promise<{userId: string, role: 'user' | 'admin'} | null> {
  try {
    // This is a placeholder. Implement actual verification based on your chosen auth system.
    // For NextAuth: const session = await getServerSession(authOptions);
    // For custom JWT: const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Call your auth verification service
    const response = await fetch('/api/auth/verify-session', {
      headers: {
        'Cookie': `session_token=${token}`
      }
    });
    
    if (!response.ok) return null;
    
    // Return session data with user ID and role
    const data = await response.json();
    return {
      userId: data.userId,
      role: data.role
    };
  } catch (error) {
    console.error('❌ Failed to verify session token:', error);
    return null;
  }
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