import { NextRequest, NextResponse } from "next/server"
import { getServerSupabaseClient, createAdminSupabaseClient } from './../../../lib/supabase/server'
import { isDuplicateMessage, markMessageAsSent } from './../../../lib/message/deduplicationService'
import { cookies } from "next/headers"
import { createClient } from '@supabase/supabase-js'
import { decryptCredentials } from './../../../lib/utils/encryption'

// Helper function to automatically detect the ngrok URL
async function detectNgrokUrl(): Promise<string> {
  try {
    console.log('🔍 [SEND-MESSAGE] Attempting to auto-detect ngrok URL...');
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
    console.log('✅ [SEND-MESSAGE] Auto-detected ngrok URL:', ngrokUrl);
    return new URL(ngrokUrl).origin;
  } catch (error) {
    console.error('❌ [SEND-MESSAGE] Error auto-detecting ngrok URL:', error);
    
    // Fallback to environment variable
    if (process.env.NGROK_URL) {
      console.log('⚠️ [SEND-MESSAGE] Using NGROK_URL from environment:', process.env.NGROK_URL);
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
      console.log('🌐 [SEND-MESSAGE] Using ngrok URL for API base:', ngrokUrl);
      return ngrokUrl;
    } catch (error) {
      console.warn('⚠️ [SEND-MESSAGE] Could not detect ngrok URL, falling back to localhost:', error);
      return 'http://localhost:3000';
    }
  }
  
  // In production mode, use NEXT_APP_URL
  return process.env.NEXT_APP_URL || 'https://bladexlab.com';
}

// Import or access the message status cache
// This should be the same cache used in the orchestration API
// For simplicity, we'll recreate it here, but in a real app, you'd share this

const messageStatusCache = new Map<string, any>();

// Function to update message status in cache (simplified for example)
function updateMessageStatus(
  messageId: string, 
  status: 'analyzing' | 'delegating' | 'replying' | 'completed' | 'error',
  details: {
    stage?: 'analyzing' | 'delegating' | 'replying' | 'completed',
    details?: string,
    agentName?: string,
    agentDescription?: string,
    response?: string,
    processingDetails?: any
  }
) {
  try {
    if (!messageId) return null;
    
    const currentStatus = messageStatusCache.get(messageId) || {
      id: messageId,
      status: 'new',
      processingStage: {
        stage: 'analyzing',
        details: 'Waiting to process message...'
      }
    };

    
    const updatedStatus = {
      ...currentStatus,
      status,
      processingStage: {
        stage: details.stage || status,
        details: details.details || `Message is being ${status}...`
      },
      agentName: details.agentName || currentStatus.agentName,
      agentDescription: details.agentDescription || currentStatus.agentDescription,
      response: details.response || currentStatus.response,
      processingDetails: details.processingDetails || currentStatus.processingDetails
    };
    
    messageStatusCache.set(messageId, updatedStatus);
    console.log(`Updated message status cache for ${messageId}: ${status}`);
    
    return updatedStatus;
  } catch (error) {
    console.error('Error updating message status cache:', error);
    return null;
  }
}

// Track messages we've already dealt with in this request cycle
const messagesInProgress = new Set<string>();

/**
 * Send Message API Endpoint
 * 
 * This endpoint handles sending messages to contacts
 */

