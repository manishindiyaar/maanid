import { NextResponse } from 'next/server';
import { getServerSupabaseClient, createAdminSupabaseClient } from './../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { decryptCredentials } from './../../../lib/utils/encryption';
import { cookies } from 'next/headers';
import { isDuplicateMessage, markMessageAsSent } from './../../../lib/message/deduplicationService';

// Keep track of recently processed message operations (as a backup to the main deduplication service)
const recentProcessedOperations = new Map<string, number>();

// Helper function to automatically detect the ngrok URL
async function detectNgrokUrl(): Promise<string> {
  try {
    console.log('🔍 [EXECUTE-ACTION] Attempting to auto-detect ngrok URL...');
    const ngrokResponse = await fetch('http://localhost:4040/api/tunnels');
    
    if (!ngrokResponse.ok) {
      throw new Error(`Failed to fetch ngrok tunnels: ${ngrokResponse.status}`);
    }
    
    const ngrokData = await ngrokResponse.json();
    
    if (!ngrokData.tunnels || ngrokData.tunnels.length === 0) {
      throw new Error('No ngrok tunnels found');
    }
    
    // Find HTTPS tunnels
    const httpsTunnels = ngrokData.tunnels.filter(
      (tunnel: { proto: string; public_url: string }) => 
        tunnel.proto === 'https' && tunnel.public_url
    );
    
    if (httpsTunnels.length === 0) {
      throw new Error('No HTTPS ngrok tunnels found');
    }
    
    // Use the first HTTPS tunnel
    const ngrokUrl = httpsTunnels[0].public_url;
    console.log('✅ [EXECUTE-ACTION] Auto-detected ngrok URL:', ngrokUrl);
    return new URL(ngrokUrl).origin;
  } catch (error) {
    console.error('❌ [EXECUTE-ACTION] Error auto-detecting ngrok URL:', error);
    
    // Fallback to environment variable
    if (process.env.NGROK_URL) {
      console.log('⚠️ [EXECUTE-ACTION] Using NGROK_URL from environment:', process.env.NGROK_URL);
      return process.env.NGROK_URL;
    }
    
    // No fallback available
    throw new Error('No valid webhook URL available. Please start ngrok or set NGROK_URL environment variable.');
  }
}

// Define API base URL helper
async function getApiBaseUrl(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    try {
      // Try to detect ngrok URL in development mode
      const ngrokUrl = await detectNgrokUrl();
      console.log('🌐 [EXECUTE-ACTION] Using ngrok URL for API base:', ngrokUrl);
      return ngrokUrl;
    } catch (error) {
      console.warn('⚠️ [EXECUTE-ACTION] Could not detect ngrok URL, falling back to localhost:', error);
      return 'http://localhost:3000';
    }
  }
  
  // In production mode, use NEXT_APP_URL
  return process.env.NEXT_APP_URL || 'https://bladexlab.com';
}

