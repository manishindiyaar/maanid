import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from './../../../../lib/supabase/server';

/**
 * GET handler for retrieving unviewed messages
 */
export async function GET(request: Request) {
  try {
    console.log('📥 API: Fetching unviewed messages');
    
    // Get server supabase client
    const supabase = await getServerSupabaseClient(request.headers);
    
    // Get unviewed messages
    const { data: unseenMessages, error } = await supabase.rpc('get_unseen_messages');
    
    if (error) {
      console.error('❌ Error fetching unviewed messages:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${error.message}`
        },
        { status: 500 }
      );
    }
    
    if (!unseenMessages || unseenMessages.length === 0) {
      console.log('ℹ️ No unviewed messages found in database');
      return NextResponse.json({
        success: true,
        messages: []
      });
    }
    
    console.log(`📨 Found ${unseenMessages.length} unviewed messages`);
    
    return NextResponse.json({
      success: true,
      messages: unseenMessages,
      count: unseenMessages.length
    });
    
  } catch (error) {
    console.error('❌ Error retrieving unviewed messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { contactId } = requestBody;

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: contactId is required' },
        { status: 400 }
      );
    }

    console.log(`API: Marking all unviewed messages as viewed for contact ID: ${contactId}`);
    
    // Use the server supabase client for better auth handling
    const supabase = await getServerSupabaseClient(request.headers);
    
    // Find all unviewed messages from this customer first
    const { data: unviewedMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .eq('contact_id', contactId)
      .eq('is_from_customer', true)
      .eq('is_viewed', false);
    
    if (fetchError) {
      console.error('Error fetching unviewed messages:', fetchError);
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!unviewedMessages || unviewedMessages.length === 0) {
      console.log(`No unviewed messages found for contact ${contactId}`);
      return NextResponse.json({ 
        success: true, 
        updatedCount: 0,
        data: []
      });
    }
    
    console.log(`Found ${unviewedMessages.length} unviewed messages for contact ${contactId}`);
    
    // Get the message IDs
    const messageIds = unviewedMessages.map(msg => msg.id);
    
    // Update all the unviewed messages
    const { data, error } = await supabase
      .from('messages')
      .update({ is_viewed: true })
      .eq('contact_id', contactId)
      .in('id', messageIds)
      .select();
    
    if (error) {
      console.error('Error updating messages:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    console.log(`Successfully marked ${data?.length || 0} messages as viewed for contact ${contactId}`);
    
    // Return the updated records
    return NextResponse.json({ 
      success: true, 
      updatedCount: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    console.error('Unexpected error marking messages as viewed:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 