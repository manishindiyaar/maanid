import { NextResponse } from 'next/server';
import { getServerSupabaseClient, createAdminSupabaseClient } from './../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { decryptCredentials } from './../../../lib/utils/encryption';
import { cookies } from 'next/headers';
import { isDuplicateMessage, markMessageAsSent } from './../../../lib/message/deduplicationService';

export const dynamic = 'force-dynamic';

// Simple in-memory deduplication for recent operations
const recentOperations = new Map<string, number>();
const DEDUPE_WINDOW = 10000; // 10 seconds

async function getApiBaseUrl(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    try {
      const response = await fetch('http://localhost:4040/api/tunnels');
      const data = await response.json();
      const httpsTunnel = data.tunnels?.find((t: any) => t.proto === 'https');
      return httpsTunnel?.public_url || 'http://localhost:3000';
    } catch {
      return 'http://localhost:3000';
    }
  }
  return process.env.NEXT_APP_URL || 'https://bladexlab.com';
}

async function sendMessageExternally(
  contactId: string,
  contactInfo: string,
  message: string,
  messageId: string,
  headers: Headers
): Promise<boolean> {
  try {
    // Simple deduplication check
    const dedupeKey = `${contactId}:${messageId}`;
    const now = Date.now();
    
    if (recentOperations.has(dedupeKey)) {
      const lastProcessed = recentOperations.get(dedupeKey)!;
      if (now - lastProcessed < DEDUPE_WINDOW) {
        console.log(`Skipping duplicate send to ${contactId}`);
        return true;
      }
    }
    
    recentOperations.set(dedupeKey, now);
    
    // Clean up old entries
    const keysToDelete: string[] = [];
    recentOperations.forEach((timestamp, key) => {
      if (now - timestamp > 120000) { // 2 minutes
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => recentOperations.delete(key));
    
    const baseUrl = await getApiBaseUrl();
    const isTelegram = !contactInfo.includes('@') && /^[0-9]+$/.test(contactInfo.split(':')[0]);
    
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'x-bladex-user-mode': 'true'
    };
    
    // Copy relevant headers
    const authHeader = headers.get('authorization');
    const cookieHeader = headers.get('cookie');
    if (authHeader) requestHeaders['authorization'] = authHeader;
    if (cookieHeader) requestHeaders['cookie'] = cookieHeader;
    
    const response = await fetch(`${baseUrl}/api/bots/telegram/send`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        contactId,
        messageId,
        contactInfo,
        content: message,
        agentName: 'AI Assistant',
        userMode: true
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.success === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sending message externally:', error);
    return false;
  }
}

function getUserEmailFromCookie(): string | null {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('supabase-auth-token')?.value;
    if (!authToken) return null;
    
    const tokenData = JSON.parse(authToken);
    if (Array.isArray(tokenData) && tokenData[2]?.email) {
      return tokenData[2].email;
    }
    return null;
  } catch {
    return null;
  }
}

async function getSupabaseClient(request: Request) {
  const headers = new Headers(request.headers);
  headers.set('x-bladex-user-mode', 'true');
  
  // Try cookie credentials first
  const cookieStore = cookies();
  const userUrl = cookieStore.get('supabase_url')?.value;
  const userKey = cookieStore.get('supabase_anon_key')?.value;
  
  if (userUrl && userKey) {
    try {
      const client = createClient(userUrl, userKey, {
        auth: { autoRefreshToken: true, persistSession: true }
      });
      
      // Test connection
      await client.from('contacts').select('*', { count: 'exact', head: true });
      return client;
    } catch (error) {
      console.log('Cookie credentials failed, trying database lookup');
    }
  }
  
  // Try database lookup
  const adminSupabase = createAdminSupabaseClient();
  const userEmail = getUserEmailFromCookie();
  
  if (userEmail) {
    try {
      const { data: user } = await adminSupabase
        .from('users')
        .select('credentials')
        .eq('email', userEmail)
        .single();
        
      if (user?.credentials) {
        const credentials = decryptCredentials(user.credentials);
        if (credentials?.supabase_url && credentials?.supabase_anon_key) {
          return createClient(credentials.supabase_url, credentials.supabase_anon_key);
        }
      }
    } catch (error) {
      console.log('Database credential lookup failed');
    }
  }
  
  // Fallback to server client
  try {
    return await getServerSupabaseClient(headers);
  } catch {
    return adminSupabase;
  }
}

export async function POST(request: Request) {
  try {
    const { action, message, recipients, directSend, batchId } = await request.json();
    
    if (!action || !message || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Action, message, and recipients are required' },
        { status: 400 }
      );
    }
    
    if (action !== 'send_message') {
      return NextResponse.json(
        { error: 'Unsupported action' },
        { status: 400 }
      );
    }
    
    const supabase = await getSupabaseClient(request);
    const requestHeaders = new Headers(request.headers);
    
    const results: Array<{
      recipient: string;
      status: string;
      messageId: string;
    }> = [];
    
    const errors: Array<{
      recipient: string;
      error: string;
    }> = [];
    const processedIds = new Set();
    
    for (const recipient of recipients) {
      // Skip duplicates within batch
      if (processedIds.has(recipient.id)) {
        continue;
      }
      processedIds.add(recipient.id);
      
      try {
        const dedupeContext = batchId ? `batch:${batchId}:${recipient.id}` : `execute-action:${recipient.id}`;
        
        // Check for duplicates
        if (isDuplicateMessage(recipient.id, message, dedupeContext)) {
          results.push({ 
            recipient: recipient.name, 
            status: 'sent (duplicate)', 
            messageId: 'duplicate' 
          });
          continue;
        }
        
        markMessageAsSent(recipient.id, message, dedupeContext);
        
        // Check for existing recent message
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('contact_id', recipient.id)
          .eq('content', message)
          .gt('timestamp', new Date(Date.now() - 60000).toISOString())
          .limit(1);
        
        let messageId;
        
        if (existingMessages && existingMessages.length > 0) {
          // Update existing message
          messageId = existingMessages[0].id;
          await supabase
            .from('messages')
            .update({ 
              is_sent: false, 
              timestamp: new Date().toISOString() 
            })
            .eq('id', messageId);
        } else {
          // Create new message
          const { data: newMessage, error: insertError } = await supabase
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
            .select()
            .single();
            
          if (insertError) {
            errors.push({ recipient: recipient.name, error: insertError.message });
            continue;
          }
          
          messageId = newMessage.id;
        }
        
        // Update contact timestamp
        await supabase
          .from('contacts')
          .update({ last_contact: new Date().toISOString() })
          .eq('id', recipient.id);
        
        // Send message
        let sent = false;
        
        if (directSend !== true) {
          sent = await sendMessageExternally(
            recipient.id,
            recipient.contact_info,
            message,
            messageId,
            requestHeaders
          );
        } else {
          sent = true;
        }
        
        // Update message status
        if (sent) {
          await supabase
            .from('messages')
            .update({ is_sent: true })
            .eq('id', messageId);
        }
        
        results.push({ 
          recipient: recipient.name, 
          status: sent ? 'sent' : 'failed', 
          messageId 
        });
        
      } catch (error) {
        console.error(`Error processing recipient ${recipient.name}:`, error);
        errors.push({ 
          recipient: recipient.name, 
          error: 'Internal error processing message' 
        });
      }
    }
    
    const response = {
      status: errors.length > 0 ? 'partial_success' : 'success',
      message: errors.length > 0 ? 'Some messages could not be sent' : 'Messages sent successfully',
      results,
      ...(errors.length > 0 && { errors })
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Error executing action:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
