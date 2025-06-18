import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from './../../../lib/supabase/server';
import { deleteMemoriesByMessageIds } from "../memory/memoryService";

export const dynamic = 'force-dynamic';



// Handler for DELETE requests
export async function DELETE(request: NextRequest) {
  try {
    // Extract message IDs from query parameters
    const url = new URL(request.url);
    const ids = url.searchParams.get('ids');
    const contactId = url.searchParams.get('contactId');
    
    if (!ids && !contactId) {
      return NextResponse.json(
        { success: false, error: 'No message IDs or contact ID provided' },
        { status: 400 }
      );
    }
    
    // Get appropriate Supabase client based on headers
    const isUserMode = request.headers.get('x-bladex-user-mode') === 'true';
    console.log(`Mode when deleting messages: ${isUserMode ? 'User Mode' : 'Admin Mode'}`);
    
    const supabase = await getServerSupabaseClient(request.headers);
    
    let messageIds: string[] = [];
    
    // If specific message IDs were provided
    if (ids) {
      messageIds = ids.split(',');
      console.log(`Deleting ${messageIds.length} specific messages`);
    } 
    // If contact ID was provided, get all message IDs for that contact
    else if (contactId) {
      console.log(`Fetching messages for contact: ${contactId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('contact_id', contactId);
        
      if (error) {
        console.error('Error fetching messages for contact:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch messages' },
          { status: 500 }
        );
      }
      
      messageIds = data.map(msg => msg.id);
      console.log(`Found ${messageIds.length} messages for contact ${contactId}`);
    }
    
    if (messageIds.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No messages to delete' }
      );
    }
    
    // IMPORTANT: First delete associated memories to avoid foreign key constraint errors
    console.log('Deleting associated memories first...');
    const memoriesDeleted = await deleteMemoriesByMessageIds(messageIds);
    
    if (!memoriesDeleted) {
      console.warn('Failed to delete some associated memories');
      // Continue anyway, as some messages might not have memories
    }
    
    // Now delete the messages
    console.log('Deleting messages...');
    const { error } = await supabase
      .from('messages')
      .delete()
      .in('id', messageIds);
      
    if (error) {
      console.error('Error deleting messages:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete messages' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${messageIds.length} messages`
    });
  } catch (error) {
    console.error('Error in delete messages handler:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 
