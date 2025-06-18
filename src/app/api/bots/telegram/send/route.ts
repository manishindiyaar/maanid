import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Telegraf } from 'telegraf';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

import { getSupabaseClient } from '@/lib/supabase/getSupabaseClient'; // your modular resolver


export async function POST(request: Request) {
  try {
    const { contactId, content, messageId: requestedMessageId, botId } = await request.json();
    const messageId = uuidv4();
    const requestHeaders = new Headers(request.headers);
    const cookieStore = cookies();

    if (!contactId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields', required: ['contactId', 'content'] },
        { status: 400 }
      );
    }

    // Get Supabase client and mode automatically
    const supabase = await getSupabaseClient();

      console.log(`📤 Sending message to contactId: ${contactId} with messageId: ${messageId}`);

    // Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, contact_info, last_contact')
      .eq('id', contactId)
      .maybeSingle();

    if (contactError || !contact) {
      console.error('❌ Contact fetch error:', contactError);
      return NextResponse.json(
        {
          error: 'Contact not found',
         
        },
        { status: 404 }
      );
    }

    const chatId = contact.contact_info;
    if (!chatId) {
      return NextResponse.json(
        { error: 'No chat ID found for this contact' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Store outgoing message
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        contact_id: contactId,
        content,
        timestamp: now,
        is_from_customer: false,
        direction: 'outgoing',
        is_sent: false,
        is_viewed: true,
        is_delivered: false,
        is_processed: false,
        is_ai_response: false,
        message_status: 'pending',
        status: 'pending',
        created_at: now,
        updated_at: now,
      });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to store message', details: insertError.message },
        { status: 500 }
      );
    }

    // Fetch bots
    const { data: bots, error: botsError } = await supabase
      .from('bots')
      .select('id, name, token, platform')
      .eq('platform', 'telegram')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (botsError || !bots?.length) {
      await markMessageFailed(supabase, messageId);
      return NextResponse.json(
        { error: 'No active Telegram bots found' },
        { status: 404 }
      );
    }

    // Try sending with bots
    let sentSuccessfully = false;
    let successfulBot = null;
    let successResult = null;
    let lastError = null;

    for (const bot of bots) {
      if (!bot.token) continue;

      try {
        const telegram = new Telegraf(bot.token);
        const result = await telegram.telegram.sendMessage(chatId, content);
        sentSuccessfully = true;
        successfulBot = bot;
        successResult = result;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Failed with bot ${bot.name}:`, err.message);
      }
    }

    if (sentSuccessfully && successfulBot) {
      await supabase.from('messages').update({
        is_sent: true,
        is_delivered: true,
        message_status: 'delivered',
        status: 'sent',
        updated_at: now,
      }).eq('id', messageId);

      await supabase.from('contacts').update({
        last_contact: now,
      }).eq('id', contactId);

      return NextResponse.json({
        success: true,
        messageId,
        originalMessageId: requestedMessageId,
        bot: {
          id: successfulBot.id,
          name: successfulBot.name,
          platform: successfulBot.platform,
        },
        result: successResult,
        
      });
    } else {
      await markMessageFailed(supabase, messageId);

      return NextResponse.json(
        {
          error: 'Failed to send message with any Telegram bot',
          details: lastError?.message ?? 'Unknown error',
         
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Unexpected error in Telegram send:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

async function markMessageFailed(supabase: any, messageId: string) {
  try {
    await supabase
      .from('messages')
      .update({
        is_sent: false,
        is_delivered: false,
        message_status: 'failed',
        status: 'pending',
      })
      .eq('id', messageId);
  } catch (err) {
    console.error('Failed to mark message as failed:', err);
  }
}
