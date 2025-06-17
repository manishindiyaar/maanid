import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { decryptCredentials } from './encryption';
import type { Database } from '@/lib/supabase/types';
import { v4 as uuidv4 } from 'uuid';

interface TelegramMessage {
  chat: {
    id: number;
  };
  from: {
    first_name?: string;
    last_name?: string;
  };
  text?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: any;
  [key: string]: any;
}

// Define the registry entry type returned from the RPC function
interface BotRegistryEntry {
  token: string;
  owner_id: string;
  owner_email: string;
  database_url: string;
  database_key: string;
  is_admin_bot: boolean;
}

/**
 * Efficiently process a Telegram webhook request using the bot registry
 * @param token Bot token from the webhook URL
 * @param update The Telegram update object from the request body
 * @returns Processing result with success status
 */
export async function handleTelegramWebhook(token: string, update: TelegramUpdate) {
  console.log('🔔 Processing webhook for token:', token.slice(0, 5) + '…');
  
  try {
    // 1. Fast O(1) lookup from bot registry using RPC
    const admin = createAdminSupabaseClient();
    
    // Primary path: use RPC call to get bot credentials (secure & optimized)
    const { data: botCredentials, error: rpcError } = await admin.rpc(
      'get_bot_credentials',
      { bot_token: token }
    );
    
    if (rpcError) {
      console.error('⚠️ Bot registry lookup error:', rpcError.message);
      console.error('⚠️ Error code:', rpcError.code);
      console.error('⚠️ Error details:', rpcError.details);
      throw rpcError; // Throw to trigger the fallback
    }
    
    if (!botCredentials) {
      console.error('⚠️ Bot not found in registry');
      throw new Error('Bot not registered');
    }
    
    // Inspect what's actually being returned (for debugging)
    console.log('🔍 Bot credentials structure:', 
      JSON.stringify(botCredentials).substring(0, 100) + '...');
    
    // Handle both array and object response formats
    let botEntry: BotRegistryEntry;
    
    if (Array.isArray(botCredentials) && botCredentials.length > 0) {
      console.log('📊 Got array response with', botCredentials.length, 'items');
      botEntry = botCredentials[0] as BotRegistryEntry;
    } else {
      botEntry = botCredentials as BotRegistryEntry;
    }
    
    // // Add detailed logging to diagnose the issue
    // console.log('🔑 Token:', botEntry.token?.substring(0, 5) + '...');
    // console.log('👤 Owner ID:', botEntry.owner_id);
    // console.log('📧 Owner Email:', botEntry.owner_email);
    // console.log('🔗 Database URL:', botEntry.database_url?.substring(0, 15) + '...');
    // console.log('🔐 Database Key:', botEntry.database_key?.substring(0, 5) + '...');
    
    return processWithBotEntry(admin, botEntry, update);
  } catch (error) {
    // Try direct query as fallback with fully qualified column references
    console.log('🔄 Trying direct query as fallback...');
    
    try {
      const admin = createAdminSupabaseClient();
      // Use table alias to avoid ambiguity and order by last_used to get most recent
      const { data: directEntries, error: directErr } = await admin
        .from('bot_registry')
        .select('token, owner_id, owner_email, database_url, database_key, is_admin_bot')
        .eq('token', token)
        .order('last_used', { ascending: false })
        .limit(1);
      
      if (directErr) {
        console.error('❌ Direct query failed too:', directErr.message);
        return { success: false, error: 'Bot not registered in registry' };
      }
      
      if (!directEntries || directEntries.length === 0) {
        console.error('❌ Bot not found in registry via direct query');
        return { success: false, error: 'Bot not found in registry' };
      }
      
      console.log('✅ Found bot via direct query');
      console.log('🔍 Direct query result:', 
        JSON.stringify(directEntries[0]).substring(0, 100) + '...');
      
      // Cast to the correct type
      const botEntry = directEntries[0] as unknown as BotRegistryEntry;
      
      // Add detailed logging to diagnose the issue
      console.log('🔑 Token:', botEntry.token?.substring(0, 5) + '...');
      console.log('👤 Owner ID:', botEntry.owner_id);
      console.log('📧 Owner Email:', botEntry.owner_email);
      console.log('🔗 Database URL:', botEntry.database_url?.substring(0, 15) + '...');
      console.log('🔐 Database Key:', botEntry.database_key?.substring(0, 5) + '...');
      
      return processWithBotEntry(admin, botEntry, update);
    } catch (directQueryError) {
      console.error('❌ Error in direct query fallback:', directQueryError);
      // Original error handling continues
      console.error('❌ Error processing webhook:', error);
      // Safely handle unknown error type
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Process a Telegram update with the appropriate database client
 * Extracted to avoid code duplication
 */
async function processWithBotEntry(admin: any, botEntry: BotRegistryEntry, update: TelegramUpdate) {
  try {
    // Create the appropriate database client based on bot type
    let supabase;
    
    // Add extra validation for required properties
    const hasRequiredCredentials = botEntry.database_url && botEntry.database_key;
    
    if (botEntry.is_admin_bot || !hasRequiredCredentials) {
      if (!hasRequiredCredentials) {
        console.log('⚠️ Missing required credentials, falling back to ADMIN mode');
      } else {
        console.log('👑 Processing as ADMIN bot');
      }
      supabase = admin;
    } else {
      console.log('👤 Processing as USER bot owned by', botEntry.owner_email || 'unknown');
      
      try {
        // Decrypt the stored credentials and create a user client
        const creds = decryptCredentials({
          supabase_url: botEntry.database_url,
          supabase_anon_key: botEntry.database_key,
          _encrypted: true // Mark as encrypted so decryption is attempted
        });
        
        // Add robust logging and fallbacks
        console.log('Database URL:', botEntry.database_url ? 
          (botEntry.database_url.substring(0, 15) + '...') : 'undefined');
        console.log('Database Key:', botEntry.database_key ? 
          (botEntry.database_key.substring(0, 5) + '...') : 'undefined');
        
        // Final safety check for required URL and key
        if (creds.supabase_url && creds.supabase_anon_key) {
          supabase = createClient<Database>(
            creds.supabase_url, 
            creds.supabase_anon_key,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
        } else {
          console.warn('⚠️ Decryption failed or incomplete credentials, falling back to ADMIN mode');
          supabase = admin;
        }
      } catch (decryptError) {
        console.error('❌ Error decrypting credentials:', decryptError);
        console.log('⚠️ Falling back to ADMIN mode due to credential error');
        supabase = admin;
      }
    }
    
    // Process the Telegram update
    if (update.message) {
      await processMessage(supabase, update.message);
    } else if (update.callback_query) {
      // For future implementation of callback query handling
      console.log('📲 Received callback query:', update.callback_query.id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error in processWithBotEntry:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Process an incoming Telegram message
 */
async function processMessage(supabase: any, message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const contactName = `${message.from.first_name || ''}${message.from.last_name ? ' ' + message.from.last_name : ''}`.trim();
  
  console.log(`💬 Message from ${contactName || chatId}: ${message.text || '[non-text content]'}`);
  
  try {
    // 1. Find or create contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('contact_info', chatId)
      .maybeSingle();
    
    let contactId = existingContact?.id;
    const now = new Date().toISOString();
    
    if (!contactId) {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          id: uuidv4(),
          name: contactName,
          contact_info: chatId,
          last_contact: now,
          created_at: now
        })
        .select('id')
        .single();
      
      if (contactError) {
        console.error('❌ Error creating contact:', contactError);
        
        if (contactError.code === '23505') {
          // Handle race condition - try to get the contact again
          const { data: retryContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('contact_info', chatId)
            .maybeSingle();
            
          contactId = retryContact?.id;
        } else {
          throw contactError;
        }
      } else {
        contactId = newContact.id;
        console.log('✅ Created new contact:', contactName, contactId);
      }
    } else {
      // Update existing contact
      await supabase
        .from('contacts')
        .update({
          name: contactName,
          last_contact: now
        })
        .eq('id', contactId);
    }
    
    // 2. Store the message
    if (contactId) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          id: uuidv4(),
          contact_id: contactId,
          content: message.text || JSON.stringify(message),
          timestamp: now,
          is_from_customer: true,
          direction: 'incoming',
          is_sent: true,
          is_viewed: false,
          is_delivered: true,
          created_at: now
        });
      
      if (messageError) {
        console.error('❌ Error storing message:', messageError);
      }
    }
  } catch (error) {
    console.error('❌ Error processing message:', error);
    throw error;
  }
} 