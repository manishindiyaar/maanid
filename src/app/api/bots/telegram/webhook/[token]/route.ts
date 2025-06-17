import { NextResponse } from 'next/server';
import { handleTelegramWebhook } from '@/lib/utils/webhook';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    console.log('🔔 Webhook received from Telegram!');
    const token = decodeURIComponent(params.token);
    console.log('🤖 Bot token:', token.slice(0, 5) + '...');
    
    // Get the message data from the request
    const update = await request.json();
    
    // Try to verify the bot in the registry first - for debugging
    try {
      const admin = createAdminSupabaseClient();
      const { data: botCheck } = await admin
        .from('bot_registry')
        .select('token, owner_email, is_admin_bot')
        .eq('token', token);
      
      if (!botCheck || botCheck.length === 0) {
        console.warn('⚠️ Bot not found in registry, webhook might fail');
      } else {
        console.log(`✅ Bot found in registry: ${botCheck.length} entries, owner: ${botCheck[0].owner_email}, mode: ${botCheck[0].is_admin_bot ? 'ADMIN' : 'USER'}`);
      }
    } catch (checkError) {
      console.warn('⚠️ Could not verify bot registry status:', checkError);
    }
    
    // Use the efficient webhook handler
    const result = await handleTelegramWebhook(token, update);
    
    // Always return a 200 response to Telegram (even on errors)
    // to prevent them from retrying
    return NextResponse.json(
      { success: result.success, ...(result.error ? { error: result.error } : {}) },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    
    // Always return 200 to Telegram - otherwise they will retry
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 }
    );
  }
}

// Dummy GET method to handle webhook verification
export async function GET() {
  return new Response('Telegram Webhook is active and working');
}