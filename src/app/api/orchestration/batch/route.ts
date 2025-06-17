/**
 * Batch Orchestration API endpoint
 * This endpoint processes multiple messages together as a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './../../../../lib/supabase/client';
import { getServerSupabaseClient } from './../../../../lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { getApiBaseUrl } from './../../../../lib/utils';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// Import message status functions from parent
import { 
  updateMessageStatus, 
  addMessageToProcessing,
  markMessageAsProcessed,
  processedMessages,
  messageStatusCache
  } from '../messageStatusUtils'; // This file will be created in the next step

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> {
  let numRetries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (numRetries >= maxRetries) {
        console.error(`Max retries (${maxRetries}) reached, giving up:`, error);
        throw error;
      }
      
      numRetries++;
      console.log(`Attempt ${numRetries} failed, retrying in ${delay}ms...`);
      
      // Wait for the delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }
}

/**
 * Process a batch of messages together
 */
async function processBatchMessages(
  messageIds: string[],
  primaryId: string,
  combinedContent: string,
  requestHeaders?: Headers
) {
  console.log(`Processing batch of ${messageIds.length} messages with primary message ${primaryId}`);
  
  if (messageIds.length === 0) {
    throw new Error('No message IDs provided for batch processing');
  }
  
  // Skip if primary message is already processed
  if (processedMessages.has(primaryId)) {
    console.log(`Primary message ${primaryId} already processed, skipping batch`);
    return {
      success: true,
      status: 'already_processed'
    };
  }
  
  // Mark all messages as being processed, with primary as the main one
  messageIds.forEach(id => {
    addMessageToProcessing(id);
    
    // Update each message status
    updateMessageStatus(id, 'analyzing', {
      stage: 'analyzing',
      details: id === primaryId 
        ? 'Processing batch of messages...' 
        : 'Part of a batch being processed'
    });
  });
  
  try {
    // Get the correct Supabase client based on request headers
    let dbClient = supabase;
    if (requestHeaders) {
      try {
        console.log(`Getting server-specific Supabase client for batch processing`);
        dbClient = await getServerSupabaseClient(requestHeaders);
        
        // Log if we're in user mode
        const isUserMode = requestHeaders.get('x-bladex-user-mode') === 'true';
        console.log(`Batch processing in ${isUserMode ? 'User Mode' : 'Admin Mode'}`);
      } catch (clientError) {
        console.error('Error getting server-specific Supabase client:', clientError);
        console.log('Falling back to default Supabase client');
      }
    }
    
    // Fetch primary message to get contact details
    const { data: primaryMessage, error: primaryError } = await dbClient
      .from('messages')
      .select('*, contacts(*)')
      .eq('id', primaryId)
      .maybeSingle();
    
    if (primaryError) {
      throw new Error(`Failed to fetch primary message: ${primaryError.message}`);
    }
    
    if (!primaryMessage) {
      throw new Error('Primary message not found');
    }
    
    // Fetch all agents to find the best one
    const { data: agents, error: agentsError } = await dbClient
      .from('agents')
      .select('*');
    
    if (agentsError || !agents || agents.length === 0) {
      throw new Error(`Failed to fetch agents: ${agentsError?.message || 'No agents found'}`);
    }
    
    // Select an agent (using the first one for now, could be improved)
    const agent = agents.find(a => a.enabled !== false) || agents[0];
    
    // Update primary message status to show selected agent
    updateMessageStatus(primaryId, 'delegating', {
      stage: 'delegating',
      details: `Selected ${agent.name} to handle your conversation...`,
      agentName: agent.name,
      agentDescription: agent.description,
      processingDetails: {
        selectedAgent: agent.name,
        agentDescription: agent.description,
        batchSize: messageIds.length
      }
    });
    
    // Construct system prompt for handling multiple messages
    let systemPrompt = `You are ${agent.name}`;
    if (agent.description) {
      systemPrompt += `, ${agent.description}`;
    }
    systemPrompt += `. You are responding to a conversation with multiple messages. 
Provide a single comprehensive response that addresses all the points mentioned by the user.
Be concise but thorough, and maintain a friendly, helpful tone.`;
    
    // Use agent's custom system prompt if available
    if (agent.config && agent.config.system_prompt) {
      systemPrompt = agent.config.system_prompt;
    }
    
    // Update status to replying
    updateMessageStatus(primaryId, 'replying', {
      stage: 'replying',
      details: `${agent.name} is composing a response to your conversation...`,
      agentName: agent.name,
      agentDescription: agent.description
    });
    
    // Generate a response with Claude
    const response = await retryWithBackoff(() => 
      anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Here are multiple messages from a conversation. Please respond to all of them in a single response:\n\n${combinedContent}`
          }
        ]
      })
    );
    
    const reply = response.content[0].text;
    
    // Mark all messages as viewed in the database
    const { error: updateError } = await dbClient
      .from('messages')
      .update({ is_viewed: true })
      .in('id', messageIds);
    
    if (updateError) {
      console.error(`Warning: Failed to mark all messages as viewed: ${updateError.message}`);
    }
    
    // Send the single consolidated response
    try {
      const sendResponse = await fetch(`${getApiBaseUrl()}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactId: primaryMessage.contact_id,
          contactInfo: primaryMessage.contacts?.contact_info,
          message: reply,
          agentName: agent.name
        })
      });
      
      if (!sendResponse.ok) {
        console.error(`Warning: Failed to send response: ${sendResponse.status}`);
      }
    } catch (sendError) {
      console.error(`Error sending batch response: ${sendError}`);
    }
    
    // Update primary message status to completed
    updateMessageStatus(primaryId, 'completed', {
      stage: 'completed',
      details: `${agent.name} responded to your conversation`,
      agentName: agent.name,
      agentDescription: agent.description,
      response: reply
    });
    
    // Mark all messages as processed
    messageIds.forEach(id => {
      markMessageAsProcessed(id);
    });
    
    return {
      success: true,
      messageIds,
      primaryId,
      agentName: agent.name,
      response: reply
    };
  } catch (error) {
    console.error(`Error processing batch: ${error}`);
    
    // Update primary message status to error
    updateMessageStatus(primaryId, 'error', {
      details: `Error processing batch: ${error instanceof Error ? error.message : String(error)}`
    });
    
    // Mark all as error then processed
    messageIds.forEach(id => {
      markMessageAsProcessed(id);
    });
    
    throw error;
  }
}

