import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './../../../../lib/supabase/client';
import { getServerSupabaseClient } from './../../../../lib/supabase/server';

// In-memory cache for message status
const messageStatusCache = new Map<string, any>();

/**
 * GET handler for checking message status
 */
export async function GET(request: NextRequest) {
  try {
    // Get message ID from query params
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Missing message ID' },
        { status: 400 }
      );
    }

    // Check if we have cached status for this message
    if (messageStatusCache.has(messageId)) {
      return NextResponse.json({
        success: true,
        message: messageStatusCache.get(messageId)
      });
    }

    // Get message from database
    const { data: message, error } = await supabase
      .from('messages')
      .select('*, contacts(*)')
      .eq('id', messageId)
      .single();

    if (error || !message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Create a response with the message status
    const messageStatus = {
      id: message.id,
      status: message.is_viewed ? 'completed' : 'analyzing',
      processingStage: {
        stage: message.is_viewed ? 'completed' : 'analyzing',
        details: message.is_viewed 
          ? 'Message has been processed' 
          : 'Message is being analyzed...'
      },
      agentName: message.agent_name || 'AI Assistant',
      agentDescription: message.agent_description || '',
      response: message.response || ''
    };

    // Cache the status
    messageStatusCache.set(messageId, messageStatus);

    // Clean up old entries after 5 minutes
    setTimeout(() => {
      messageStatusCache.delete(messageId);
    }, 5 * 60 * 1000);

    return NextResponse.json({
      success: true,
      message: messageStatus
    });
  } catch (error) {
    console.error('Error checking message status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GETContact(request: Request) {
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

    console.log(`API: Checking message status for contact ID: ${contactId}`);
    
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
      console.error('Error checking message status:', error);
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
    console.error('Unexpected error checking message status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 