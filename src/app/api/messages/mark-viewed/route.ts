import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from './../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { contactId, messageIds } = requestBody;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: messageIds array is required' },
        { status: 400 }
      );
    }

    console.log(`API: Marking ${messageIds.length} messages as viewed. Contact ID: ${contactId || 'not specified'}`);
    
    // Use the server supabase client for better auth handling
    const supabase = await getServerSupabaseClient(request.headers);
    
    // Start with a basic query
    let query = supabase
      .from('messages')
      .update({ is_viewed: true }); 
    
    // Add filters
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    
    // Add message IDs filter
    query = query.in('id', messageIds);
    
    // Execute the update
    const { data, error } = await query.select();
    
    if (error) {
      console.error('Error updating messages:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    console.log(`Successfully marked ${data?.length || 0} messages as viewed`);
    
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
