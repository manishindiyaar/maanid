import { NextResponse } from 'next/server';
import { supabase } from './../../../../lib/supabase/client';

export async function GET() {
  try {
    console.log('Fetching message statistics');
    
    // Get the total number of messages sent by AI
    const { data: repliedMessages, error: repliedError } = await supabase
      .from('messages')
      .select('id, contact_id')
      .eq('is_ai_response', true);
    
    if (repliedError) {
      console.error('Error fetching replied messages:', repliedError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${repliedError.message}`
        },
        { status: 500 }
      );
    }

    // Get unread messages count
    const { data: unreadMessages, error: unreadError } = await supabase
      .from('messages')
      .select('id')
      .eq('is_from_customer', true)
      .eq('is_viewed', false);
    
    if (unreadError) {
      console.error('Error fetching unread messages:', unreadError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${unreadError.message}`
        },
        { status: 500 }
      );
    }

    // Extract unique customer IDs from replied messages
    const uniqueCustomerIds = Array.from(new Set(repliedMessages.map(msg => msg.contact_id)));
    
    return NextResponse.json({
      success: true,
      stats: {
        repliesSent: repliedMessages.length,
        unreadCount: unreadMessages.length,
        uniqueCustomers: uniqueCustomerIds,
        uniqueCustomersCount: uniqueCustomerIds.length
      }
    });
  } catch (error) {
    console.error('Error in messages stats API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 