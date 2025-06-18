import { NextResponse } from 'next/server';
import { supabase } from './../../../lib/supabase/client';

export const dynamic = 'force-dynamic';

// Import the autopilot status
import { GET as getAutopilotStatus } from './status/route';

// GET: Fetch unseen messages
export async function GET() {
  try {
    // Check if autopilot is active
    const statusResponse = await getAutopilotStatus();
    const status = await statusResponse.json();
    
    if (!status.active) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        message: "Autopilot is not active" 
      });
    }

    // Use the RPC function to get unseen messages
    const { data, error } = await supabase.rpc('get_unseen_messages');

    if (error) {
      console.error('Error getting unseen messages:', error);
      return NextResponse.json({ success: false, error: 'Failed to get unseen messages' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    // Log the first contact info for debugging
    if (data.length > 0) {
      console.log('Sample contact info from backend:', data[0].contact_info);
    }

    // Group messages by contact
    const contactsMap: Record<string, any> = {};
    
    for (const row of data) {
      const contactId = row.contact_id;
      
      if (!contactsMap[contactId]) {
        contactsMap[contactId] = {
          id: contactId,
          name: row.contact_name,
          contact_info: row.contact_info,
          messages: [],
        };
      }
      
      contactsMap[contactId].messages.push({
        id: row.message_id,
        content: row.message_content,
        timestamp: row.message_timestamp,
        is_from_customer: row.is_from_customer,
        is_viewed: false
      });
    }
    
    const unseenContacts = Object.values(contactsMap).map(contact => ({
      ...contact,
      unseenCount: contact.messages.length
    }));

    console.log(`Found ${unseenContacts.length} contacts with unseen messages`);
    
    return NextResponse.json({ success: true, data: unseenContacts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching unseen messages:', errorMessage);
    return NextResponse.json(
      { success: false, error: `Failed to fetch unseen messages: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// POST: Mark a message as viewed
export async function POST(request: Request) {
  try {
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Check if the message exists
    const { data: checkData, error: checkError } = await supabase
      .from('messages')
      .select('id, is_viewed')
      .eq('id', messageId)
      .single();
      
    if (checkError) {
      console.error('Error checking message:', checkError);
      return NextResponse.json(
        { success: false, error: `Message not found: ${checkError.message}` },
        { status: 404 }
      );
    }
    
    // If message is already viewed, just return success
    if (checkData.is_viewed) {
      return NextResponse.json({ 
        success: true, 
        data: checkData,
        message: 'Message was already marked as viewed'
      });
    }

    // Update the message as viewed
    const { data, error } = await supabase
      .from('messages')
      .update({ is_viewed: true })
      .eq('id', messageId)
      .select();

    if (error) {
      console.error('Error marking message as viewed:', error);
      throw error;
    }

    console.log(`Successfully marked message ${messageId} as viewed`);

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Message marked as viewed successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error marking message as viewed:', errorMessage);
    return NextResponse.json(
      { success: false, error: `Failed to mark message as viewed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT: Update message processing status
export async function PUT(request: Request) {
  try {
    const { messageId, status } = await request.json();

    if (!messageId || !status) {
      return NextResponse.json(
        { success: false, error: 'Message ID and status are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you might have a separate table to track processing status
    // For now, we'll just return success
    return NextResponse.json({ 
      success: true, 
      data: { messageId, status }
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update message status' },
      { status: 500 }
    );
  }
} 
