/**
 * API endpoint for checking unviewed messages from Supabase
 * This endpoint fetches all unviewed messages from customers
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './../../../../lib/supabase/client';

/**
 * GET handler for fetching unseen messages
 * Returns a list of all unseen messages from customers
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching unseen messages from check-msgs API endpoint');
    
    // Get unviewed messages from the database
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, contacts(*)')
      .eq('is_from_customer', true)
      .eq('is_viewed', false)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching unseen messages:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${error.message}`
        },
        { status: 500 }
      );
    }
    
    console.log(`✅ Found ${messages?.length || 0} unseen messages`);
    
    return NextResponse.json({
      success: true,
      messages: messages || []
    });
  } catch (error) {
    console.error('❌ Error in check-msgs API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
