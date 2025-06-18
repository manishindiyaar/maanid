import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from './../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET handler for fetching unseen messages
 * Supports query parameters:
 * - limit: number of messages to return (default: 50)
 * - includeViewed: whether to include viewed messages (default: false)
 * - fromCustomer: filter by messages from customer (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📥 Checking for unseen messages');
    
    // Use server supabase client to respect admin mode
    const supabase = await getServerSupabaseClient(request.headers);
    
    // Find all unviewed messages from customers
    const { data: unseenMessages, error } = await supabase
      .from('messages')
      .select('id, content, contact_id, timestamp, contacts:contact_id(id, name)')
      .eq('is_from_customer', true)
      .eq('is_viewed', false)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching unseen messages:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    if (!unseenMessages || unseenMessages.length === 0) {
      return NextResponse.json({
        success: true,
        messages: [],
        count: 0
      });
    }
    
    console.log(`📨 Found ${unseenMessages.length} unseen messages`);
    
    return NextResponse.json({
      success: true,
      messages: unseenMessages,
      count: unseenMessages.length
    });
  } catch (error) {
    console.error('Error retrieving unseen messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
