/**
 * Memory API Route
 * Endpoints for storing and retrieving memory information
 */

import { NextRequest, NextResponse } from 'next/server';
import { Memory, processMessageMemory, retrieveMemories } from './memoryService';

/**
 * GET /api/memory
 * Retrieves memories relevant to a message/query
 * Supports query parameters:
 * - userId: User ID to retrieve memories for (required)
 * - query: Text to match against memories (required)
 * - limit: Maximum number of memories to retrieve (optional)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('query');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    
    // Validate required parameters
    if (!userId || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and query are required' },
        { status: 400 }
      );
    }
    
    console.log(`Memory retrieval request for user ${userId} with query: ${query}`);
    
    // Retrieve relevant memories for the user and query
    // Pass request headers to ensure correct Supabase client is used
    const result = await retrieveMemories(userId, query, limit, request.headers);
    
    // Return the matching memories
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in memory GET endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving memories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memory
 * Processes and stores memories from a message
 * Request body:
 * - message: Message content to process (required)
 * - userId: User ID associated with the message (required)  
 * - messageId: Optional message ID for reference
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    const { userId, message, messageId } = body;
    
    // Validate required parameters
    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and message are required' },
        { status: 400 }
      );
    }
    
    console.log(`Memory processing request for user ${userId}, message length: ${message.length}`);
    
    // Process the message for memory storage
    // Pass request headers to ensure correct Supabase client is used
    const result = await processMessageMemory(message, userId, messageId, request.headers);
    
    // Return the processing result
    return NextResponse.json({
      success: result.stored,
      memoryCount: result.memoryCount,
      message: result.stored 
        ? `Successfully stored ${result.memoryCount} memories` 
        : 'No memories extracted from message'
    });
  } catch (error) {
    console.error('Error in memory POST endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing memory' },
      { status: 500 }
    );
  }
} 