export async function POST(request: NextRequest) {
  console.log('📩 Message send request received');
  
  try {
    // Parse JSON body
    const body = await request.json();
    const { contactId, contactInfo, message, agentName, agentDescription, userMode } = body
    let { messageId } = body;

    console.log(`Message ID: ${messageId || 'N/A'}`);
    console.log(`Contact info: ${contactInfo || 'N/A'}`);
    
    // Create a unique key for this message to prevent duplicate processing
    const messageKey = `${contactId}:${message}:${messageId || ''}`;
    
    // Check if we're already processing this exact message in this request cycle
    if (messagesInProgress.has(messageKey)) {
      console.log(`⚠️ [SEND-MESSAGE] Already processing this exact message, skipping duplicate: ${messageKey}`);
      return NextResponse.json(
        { success: true, isDuplicate: true },
        { status: 200 }
      );
    }
    
    // Mark this message as in-progress
    messagesInProgress.add(messageKey);
    
    // Check for different ways user mode might be indicated
    const hasHeaderUserMode = request.headers.get('x-bladex-user-mode') === 'true';
    const hasCookieAuth = request.headers.get('cookie')?.includes('supabase-auth-token');
    const hasExplicitUserMode = userMode === true;
    
    // Create new headers object to modify
    const requestHeaders = new Headers(request.headers);
    
    // Set user mode if any of these conditions are true
    const shouldUseUserMode = hasHeaderUserMode || hasCookieAuth || hasExplicitUserMode;
    
    console.log(`[SEND-MESSAGE] Mode detection:`, { 
      headerUserMode: hasHeaderUserMode, 
      cookieAuth: hasCookieAuth,
      bodyUserMode: hasExplicitUserMode,
      determinedMode: shouldUseUserMode ? 'USER MODE' : 'ADMIN MODE'
    });
    
    if (shouldUseUserMode) {
      requestHeaders.set('x-bladex-user-mode', 'true');
      console.log(`[SEND-MESSAGE] Setting user mode header`);
    } else {
      // In admin mode, ensure the user mode header is removed
      requestHeaders.delete('x-bladex-user-mode');
      console.log(`[SEND-MESSAGE] Setting admin mode (removing user mode header)`);
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
    } else if (hasCookieAuth) {
      // If we detected cookie auth but the header wasn't forwarded, try to get it from the cookies object
      const cookieStore = cookies();
      const authCookie = cookieStore.get('supabase-auth-token');
      if (authCookie) {
        requestHeaders.set('cookie', `supabase-auth-token=${authCookie.value}`);
        console.log(`[SEND-MESSAGE] Restored auth cookie from cookies object`);
      }
    }
    
    // Get supabase client with proper credentials
    console.log(`[SEND-MESSAGE] Getting Supabase client with proper credentials`);
    const supabase = await getServerSupabaseClient(requestHeaders);
    const isUserMode = requestHeaders.get('x-bladex-user-mode') === 'true';
    console.log(`[SEND-MESSAGE] Using ${isUserMode ? 'User Mode' : 'Admin Mode'} for Supabase client`);

    // Validate required fields
    if (!contactId) {
      console.error('Missing contact ID');
      return NextResponse.json(
        { success: false, error: "Missing contact ID" },
        { status: 400 }
      )
    }

    if (!message) {
      console.error('Missing message content');
      return NextResponse.json(
        { success: false, error: "Missing message content" },
        { status: 400 }
      )
    }

    // Check if this is a duplicate message using the deduplication service
    const additionalContext = messageId ? `messageId:${messageId}` : undefined;
    if (isDuplicateMessage(contactId, message, additionalContext)) {
      console.log(`🔄 [SEND-MESSAGE] Duplicate message detected for contact ${contactId}, skipping`);
      return NextResponse.json(
        { success: true, isDuplicate: true },
        { status: 200 }
      )
    }

    // Mark this message as sent in the deduplication service
    markMessageAsSent(contactId, message, additionalContext);

    // Update message status if messageId is provided
    if (messageId) {
      updateMessageStatus(messageId, 'replying', {
        details: `Sending response to contact...`,
        agentName,
        agentDescription,
        response: message
      })
    }

    let dbUpdateSuccess = false;

    // If message is already in database (messageId provided), just mark it as sent
    if (messageId) {
      try {
        console.log(`[SEND-MESSAGE] Updating existing message ${messageId} delivery status`);
        const { error } = await supabase
          .from('messages')
          .update({ 
            is_sent: true,
            status: 'sent',
            
            
          })
          .eq('id', messageId);
        
        if (error) {
          console.error('Error updating message delivery status:', error);
          
          // Try with admin client as fallback if in user mode
          if (isUserMode) {
            console.log(`[SEND-MESSAGE] Trying admin client as fallback for message update`);
            const adminSupabase = createAdminSupabaseClient();
            
            const { error: adminError } = await adminSupabase
              .from('messages')
              .update({ 
                is_sent: true,
                status: 'sent',
                
              })
              .eq('id', messageId);
              
            if (adminError) {
              console.error('Error updating message with admin client:', adminError);
            } else {
              console.log(`✅ Updated delivery status for message ${messageId} using admin client`);
              dbUpdateSuccess = true;
            }
          }
        } else {
          console.log(`✅ Updated delivery status for message ${messageId}`);
          dbUpdateSuccess = true;
        }
      } catch (dbError) {
        console.error('Exception updating message status:', dbError);
      }
    } 
    // If no messageId, we need to create a new message record
    else {
      try {
        console.log('Saving new outgoing message to database...');
        
        // First check if this exact message already exists in the database
        const { data: existingMessages, error: searchError } = await supabase
          .from('messages')
          .select('id')
          .eq('contact_id', contactId)
          .eq('content', message)
          .gt('timestamp', new Date(Date.now() - 60000).toISOString()) // Only check messages in the last minute
          .order('timestamp', { ascending: false })
          .limit(1);
          
        if (searchError) {
          console.error('Error checking for existing message:', searchError);
        } else if (existingMessages && existingMessages.length > 0) {
          // We found an existing message - use its ID instead of creating a new one
          messageId = existingMessages[0].id;
          console.log(`📋 [SEND-MESSAGE] Found existing message with same content, using ID: ${messageId}`);
          
          // Update the existing message instead of creating a new one
          const { error: updateError } = await supabase
            .from('messages')
            .update({ 
              is_sent: true,
              status: 'sent',
             
            })
            .eq('id', messageId);
            
          if (updateError) {
            console.error('Error updating existing message:', updateError);
          } else {
            console.log(`✅ Updated existing message status: ${messageId}`);
            dbUpdateSuccess = true;
          }
          
          // Skip the insert since we found and updated an existing message
          return NextResponse.json({ 
            success: true,
            messageId,
            dbUpdateSuccess: true,
            externalDelivery: false,
            usedExisting: true
          });
        }
        
        // Only insert if we didn't find an existing message
        const { data, error } = await supabase
          .from('messages')
          .insert({
            contact_id: contactId,
            content: message,
            timestamp: new Date().toISOString(),
            is_from_customer: false,
            is_viewed: true,
            direction: 'outgoing',
            is_sent: true,
            is_ai_response: true,
            status: 'sent',
            
           
          })
          .select();

        if (error) {
          console.error('Error saving new outgoing message to database:', error);
          
          // Try with admin client as fallback if in user mode
          if (isUserMode) {
            console.log(`[SEND-MESSAGE] Trying admin client as fallback for message creation`);
            const adminSupabase = createAdminSupabaseClient();
            
            const { data: adminData, error: adminError } = await adminSupabase
              .from('messages')
              .insert({
                contact_id: contactId,
                content: message,
                timestamp: new Date().toISOString(),
                is_from_customer: false,
                is_viewed: true,
                direction: 'outgoing',
                is_sent: true,
                is_ai_response: true,
                status: 'sent',
               
               
              })
              .select();
              
            if (adminError) {
              console.error('Error saving message with admin client:', adminError);
            } else if (adminData && adminData.length > 0) {
              console.log(`✅ Saved new outgoing message with ID: ${adminData[0].id} using admin client`);
              messageId = adminData[0].id;
              dbUpdateSuccess = true;
            }
          }
        } else if (data && data.length > 0) {
          console.log(`✅ Saved new outgoing message with ID: ${data[0].id}`);
          messageId = data[0].id;
          dbUpdateSuccess = true;
        }
      } catch (dbError) {
        console.error('Exception saving new message to database:', dbError);
      }
    }

    // Send the message to the contact using telegram or other channel if contactInfo is provided
    let externalDeliverySuccess = false;
    
    if (contactInfo) {
      try {
        // If contact info is provided, attempt external delivery
        console.log(`Attempting to send message via external channel to ${contactInfo}`);
        // Pass the messageId to avoid creating another database entry in sendMessageToContact
        externalDeliverySuccess = await sendMessageToContact(contactId, contactInfo, message, agentName, requestHeaders, messageId);
        
        if (externalDeliverySuccess) {
          console.log('✅ Message sent via external channel successfully');
        } else {
          console.warn('⚠️ Failed to send message via external channel');
        }
      } catch (sendError) {
        console.error('Error in external message sending:', sendError);
      }
    }

    // Update message status to completed if messageId is provided
    if (messageId) {
      updateMessageStatus(messageId, 'completed', {
        details: `Response ${externalDeliverySuccess ? 'sent' : 'saved'} by ${agentName || 'AI'}${
          agentDescription ? ` (${agentDescription})` : ""
        }`,
        agentName,
        agentDescription,
        response: message
      })
    }

    return NextResponse.json({ 
      success: true,
      messageId,
      dbUpdateSuccess,
      externalDelivery: externalDeliverySuccess 
    })
  } catch (error) {
    console.error("Error sending message:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Send a message to a contact using the appropriate channel
 */
async function sendMessageToContact(
  contactId: string,
  contactInfo: string,
  message: string,
  agentName: string = 'AI Assistant',
  requestHeaders?: Headers,
  existingMessageId?: string // Add parameter to pass existing messageId
): Promise<boolean> {
  try {
    console.log(`Sending message to contact ${contactId} with info "${contactInfo}"`);
    
    // Create headers from the incoming request to preserve original context
    const newRequestHeaders = new Headers(requestHeaders || {});
    
    // For Telegram messages, we MUST use USER mode to ensure we can access the right database
    const isTelegramMessage = !contactInfo.includes('@') && /^[0-9]+$/.test(contactInfo.split(':')[0]);
    if (isTelegramMessage) {
      console.log('[SEND-CONTACT] Detected Telegram message - forcing USER MODE');
      newRequestHeaders.set('x-bladex-user-mode', 'true');
    }
    
    // Parse the user mode directly from our modified headers
    const isUserMode = newRequestHeaders.get('x-bladex-user-mode') === 'true';
    console.log(`[SEND-CONTACT] Mode from headers: ${isUserMode ? 'USER MODE' : 'ADMIN MODE'}`);
    
    // Initialize supabase clients
    let supabase;
    let adminSupabase;
    
    try {
      // Always initialize the admin client for potential fallback
      adminSupabase = createAdminSupabaseClient();
      console.log('[SEND-CONTACT] Successfully created admin client for fallback');
    } catch (adminError) {
      console.error('[SEND-CONTACT] Failed to create admin client:', adminError);
      return false;
    }
    
    // For user mode, get credentials directly (similar to telegram/send)
    if (isUserMode) {
      console.log('[SEND-CONTACT] USER MODE - Fetching user credentials...');
      
      // Try the getServerSupabaseClient first, most reliable method
      try {
        console.log('[SEND-CONTACT] Trying getServerSupabaseClient first');
        supabase = await getServerSupabaseClient(newRequestHeaders);
        
        // Test the connection
        const { count, error } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error('[SEND-CONTACT] Error testing connection with getServerSupabaseClient:', error);
          // Will try next method
        } else {
          console.log(`[SEND-CONTACT] Successfully connected to user database with getServerSupabaseClient (${count} contacts total)`);
          // Successfully connected, proceed with this client
        }
      } catch (getClientError) {
        console.error('[SEND-CONTACT] Failed with getServerSupabaseClient:', getClientError);
        // Will try next method
      }
      
      // If getServerSupabaseClient failed, try cookies
      if (!supabase) {
        try {
          // Try to get credentials from cookies
          const cookieStore = cookies();
          const userUrl = cookieStore.get('supabase_url')?.value;
          const userKey = cookieStore.get('supabase_anon_key')?.value;
          
          if (userUrl && userKey) {
            console.log('[SEND-CONTACT] Found credentials in cookies');
            
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
              const { count, error } = await supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true });
                
              if (error) {
                console.error('[SEND-CONTACT] Error testing connection with cookie credentials:', error);
                // Will try next method
              } else {
                console.log(`[SEND-CONTACT] Successfully connected to user database with cookie credentials (${count} contacts total)`);
                // Successfully connected, proceed with this client
              }
            } catch (cookieError) {
              console.error('[SEND-CONTACT] Failed to use cookie credentials:', cookieError);
              // Will try next method
            }
          }
        } catch (cookieError) {
          console.error('[SEND-CONTACT] Error accessing cookies:', cookieError);
          // Will try next method
        }
      }
      
      // If still no valid client, try to get from user database based on auth cookie
      if (!supabase) {
        try {
          const cookieStore = cookies();
          const userEmail = getUserEmailFromAuthCookie(cookieStore);
          
          if (userEmail) {
            console.log(`[SEND-CONTACT] Looking up credentials for user: ${userEmail}`);
            
            const { data: user, error: userError } = await adminSupabase
              .from('users')
              .select('credentials')
              .eq('email', userEmail)
              .maybeSingle();
              
            if (userError) {
              console.error('[SEND-CONTACT] Error looking up user:', userError);
              // Will try next method
            } else if (user?.credentials) {
              try {
                const credentials = decryptCredentials(user.credentials);
                
                if (credentials?.supabase_url && credentials?.supabase_anon_key) {
                  console.log('[SEND-CONTACT] Using credentials from user database');
                  
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
                  const { count, error } = await supabase
                    .from('contacts')
                    .select('*', { count: 'exact', head: true });
                    
                  if (error) {
                    console.error('[SEND-CONTACT] Error testing connection with stored credentials:', error);
                    // Will try next method
                  } else {
                    console.log(`[SEND-CONTACT] Successfully connected to user database with stored credentials (${count} contacts total)`);
                    // Successfully connected, proceed with this client
                  }
                }
              } catch (decryptError) {
                console.error('[SEND-CONTACT] Failed to decrypt user credentials:', decryptError);
                // Will try next method
              }
            }
          }
        } catch (dbLookupError) {
          console.error('[SEND-CONTACT] Error looking up user credentials:', dbLookupError);
          // Will try fallback
        }
      }
      
      // If all user mode methods fail, fall back to admin mode
      if (!supabase) {
        console.log('[SEND-CONTACT] All USER MODE methods failed, falling back to ADMIN MODE');
        supabase = adminSupabase;
      }
    } else {
      // In admin mode, just use the admin client
      console.log('[SEND-CONTACT] ADMIN MODE - Using admin credentials');
      supabase = adminSupabase;
    }
    
    console.log(`[SEND-CONTACT] Using ${isUserMode ? 'User Mode' : 'Admin Mode'} for Supabase client`);
    
    // For test contacts, just simulate success
    if (contactId.startsWith('test-')) {
      console.log('Simulating message send for test contact');
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    }
    
    // Skip creating a new message record if we already have an ID
    let savedMessageId = existingMessageId;
    if (!savedMessageId) {
      try {
        console.log('[SEND-CONTACT] No existing message ID provided, checking for recent messages...');
        
        // First check if this message already exists in the database (within last minute)
        const { data: existingMessage, error: checkError } = await supabase
          .from('messages')
          .select('id')
          .eq('contact_id', contactId)
          .eq('content', message)
          .gt('timestamp', new Date(Date.now() - 60000).toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);
          
        if (checkError) {
          console.error('[SEND-CONTACT] Error checking for existing messages:', checkError);
        } else if (existingMessage && existingMessage.length > 0) {
          console.log(`[SEND-CONTACT] Found existing message with ID: ${existingMessage[0].id}`);
          savedMessageId = existingMessage[0].id;
          
          // Update the existing message instead of creating a new one
          const { error: updateError } = await supabase
            .from('messages')
            .update({
              status: 'pending',
              is_sent: false
            })
            .eq('id', savedMessageId);
            
          if (updateError) {
            console.error(`[SEND-CONTACT] Error updating existing message: ${updateError.message}`);
          } else {
            console.log(`[SEND-CONTACT] Updated existing message: ${savedMessageId}`);
          }
        } else {
          // No existing message found, create a new one
          console.log('[SEND-CONTACT] No existing message found, creating new one');
          const { data, error } = await supabase
            .from('messages')
            .insert({
              contact_id: contactId,
              content: message,
              timestamp: new Date().toISOString(),
              is_from_customer: false,
              is_viewed: true,
              direction: 'outgoing',
              is_sent: false,
              status: 'pending',
              is_ai_response: true
            })
            .select();

          if (error) {
            console.error('Error saving message to database:', error);
            
            // If in user mode and can't store message, try admin mode
            if (isUserMode && adminSupabase) {
              console.log('[SEND-CONTACT] Failed to store message in USER database, trying ADMIN database');
              
              const { data: adminData, error: adminError } = await adminSupabase
                .from('messages')
                .insert({
                  contact_id: contactId,
                  content: message,
                  timestamp: new Date().toISOString(),
                  is_from_customer: false,
                  is_viewed: true,
                  direction: 'outgoing',
                  is_sent: false,
                  status: 'pending',
                  is_ai_response: true
                })
                .select();
              
              if (adminError) {
                console.error('Error saving message to admin database:', adminError);
              } else if (adminData && adminData.length > 0) {
                console.log(`[SEND-CONTACT] Successfully stored message in ADMIN database: ${adminData[0].id}`);
                savedMessageId = adminData[0].id;
                supabase = adminSupabase; // Use admin for the rest of this operation
              }
            }
          } else if (data && data.length > 0) {
            console.log(`Saved message ID: ${data[0].id}`);
            savedMessageId = data[0].id;
          }
        }
      } catch (dbError) {
        console.error('Exception checking/saving message:', dbError);
      }
    } else {
      console.log(`[SEND-CONTACT] Using provided message ID: ${savedMessageId}`);
    }
    
    // Send via Telegram if contact info is provided
    let messageSent = false;
    
    if (contactInfo) {
      try {
        // Pass the request headers including the mode to sendTelegramMessage
        const directResult = await sendTelegramMessage(contactId, contactInfo, message, savedMessageId, newRequestHeaders);
        
        if (directResult) {
          console.log('[SEND-CONTACT] Successfully sent via Telegram API');
          messageSent = true;
        } else if (isUserMode) {
          console.warn('[SEND-CONTACT] Telegram API failed in user mode');
          
          // If direct send fails in user mode, don't try the admin fallback by default
          // But if it's critical, we could add a flag to force admin fallback
          console.warn('[SEND-CONTACT] Message sending failed in user mode. Not attempting admin fallback.');
          
          // Update the message status in the database to reflect failure
          if (savedMessageId) {
            try {
              await supabase
                .from('messages')
                .update({ 
                  is_sent: false,
                  status: 'failed'
                })
                .eq('id', savedMessageId);
                
              console.log('[SEND-CONTACT] Updated message status to failed in database');
            } catch (dbError) {
              console.error('[SEND-CONTACT] Error updating message status:', dbError);
            }
          }
        } else {
          console.warn('[SEND-CONTACT] Telegram API failed in admin mode');
          // In admin mode, we continue to try with admin credentials below
        }
      } catch (telegramError) {
        console.error('[SEND-CONTACT] Error in Telegram send:', telegramError);
      }
      
      // For admin mode or if requested, try directly with admin credentials
      if (!messageSent && !isUserMode) {
        try {
          console.log('[SEND-CONTACT] Admin mode: using admin bots');
          
          // Create headers for admin mode
          const adminHeaders = new Headers();
          adminHeaders.set('Content-Type', 'application/json');
          // Don't set x-bladex-user-mode to ensure admin mode
          
          // Make direct Telegram API call with admin credentials
          const directResult = await sendTelegramMessage(contactId, contactInfo, message, savedMessageId, adminHeaders);
          
          if (directResult) {
            console.log('[SEND-CONTACT] Successfully sent via admin Telegram API');
            messageSent = true;
          } else {
            console.warn('[SEND-CONTACT] Admin Telegram API failed');
          }
        } catch (adminError) {
          console.error('[SEND-CONTACT] Error in admin mode send:', adminError);
        }
      }
    } else {
      console.warn('No contact info provided, cannot send message');
    }
    
    // Update the message status in the database
    if (savedMessageId) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ 
            is_sent: messageSent,
            status: messageSent ? 'sent' : 'failed',
            message_status: messageSent ? 'delivered' : 'failed'
          })
          .eq('id', savedMessageId);
        
        if (error) {
          console.error('Error updating message status:', error);
        } else {
          console.log(`Updated message status: ${messageSent ? 'delivered' : 'failed'}`);
        }
      } catch (updateError) {
        console.error('Exception updating status:', updateError);
      }
    }
    
    return messageSent;
  } catch (error) {
    console.error('Error in sendMessageToContact:', error);
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

// Send a message via Telegram Bot API
async function sendTelegramMessage(contactId: string, contactInfo: string, message: string, messageId?: string, requestHeaders?: Headers): Promise<boolean> {
  try {
    console.log(`[TELEGRAM DIRECT] Sending message to "${contactInfo}"`);
    
    // Parse the contact info
    let chatId = contactInfo;
    let specifiedBotName = ''; // Capture any specified bot name
    
    if (contactInfo.includes(':')) {
      const parts = contactInfo.split(':');
      chatId = parts[0];
      specifiedBotName = parts[1];
    }
    
    // IMPORTANT: We always force USER mode for Telegram messages since we need to access the user's database
    // where contacts and bots are stored
    const isUserMode = true;
    console.log(`[TELEGRAM DIRECT] FORCING USER MODE to ensure contact access`);
    
    // Create headers for API requests and pass to server.ts
    const headers: HeadersInit = { 
      'Content-Type': 'application/json',
      'x-bladex-user-mode': 'true' // Always force user mode for telegram
    };
    
    // Copy any cookies for authentication
    if (requestHeaders) {
      const cookieHeader = requestHeaders.get('cookie');
      if (cookieHeader) {
        headers['cookie'] = cookieHeader;
      }
    }
    
    // Copy any auth header
    if (requestHeaders) {
      const authHeader = requestHeaders.get('authorization');
      if (authHeader) {
        headers['authorization'] = authHeader;
      }
    }
    
    // Get base URL for API calls
    const baseUrl = await getApiBaseUrl();
    
    // FIRST get a list of available bots to find one we can use
    console.log('[TELEGRAM DIRECT] Fetching available bots from database');
    const listBotsUrl = `${baseUrl}/api/bots/list?platform=telegram&active=true&mode=user`; // Always force user mode
    console.log(`[TELEGRAM DIRECT] Fetching bots list from: ${listBotsUrl}`);
    
    const listBotsResponse = await fetch(listBotsUrl, { headers });
    
    if (!listBotsResponse.ok) {
      console.error(`[TELEGRAM DIRECT] Failed to list bots: ${listBotsResponse.status}`);
      const errorText = await listBotsResponse.text();
      console.error(`[TELEGRAM DIRECT] Bot list error: ${errorText}`);
      return false;
    }
    
    const botsData = await listBotsResponse.json();
    let telegramBots = botsData.bots || [];
    
    if (!telegramBots || telegramBots.length === 0) {
      console.error('[TELEGRAM DIRECT] No active Telegram bots found in database');
      console.log('[TELEGRAM DIRECT] Please create a Telegram bot in your database to send messages');
      console.log('[TELEGRAM DIRECT] You can create a bot by going to Dashboard > Settings > Bots > Add Bot');
      return false;
    }
    
    console.log(`[TELEGRAM DIRECT] Found ${telegramBots.length} Telegram bots in database:`);
    telegramBots.forEach((bot: any) => {
      console.log(`  - ${bot.name} (${bot.platform})`);
    });
    
    // Determine which bot to use:
    // 1. Use specified bot name from contact_info if it exists
    // 2. Otherwise use first available bot
    let botToUse;
    
    if (specifiedBotName) {
      console.log(`[TELEGRAM DIRECT] Contact info specified bot: "${specifiedBotName}"`);
      botToUse = telegramBots.find((bot: any) => bot.name === specifiedBotName);
      
      if (!botToUse) {
        console.error(`[TELEGRAM DIRECT] Specified bot "${specifiedBotName}" not found in database`);
        botToUse = telegramBots[0]; // Fall back to first available bot
        console.log(`[TELEGRAM DIRECT] Using first available bot "${botToUse?.name || 'unknown'}" instead`);
      }
    } else {
      botToUse = telegramBots[0]; // Use first available bot
      console.log(`[TELEGRAM DIRECT] No bot specified, using first available: "${botToUse?.name || 'unknown'}"`);
    }
    
    if (!botToUse) {
      console.error('[TELEGRAM DIRECT] No suitable bot found for sending message');
      return false;
    }
    
    // Call the Telegram send API endpoint
    console.log(`[TELEGRAM DIRECT] Sending via /api/bots/telegram/send endpoint using bot: ${botToUse.name}`);
    const sendUrl = `${baseUrl}/api/bots/telegram/send`;
    
    const sendBody = {
      contactId: contactId,
      content: message,
      messageId: messageId,
      botId: botToUse.id, // Pass the bot ID explicitly
      chatId: chatId,     // Pass the chat ID explicitly
      userMode: isUserMode // Explicitly state the mode
    };
    
    console.log(`[TELEGRAM DIRECT] Send payload:`, JSON.stringify(sendBody, null, 2));
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(sendBody)
    });
    
    // Handle the response
    try {
      const responseData = await sendResponse.json();
      
      if (!sendResponse.ok) {
        console.error(`[TELEGRAM DIRECT] Error ${sendResponse.status}: ${JSON.stringify(responseData)}`);
        return false;
      }
      
      console.log(`[TELEGRAM DIRECT] Success: Message sent via bot "${responseData.bot?.name || botToUse.name || 'unknown'}"`);
      return true;
    } catch (e) {
      console.error(`[TELEGRAM DIRECT] Error parsing response: ${e}`);
      return false;
    }
  } catch (error) {
    console.error(`[TELEGRAM DIRECT] Exception: ${error}`);
    return false;
  }
} 