async function sendMessageToContactExternally(
  contactId: string,
  contactInfo: string,
  message: string,
  messageId: string,
  requestHeaders?: Headers
) {
  try {
    // Create a deduplication key based on contact, message ID and content
    const dedupeKey = `${contactId}:${messageId}:${message.substring(0, 30)}`;
    
    // Check if we've processed this same message operation recently (within 10 seconds)
    const now = Date.now();
    if (recentProcessedOperations.has(dedupeKey)) {
      const lastProcessed = recentProcessedOperations.get(dedupeKey)!;
      if (now - lastProcessed < 10000) { // 10 seconds
        console.log(`[EXECUTE-ACTION] Skipping duplicate send to ${contactId}: "${message.substring(0, 30)}..."`);
        return true; // Pretend we sent it successfully
      }
    }
    
    // Record this send attempt
    recentProcessedOperations.set(dedupeKey, now);
    
    // Clean up old entries from the tracking map
    const keysToDelete: string[] = [];
    recentProcessedOperations.forEach((timestamp, key) => {
      if (now - timestamp > 120000) { // Remove entries older than 2 minutes
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => recentProcessedOperations.delete(key));
    
    // Get base URL for API calls
    const baseUrl = await getApiBaseUrl();
    
    // Check if this is a Telegram contact (simple heuristic check)
    const isTelegramContact = !contactInfo.includes('@') && /^[0-9]+$/.test(contactInfo.split(':')[0]);
    
    // For Telegram contacts, always force user mode to ensure we can access the right database
    const forcedUserMode = isTelegramContact;
    if (forcedUserMode) {
      console.log(`[EXECUTE-ACTION] Detected Telegram contact - forcing USER MODE`);
    }
    
    // Check if we're in user mode from headers
    const isUserMode = forcedUserMode || requestHeaders?.get('x-bladex-user-mode') === 'true';
    
    // Prepare headers for the API call
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Set user mode flag appropriately
    if (isUserMode || forcedUserMode) {
      headers['x-bladex-user-mode'] = 'true';
      console.log(`[EXECUTE-ACTION] Using USER MODE for external message delivery`);
    } else if (requestHeaders?.get('cookie')?.includes('admin_mode=true')) {
      console.log('[EXECUTE-ACTION] Preserving admin_mode cookie in request');
    }
    
    // Copy authorization header if it exists
    const authHeader = requestHeaders?.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }
    
    // Copy cookie header which contains user credentials
    const cookieHeader = requestHeaders?.get('cookie');
    if (cookieHeader) {
      headers['cookie'] = cookieHeader;
    }
    
    console.log(`[EXECUTE-ACTION] Sending message to Telegram via API: ${messageId} (${isUserMode ? 'user mode' : 'admin mode'})`);
    
    const response = await fetch(`${baseUrl}/api/bots/telegram/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contactId: contactId,
        messageId: messageId,
        contactInfo: contactInfo,
        content: message,
        agentName: 'AI Assistant',
        userMode: true  // Always force user mode for Telegram
      }),
    });
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        console.log('[EXECUTE-ACTION] Successfully sent message using Telegram API');
        return true;
      } else {
        console.error('[EXECUTE-ACTION] API responded with an error:', responseData.error || 'Unknown error');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Error sending message externally:', error);
    return false;
  }
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

export async function POST(request: Request) {
  try {
    const { action, message, recipients, directSend, userMode, batchId } = await request.json();
    
    console.log(`[EXECUTE-ACTION] Request received:`, { 
      action, 
      message: message?.substring(0, 30) + "...", 
      recipients: recipients?.length, 
      directSend, 
      userMode,
      batchId: batchId || 'none' 
    });

    if (!action || !message || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Action, message, and recipients are required' },
        { status: 400 }
      );
    }

    // Get the appropriate Supabase client based on request headers
    const requestHeaders = new Headers(request.headers);
    
    // Check for different ways user mode might be indicated
    const hasBodyUserMode = userMode === true;
    const hasHeaderUserMode = request.headers.get('x-bladex-user-mode') === 'true';
    const hasCookieAuth = request.headers.get('cookie')?.includes('supabase-auth-token');
    
    // IMPORTANT CHANGE: Default to USER MODE for better compatibility with multi-tenant setup
    // For most actions like send_message, USER MODE access is required to find contacts
    const shouldUseUserMode = true;
    
    // Only explicitly set ADMIN MODE if admin_mode cookie is present and no user mode indicators
    const hasAdminModeCookie = request.headers.get('cookie')?.includes('admin_mode=true');
    if (hasAdminModeCookie && !(hasBodyUserMode || hasHeaderUserMode || hasCookieAuth)) {
      // Don't set user mode header in this case
      console.log(`[EXECUTE-ACTION] Preserving ADMIN MODE based on admin_mode cookie`);
    } else {
      // In all other cases, force USER MODE
      requestHeaders.set('x-bladex-user-mode', 'true');
      console.log(`[EXECUTE-ACTION] Setting USER MODE for contact access`, { 
        bodyUserMode: hasBodyUserMode, 
        headerUserMode: hasHeaderUserMode, 
        cookieAuth: hasCookieAuth 
      });
    }
    
    // Copy authorization header if it exists
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      requestHeaders.set('authorization', authHeader);
    }
    
    // Copy cookie header if it exists
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      requestHeaders.set('cookie', cookieHeader);
    }
    
    // Initialize supabase clients
    let supabase: any = null;
    let adminSupabase: any = null;
    let isUserMode = requestHeaders.get('x-bladex-user-mode') === 'true';
    
    console.log(`[EXECUTE-ACTION] Credential mode: ${isUserMode ? 'USER MODE' : 'ADMIN MODE'}`);
    
    try {
      // Always initialize the admin client for potential fallback
      adminSupabase = createAdminSupabaseClient();
      console.log('[EXECUTE-ACTION] Successfully created admin client for fallback');
    } catch (adminError) {
      console.error('[EXECUTE-ACTION] Failed to create admin client:', adminError);
      
      // If admin client fails, try to use getServerSupabaseClient as fallback
      supabase = await getServerSupabaseClient(requestHeaders);
      console.log(`[EXECUTE-ACTION] Using ${isUserMode ? 'User Mode' : 'Admin Mode'} for Supabase client (fallback)`);
    }
    
    // For user mode, get credentials directly (similar to telegram/send)
    if (isUserMode && !supabase) {
      console.log('[EXECUTE-ACTION] USER MODE - Fetching user credentials directly...');
      
      // Try to get credentials from cookies first
      const cookieStore = cookies();
      const userUrl = cookieStore.get('supabase_url')?.value;
      const userKey = cookieStore.get('supabase_anon_key')?.value;
      
      if (userUrl && userKey) {
        console.log('[EXECUTE-ACTION] Found credentials in cookies');
        
        try {
          // Create client with cookie credentials
          supabase = createClient(
            userUrl,
            userKey,
            {
              auth: {
                autoRefreshToken: true,
                persistSession: true
              }
            }
          );
          
          // Test the connection quickly
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true });
            
          console.log(`[EXECUTE-ACTION] Successfully connected to user database with cookie credentials (${count} contacts total)`);
        } catch (cookieError) {
          console.error('[EXECUTE-ACTION] Failed to use cookie credentials:', cookieError);
          // Will fall through to next credential source
        }
      }
      
      // If no valid client yet, try to get from user database based on auth cookie
      if (!supabase && adminSupabase) {
        try {
          const userEmail = getUserEmailFromAuthCookie(cookieStore);
          
          if (userEmail) {
            console.log(`[EXECUTE-ACTION] Looking up credentials for user: ${userEmail}`);
            
            const { data: user } = await adminSupabase
              .from('users')
              .select('credentials')
              .eq('email', userEmail)
              .maybeSingle();
              
            if (user?.credentials) {
              try {
                const credentials = decryptCredentials(user.credentials);
                
                if (credentials?.supabase_url && credentials?.supabase_anon_key) {
                  console.log('[EXECUTE-ACTION] Using credentials from user database');
                  
                  supabase = createClient(
                    credentials.supabase_url,
                    credentials.supabase_anon_key,
                    {
                      auth: {
                        autoRefreshToken: true,
                        persistSession: true
                      }
                    }
                  );
                  
                  // Test the connection
                  const { count } = await supabase
                    .from('contacts')
                    .select('*', { count: 'exact', head: true });
                    
                  console.log(`[EXECUTE-ACTION] Successfully connected to user database with stored credentials (${count} contacts total)`);
                }
              } catch (decryptError) {
                console.error('[EXECUTE-ACTION] Failed to decrypt user credentials:', decryptError);
              }
            }
          }
        } catch (dbLookupError) {
          console.error('[EXECUTE-ACTION] Error looking up user credentials:', dbLookupError);
        }
      }
      
      // If we still don't have a valid client, fall back to getServerSupabaseClient
      if (!supabase) {
        console.log('[EXECUTE-ACTION] Direct credential methods failed, trying getServerSupabaseClient');
        
        try {
          supabase = await getServerSupabaseClient(requestHeaders);
          
          // Test the connection
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true });
            
          console.log(`[EXECUTE-ACTION] Connected via getServerSupabaseClient (${count} contacts total)`);
        } catch (serverClientError) {
          console.error('[EXECUTE-ACTION] getServerSupabaseClient also failed:', serverClientError);
          
          // If all user mode methods fail, fall back to admin mode
          if (adminSupabase) {
            console.log('[EXECUTE-ACTION] All USER MODE methods failed, falling back to ADMIN MODE');
            supabase = adminSupabase;
          } else {
            return NextResponse.json(
              { error: 'Failed to establish database connection in both USER and ADMIN modes' },
              { status: 500 }
            );
          }
        }
      }
    } else if (!supabase && adminSupabase) {
      // In admin mode, just use the admin client
      console.log('[EXECUTE-ACTION] ADMIN MODE - Using admin credentials');
      supabase = adminSupabase;
    }
    
    // Final safety check - if we still don't have a valid client, return an error
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to establish a database connection' },
        { status: 500 }
      );
    }
    
    console.log(`[EXECUTE-ACTION] Using ${isUserMode ? 'User Mode' : 'Admin Mode'} for Supabase client`);

    if (action === 'send_message') {
      // This automatically sends messages instead of waiting for manual retry
      
      const results = [];
      const errors = [];
      
      // Log recipients to help debug potential duplicates
      console.log(`[EXECUTE-ACTION] Processing ${recipients.length} recipients in ${isUserMode ? 'user' : 'admin'} database`);
      recipients.forEach((recipient, idx) => {
        console.log(`[EXECUTE-ACTION] Recipient ${idx+1}:`, recipient.id, recipient.name);
      });

      // Track unique IDs to prevent duplicate recipients within the same batch
      const processedIds = new Set();

      for (const recipient of recipients) {
        // Skip duplicate recipients within the batch
        if (processedIds.has(recipient.id)) {
          console.log(`[EXECUTE-ACTION] Skipping duplicate recipient: ${recipient.id}`);
          continue;
        }
        
        processedIds.add(recipient.id);
        
        try {
          console.log(`[EXECUTE-ACTION] Processing message for ${recipient.name} (${recipient.id})`);
          
          // Create deduplication context with batch ID if available
          const dedupeContext = batchId ? 
            `batch:${batchId}:${recipient.id}` : 
            `execute-action:${recipient.id}`;
          
          // Check against the deduplication service first - this is the primary check
          if (isDuplicateMessage(recipient.id, message, dedupeContext)) {
            console.log(`[EXECUTE-ACTION] Deduplication detected duplicate message to ${recipient.id}`);
            results.push({ recipient: recipient.name, status: 'sent (duplicate)', messageId: 'duplicate' });
            continue;
          }
          
          // Secondary backup check against our local map
          const dedupeKey = `${recipient.id}:${message.substring(0, 50)}:${batchId || ''}`;
          const now = Date.now();
          if (recentProcessedOperations.has(dedupeKey)) {
            const lastProcessed = recentProcessedOperations.get(dedupeKey)!;
            if (now - lastProcessed < 10000) { // 10 seconds
              console.log(`[EXECUTE-ACTION] Already sent to ${recipient.id} recently, skipping`);
              results.push({ recipient: recipient.name, status: 'sent (duplicate)', messageId: 'duplicate' });
              continue;
            }
          }
          
          // Record this operation in both places
          recentProcessedOperations.set(dedupeKey, now);
          markMessageAsSent(recipient.id, message, dedupeContext);
          
          // Use the existing client that was set up with direct credentials
          console.log(`[EXECUTE-ACTION] Using ${isUserMode ? 'user' : 'admin'} client for message insertion to ${recipient.name}`);
          
          // Insert message record for each recipient - ADD CHECK FOR EXISTING MESSAGES
          let insertData;
          let insertError;

          // First, check if this exact message already exists in the database
          console.log(`[EXECUTE-ACTION] Checking if message already exists for contact ${recipient.id}`);
          const { data: existingMessages, error: searchError } = await supabase
            .from('messages')
            .select('id')
            .eq('contact_id', recipient.id)
            .eq('content', message)
            .gt('timestamp', new Date(Date.now() - 60000).toISOString()) // Messages in the last minute
            .order('timestamp', { ascending: false })
            .limit(1);

          if (searchError) {
            console.error(`[EXECUTE-ACTION] Error checking for existing messages:`, searchError);
          } else if (existingMessages && existingMessages.length > 0) {
            // We found an existing message with the same content, use it instead of creating a new one
            console.log(`[EXECUTE-ACTION] Found existing message with ID: ${existingMessages[0].id} for contact ${recipient.id}`);
            insertData = existingMessages;
            
            // Update the existing message instead of creating a new one
            const { error: updateError } = await supabase
              .from('messages')
              .update({
                is_sent: false, // Will update this after sending
                timestamp: new Date().toISOString() // Refresh the timestamp
              })
              .eq('id', existingMessages[0].id);
              
            if (updateError) {
              console.error(`[EXECUTE-ACTION] Error updating existing message: ${updateError.message}`);
              insertError = updateError;
            } else {
              console.log(`[EXECUTE-ACTION] Updated existing message: ${existingMessages[0].id}`);
            }
          } else {
            // No existing message found, create a new one
            console.log(`[EXECUTE-ACTION] No existing message found, creating new one for ${recipient.id}`);
            
            // Insert message record for each recipient
            const insertResult = await supabase
              .from('messages')
              .insert({
                contact_id: recipient.id,
                content: message,
                direction: 'outgoing',
                is_from_customer: false,
                is_ai_response: false,
                timestamp: new Date().toISOString(),
                is_sent: false, // Mark as not sent initially, will update after external delivery
                is_viewed: true
              })
              .select();
              
            insertData = insertResult.data;
            insertError = insertResult.error;
          }

          if (insertError) {
            console.error(`[EXECUTE-ACTION] Database error for ${recipient.id}:`, insertError);
            
            // If user mode insertion fails, try admin mode
            if (isUserMode) {
              console.log('[EXECUTE-ACTION] Message insert failed in user mode, trying admin mode');
              isUserMode = false;
              
              const adminSupabase = await createAdminSupabaseClient();
              
              // Check for existing messages using admin client as well
              const { data: adminExistingMessages, error: adminSearchError } = await adminSupabase
                .from('messages')
                .select('id')
                .eq('contact_id', recipient.id)
                .eq('content', message)
                .gt('timestamp', new Date(Date.now() - 60000).toISOString()) // Messages in the last minute
                .order('timestamp', { ascending: false })
                .limit(1);
                
              if (adminSearchError) {
                console.error(`[EXECUTE-ACTION] Admin mode - Error checking for existing messages:`, adminSearchError);
              } else if (adminExistingMessages && adminExistingMessages.length > 0) {
                // We found an existing message with the same content, use it instead of creating a new one
                console.log(`[EXECUTE-ACTION] Admin mode - Found existing message with ID: ${adminExistingMessages[0].id}`);
                insertData = adminExistingMessages;
                
                // Update the existing message instead of creating a new one
                const { error: adminUpdateError } = await adminSupabase
                  .from('messages')
                  .update({
                    is_sent: false, // Will update this after sending
                    timestamp: new Date().toISOString() // Refresh the timestamp
                  })
                  .eq('id', adminExistingMessages[0].id);
                  
                if (adminUpdateError) {
                  console.error(`[EXECUTE-ACTION] Admin mode - Error updating existing message: ${adminUpdateError.message}`);
                  insertError = adminUpdateError;
                } else {
                  console.log(`[EXECUTE-ACTION] Admin mode - Updated existing message: ${adminExistingMessages[0].id}`);
                  insertError = null; // Clear the error as we've successfully updated
                }
              } else {
                // No existing message found in admin mode either, create a new one
                console.log(`[EXECUTE-ACTION] Admin mode - Creating new message for ${recipient.id}`);
                const adminInsertResult = await adminSupabase
                  .from('messages')
                  .insert({
                    contact_id: recipient.id,
                    content: message,
                    direction: 'outgoing',
                    is_from_customer: false,
                    is_ai_response: false,
                    timestamp: new Date().toISOString(),
                    is_sent: false,
                    is_viewed: true
                  })
                  .select();
                  
                insertData = adminInsertResult.data;
                insertError = adminInsertResult.error;
              }
            } else {
              errors.push({ recipient: recipient.name, error: insertError.message });
              continue;
            }
          } else {
            console.log(`[EXECUTE-ACTION] Successfully saved message to ${isUserMode ? 'user' : 'admin'} database for ${recipient.name}`);
          }
          
          // Safety check - ensure we have data
          if (!insertData || insertData.length === 0) {
            console.error(`[EXECUTE-ACTION] No data returned from message insert for ${recipient.id}`);
            errors.push({ recipient: recipient.name, error: 'Failed to create message: no data returned' });
            continue;
          }
          
          // Get message ID for sending
          const messageId = insertData[0].id;
          console.log(`[EXECUTE-ACTION] Created message with ID: ${messageId}`);
          
          // Update the contact's last_contact timestamp
          await supabase
            .from('contacts')
            .update({ last_contact: new Date().toISOString() })
            .eq('id', recipient.id);
          
          // By default, we'll try to use external channels unless directSend is explicitly true
          const useExternalChannel = directSend !== true;
          
          let sent = false;
          
          if (useExternalChannel) {
            // Try to send via external channel
            sent = await sendMessageToContactExternally(
              recipient.id,
              recipient.contact_info,
              message,
              messageId,
              requestHeaders
            );
            
            if (sent) {
              console.log(`[EXECUTE-ACTION] Message ${messageId} sent via external channel`);
              
              // Update message as sent in database
              await supabase
                .from('messages')
                .update({ is_sent: true })
                .eq('id', messageId);
            } else {
              console.error(`[EXECUTE-ACTION] Failed to send message ${messageId} externally, but DB record exists`);
              
              // If external send failed but we're in user mode, try using the send-message API as a fallback
              if (isUserMode) {
                try {
                  console.log(`[EXECUTE-ACTION] Trying fallback through send-message API`);
                  
                  // Get base URL for API calls
                  const baseUrl = await getApiBaseUrl();
                  
                  // Prepare headers for the fallback API call
                  const fallbackHeaders: HeadersInit = {
                    'Content-Type': 'application/json',
                    'x-bladex-user-mode': 'true'
                  };
                  
                  // Copy authorization header if it exists
                  const authHeader = requestHeaders.get('authorization');
                  if (authHeader) {
                    fallbackHeaders['authorization'] = authHeader;
                  }
                  
                  // Copy cookie header which contains credentials
                  const cookieHeader = requestHeaders.get('cookie');
                  if (cookieHeader) {
                    fallbackHeaders['cookie'] = cookieHeader;
                  }
                  
                  // Try using the dedicated send-message API which has better error handling
                  const sendResponse = await fetch(`${baseUrl}/api/send-message`, {
                    method: 'POST',
                    headers: fallbackHeaders,
                    body: JSON.stringify({
                      contactId: recipient.id,
                      contactInfo: recipient.contact_info,
                      message: message,
                      messageId: messageId
                    })
                  });
                  
                  const sendResult = await sendResponse.json();
                  console.log(`[EXECUTE-ACTION] Fallback send result:`, sendResult);
                  
                  if (sendResult.success) {
                    sent = true;
                  }
                } catch (fallbackError) {
                  console.error(`[EXECUTE-ACTION] Fallback send also failed:`, fallbackError);
                }
              }
            }
          } else {
            // No external sending requested, just mark as sent in DB
            await supabase
              .from('messages')
              .update({ is_sent: true })
              .eq('id', messageId);
              
            sent = true;
            console.log(`[EXECUTE-ACTION] Message ${messageId} saved to database only (no external sending)`);
          }
          
          results.push({ 
            recipient: recipient.name, 
            status: sent ? 'sent' : 'failed', 
            messageId 
          });
        } catch (err) {
          console.error(`Error processing recipient ${recipient.name}:`, err);
          errors.push({ recipient: recipient.name, error: 'Internal error processing message' });
        }
      }

      console.log(`[EXECUTE-ACTION] Completed with ${results.length} sent, ${errors.length} errors`);

      if (errors.length > 0) {
        return NextResponse.json({ 
          status: 'partial_success',
          message: 'Some messages could not be sent',
          results,
          errors
        });
      }

      return NextResponse.json({ 
        status: 'success',
        message: 'Messages sent successfully',
        results
      });
    }

    return NextResponse.json(
      { error: 'Unsupported action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error executing action:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while executing the action' },
      { status: 500 }
    );
  }
}