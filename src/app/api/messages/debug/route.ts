import { NextResponse } from 'next/server';
import { supabase } from './../../../../lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get the most recent messages
    const { data: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select('*, contacts(*)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent messages:', recentError);
      return NextResponse.json(
        { success: false, error: recentError.message },
        { status: 500 }
      );
    }

    // Get unviewed message counts
    const { data: unviewedMessages, error: unviewedError } = await supabase
      .from('messages')
      .select('id')
      .eq('is_viewed', false)
      .eq('is_from_customer', true);

    if (unviewedError) {
      console.error('Error fetching unviewed messages:', unviewedError);
      return NextResponse.json(
        { success: false, error: unviewedError.message },
        { status: 500 }
      );
    }

    // Get processed message counts
    const { data: processedMessages, error: processedError } = await supabase
      .from('messages')
      .select('id')
      .eq('is_ai_response', true);

    if (processedError) {
      console.error('Error fetching processed messages:', processedError);
      return NextResponse.json(
        { success: false, error: processedError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        unviewedMessageCount: unviewedMessages?.length || 0,
        processedMessageCount: processedMessages?.length || 0
      },
      recentMessages
    });
  } catch (error) {
    console.error('Unexpected error in debug endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