/**
 * POST handler for batch processing
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log('POST /api/orchestration/batch - Processing batch of messages');
  
  try {
    const body = await req.json();
    console.log('Batch request body:', body);
    
    // Log headers for debugging
    console.log('Request headers:', {
      'x-bladex-user-mode': req.headers.get('x-bladex-user-mode'),
      'x-user-email': req.headers.get('x-user-email')
    });
    
    const { messageIds, primaryId, combinedContent } = body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty messageIds array' },
        { status: 400 }
      );
    }
    
    // For batch processing
    if (primaryId && combinedContent) {
      console.log(`Starting batch processing for ${messageIds.length} messages with primary: ${primaryId}`);
      
      // Process the batch asynchronously
      processBatchMessages(messageIds, primaryId, combinedContent, req.headers).catch(error => {
        console.error(`Error in async batch processing: ${error}`);
      });
      
      return NextResponse.json({
        success: true,
        status: 'processing',
        primaryId,
        messageIds,
        details: 'Batch processing started'
      });
    }
    
    // For single message processing
    if (messageIds.length === 1) {
      const messageId = messageIds[0];
      console.log(`Processing single message: ${messageId}`);
      
      // Process message async
      processMessage(messageId, req.headers).catch(error => {
        console.error(`Error processing message: ${error}`);
      });
      
      return NextResponse.json({
        success: true,
        status: 'processing',
        messageId,
        details: 'Processing started'
      });
    }
    
    return NextResponse.json({ error: 'Invalid batch request' }, { status: 400 });
  } catch (error) {
    console.error('Error in batch processing:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function processMessage(messageId: string, requestHeaders?: Headers): Promise<any> {
  console.log(`Processing message in batch: ${messageId}`);
  
  // Get the correct Supabase client based on request headers
  let dbClient = supabase;
  if (requestHeaders) {
    try {
      console.log(`Getting server-specific Supabase client for individual message processing`);
      dbClient = await getServerSupabaseClient(requestHeaders);
    } catch (clientError) {
      console.error('Error getting server-specific Supabase client:', clientError);
      console.log('Falling back to default Supabase client');
    }
  }
  
  // Fetch message details
  const { data: message, error: messageError } = await dbClient
    .from('messages')
    .select('*, contacts(*)')
    .eq('id', messageId)
    .maybeSingle();
  
  if (messageError) {
    console.error(`Error fetching message ${messageId}:`, messageError);
    return {
      id: messageId,
      success: false,
      error: messageError.message
    };
  }
  
  if (!message) {
    console.error(`Message ${messageId} not found`);
    return {
      id: messageId,
      success: false,
      error: `Message not found`
    };
  }
  
  // Basic implementation for now - this will be expanded
  return {
    id: messageId,
    success: true,
    message
  };
} 