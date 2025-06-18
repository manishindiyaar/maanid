import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from './../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Extract contactId from URL search params
    const url = new URL(request.url);
    const contactId = url.searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    console.log(`API: Checking message view status for contact ID: ${contactId}`);
    
    // Use the server Supabase client to ensure we get the latest data
    const supabase = await getServerSupabaseClient(request.headers);
    
    // Check for unviewed messages from the specified contact
    const { data: unviewedMessages, error } = await supabase
      .from('messages')
      .select('id, content, timestamp, is_viewed')
      .eq('contact_id', contactId)
      .eq('is_from_customer', true)
      .eq('is_viewed', false);
    
    if (error) {
      console.error('Error checking message view status:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    const hasUnviewed = unviewedMessages && unviewedMessages.length > 0;
    
    return NextResponse.json({
      success: true,
      hasUnviewedMessages: hasUnviewed,
      unviewedCount: unviewedMessages?.length || 0,
      unviewedMessages: unviewedMessages || []
    });
  } catch (error) {
    console.error('Unexpected error checking message view status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
