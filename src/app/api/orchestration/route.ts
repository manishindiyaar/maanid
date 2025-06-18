/**
 * Main Orchestration API endpoint
 * This endpoint coordinates the three sub-endpoints:
 * 1. check-msgs: Fetches unviewed messages
 * 2. agents-scoring: Scores and selects the best agent for a message
 * 3. response: Generates a response using the selected agent
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { 
  MessageStatus,
  updateMessageStatus, 
  addMessageToProcessing,
  markMessageAsProcessed,
  isMessageBeingProcessed,
  processingMessages,
  processedMessages,
  messageStatusCache
} from './messageStatusUtils';
import { 
  getUserNameFromMemory, 
  processMessageMemory, 
  retrieveMemories, 
  formatMemoryContext 
} from '../memory/memoryService';

// Define API base URL helper
async function getApiBaseUrl(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    try {
      // Try to detect ngrok URL in development mode
      const ngrokUrl = await detectNgrokUrl();
      console.log('🌐 [API] Using ngrok URL for API base:', ngrokUrl);
      return ngrokUrl;
    } catch (error) {
      console.warn('⚠️ [API] Could not detect ngrok URL, falling back to localhost:', error);
      return 'http://localhost:3000';
    }
  }
  
  // In production mode, use NEXT_APP_URL
  return process.env.NEXT_APP_URL || 'https://bladexlab.com';
}

// Helper function to automatically detect the ngrok URL
async function detectNgrokUrl(): Promise<string> {
  try {
    console.log('🔍 [API] Attempting to auto-detect ngrok URL...');
    const ngrokResponse = await fetch('http://localhost:4040/api/tunnels');
    
    if (!ngrokResponse.ok) {
      throw new Error(`Failed to fetch ngrok tunnels: ${ngrokResponse.status}`);
    }
    
    const ngrokData = await ngrokResponse.json();
    
    if (!ngrokData.tunnels || ngrokData.tunnels.length === 0) {
      throw new Error('No ngrok tunnels found');
    }
    
    // Find HTTPS tunnels
    const httpsTunnels = ngrokData.tunnels.filter(
      (tunnel: { proto: string; public_url: string }) => 
        tunnel.proto === 'https' && tunnel.public_url
    );
    
    if (httpsTunnels.length === 0) {
      throw new Error('No HTTPS ngrok tunnels found');
    }
    
    // Use the first HTTPS tunnel
    const ngrokUrl = httpsTunnels[0].public_url;
    console.log('✅ [API] Auto-detected ngrok URL:', ngrokUrl);
    return new URL(ngrokUrl).origin;
  } catch (error) {
    console.error('❌ [API] Error auto-detecting ngrok URL:', error);
    
    // Fallback to environment variable
    if (process.env.NGROK_URL) {
      console.log('⚠️ [API] Using NGROK_URL from environment:', process.env.NGROK_URL);
      return process.env.NGROK_URL;
    }
    
    // No fallback available
    throw new Error('No valid webhook URL available. Please start ngrok or set NGROK_URL environment variable.');
  }
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// Agent interface
interface Agent {
  id: string;
  name: string;
  description?: string;
  priority?: string;
  enabled?: boolean;
  config?: any;
  score?: number;
  agentName?: string;
  agentDescription?: string;
}

// Message interface
interface Message {
  id: string;
  content: string;
  created_at: string;
  is_from_customer: boolean;
  is_viewed: boolean;
  contact_id: string;
  direction?: string;
  timestamp?: string;
  contacts?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  contact_name?: string;
  contact_info?: string;
  is_ai_response?: boolean;
  is_sent?: boolean;
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Promise with the result of the function
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
 * Score agents based on message content
 * @param agents List of agents to score
 * @param messageContent Message content to match against
 * @returns Scored agents sorted by score
 */
function scoreAgents(agents: Agent[], messageContent: string): Agent[] {
  console.log(`Scoring ${agents.length} agents for message content: ${messageContent.substring(0, 50)}...`);
  
  // Convert content to lowercase for case-insensitive matching
  const lowerContent = messageContent.toLowerCase();
  
  const scoredAgents = agents.map(agent => {
    let score = 0.5; // Default medium score
    
    // Add score based on agent priority if available
    if (agent.priority === 'high') {
      score += 0.2;
    } else if (agent.priority === 'low') {
      score -= 0.2;
    }
    
    // Only enabled agents should be considered
    if (agent.enabled === false) {
      score = 0;
    }
    
    // Match keywords from agent description and name if available
    if (agent.description) {
      const keywords = agent.description.toLowerCase().split(/\s+/);
      for (const keyword of keywords) {
        if (keyword.length > 3 && lowerContent.includes(keyword)) {
          score += 0.1; // Boost score for each keyword match
        }
      }
    }
    
    if (agent.name) {
      const nameKeywords = agent.name.toLowerCase().split(/\s+/);
      for (const keyword of nameKeywords) {
        if (keyword.length > 3 && lowerContent.includes(keyword)) {
          score += 0.15; // Higher boost for name matches
        }
      }
    }
    
    return {
      ...agent,
      score
    };
  });
  
  // Sort by score (highest first)
  return scoredAgents.sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * Process a message by coordinating the three sub-endpoints
 * @param messageId Message ID to process
 * @param requestHeaders Optional request headers for retrieving the correct Supabase client
 * @returns Message status
 */
async function processMessage(messageId: string, requestHeaders?: Headers): Promise<MessageStatus> {
  console.log(`Processing message: ${messageId}`);
  
  // Still check if the message is already being processed to prevent concurrent processing
  // but simplify the check to make it less strict
  if (isMessageBeingProcessed(messageId) && messageStatusCache.has(messageId)) {
    console.log(`Message ${messageId} is already being processed, returning current status`);
    return messageStatusCache.get(messageId)!;
  }
  
  // Make sure message is marked as processing
  if (!isMessageBeingProcessed(messageId)) {
    addMessageToProcessing(messageId);
  }
  
  // Update status to analyzing
  updateMessageStatus(messageId, 'analyzing', {
    stage: 'analyzing',
    details: 'Fetching message details...'
  });
  
  try {
    // Get the correct Supabase client based on request headers
    // This ensures we use the right database in user mode
    let dbClient = supabase;
    if (requestHeaders) {
      try {
        console.log(`Getting server-specific Supabase client for message processing`);
        dbClient = await getServerSupabaseClient(requestHeaders);
        console.log(`Server Supabase client created with user credentials`);
      } catch (clientError) {
        console.error('Error getting server-specific Supabase client:', clientError);
        console.log('Falling back to default Supabase client');
      }
    }
    
    // Fetch the message directly from the database instead of calling an API
    console.log(`Fetching message ${messageId} from database`);
    
    // Log the database connection to debug
    try {
      // Safely log information about the database connection
      console.log(`Database connection: ${dbClient ? 'Active' : 'Not available'}`);
      // Try to get configuration from process.env
      const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not found in env';
      console.log(`Configured Database URL: ${configuredUrl.slice(0, 20)}...`);
      // Log the mode
      const isUserMode = requestHeaders?.get('x-bladex-user-mode') === 'true';
      console.log(`Processing in ${isUserMode ? 'User Mode' : 'Admin Mode'}`);
    } catch (logError) {
      console.error('Error logging database info:', logError);
    }
    
    // First, try to verify the message exists in the database
    const { count, error: countError } = await dbClient
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('id', messageId);
      
    if (countError) {
      console.error(`Error checking if message exists: ${countError.message}`, countError);
      updateMessageStatus(messageId, 'error', {
        details: `Error checking if message exists: ${countError.message}`
      });
      markMessageAsProcessed(messageId);
      return messageStatusCache.get(messageId)!;
    }
    
    if (count === 0) {
      console.error(`Message ${messageId} does not exist in database (count: ${count})`);
      updateMessageStatus(messageId, 'error', {
        details: `Message ${messageId} does not exist in database`
      });
      markMessageAsProcessed(messageId);
      return messageStatusCache.get(messageId)!;
    }
    
    console.log(`Message ${messageId} exists in database (count: ${count})`);
    
    // Then fetch the complete message
    const { data: message, error } = await dbClient
      .from('messages')
      .select('*, contacts(*)')
      .eq('id', messageId)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching message: ${error.message}`, error);
      updateMessageStatus(messageId, 'error', {
        details: `Error fetching message: ${error.message}`
      });
      markMessageAsProcessed(messageId);
      return messageStatusCache.get(messageId)!;
    }
    
    if (!message) {
      console.error(`Message not found with ID: ${messageId}`);
      updateMessageStatus(messageId, 'error', {
        details: `Message not found with ID: ${messageId}`
      });
      markMessageAsProcessed(messageId);
      return messageStatusCache.get(messageId)!;
    }
    
    console.log(`Found message: ${JSON.stringify({
      id: message.id,
      content: message.content?.substring(0, 50) + '...',
      contact_id: message.contact_id,
      hasContacts: !!message.contacts
    }, null, 2)}`);
    
    // Update status to analyzing with message info
    updateMessageStatus(messageId, 'analyzing', {
      stage: 'analyzing',
      details: 'Analyzing message content...'
    });
    
    // Process incoming message for memory storage
    if (message.contact_id) {
      try {
        // Store this message in memory using direct function call with headers
        console.log('Storing message in memory using direct function call');
        const memoryResult = await processMessageMemory(
          message.content,
          message.contact_id,
          message.id,
          requestHeaders
        );

        console.log(`Memory processing result: ${memoryResult.stored ? 
          `Stored ${memoryResult.memoryCount} memories` : 
          'No memories stored'}`);
      } catch (memoryError) {
        console.error('Error processing message for memory:', memoryError);
        // Continue processing even if memory storage fails
      }
    }
    
    // Fetch all available agents from the database
    console.log('Fetching agents from database');
    const { data: agents, error: agentsError } = await dbClient
      .from('agents')
      .select('*');
    
    if (agentsError || !agents) {
      console.error(`Error fetching agents: ${agentsError?.message || 'No agents found'}`);
      updateMessageStatus(messageId, 'error', {
        details: `Error fetching agents: ${agentsError?.message || 'No agents found'}`
      });
      markMessageAsProcessed(messageId);
      return messageStatusCache.get(messageId)!;
    }
    
    // Score agents for this message
    console.log(`Scoring ${agents.length} agents for message`);
    const scoredAgents = scoreAgents(agents, message.content);
    
    // Update status with agent scoring results
    updateMessageStatus(messageId, 'analyzing', {
      stage: 'analyzing',
      details: 'Scoring agents for best match...',
      processingDetails: {
        scoredAgents: scoredAgents.slice(0, 5).map(agent => ({
          name: agent.name,
          score: agent.score || 0
        }))
      }
    });
    
    // Get the best agent
    const bestAgent = scoredAgents[0];
    
    if (!bestAgent) {
      console.error('No suitable agent found');
      updateMessageStatus(messageId, 'error', {
        details: 'No suitable agent found for this message'
      });
      markMessageAsProcessed(messageId);
      return messageStatusCache.get(messageId)!;
    }
    
    console.log(`Selected best agent: ${bestAgent.name} with score ${bestAgent.score}`);
    
    // Update status to replying with agent info
    updateMessageStatus(messageId, 'replying', {
      stage: 'replying',
      details: `Generating response with agent ${bestAgent.name}...`,
      agentName: bestAgent.name,
      agentDescription: bestAgent.description
    });
    
    // Generate response with selected agent
    // We'll pass the memory context to the agent as system context
    let responseText = '';
    try {
      // Get user name from memory or contacts table
      let userName = message.contact_name || '';
      if (message.contact_id) {
        try {
          const fetchedUserName = await getUserNameFromMemory(message.contact_id, requestHeaders);
          if (fetchedUserName) {
            userName = fetchedUserName;
            console.log(`Retrieved user name from memory/contacts: ${userName}`);
          }
        } catch (nameError) {
          console.error('Error retrieving user name:', nameError);
          // Continue processing without user name if retrieval fails
        }
      }
      
      // Get memory context for this user if available
      let memoryContext = '';
      if (message.contact_id) {
        try {
          // Retrieve relevant memories directly using function call with headers
          console.log('Retrieving memories directly using function call');
          const memoryQueryResult = await retrieveMemories(
            message.contact_id, 
            message.content, 
            5, 
            requestHeaders
          );
          
          if (memoryQueryResult && memoryQueryResult.memories.length > 0) {
            memoryContext = formatMemoryContext(memoryQueryResult);
            console.log(`Retrieved memory context for user ${message.contact_id}, length: ${memoryContext.length} chars`);
          } else {
            console.log(`No relevant memories found for user ${message.contact_id}`);
          }
        } catch (memoryError) {
          console.error('Error retrieving memory:', memoryError);
          // Continue processing without memory if retrieval fails
        }
      }
      
      // Create system prompt with user name, memory context if available
      let systemPrompt = `You are ${bestAgent.name}`;
      if (bestAgent.description) {
        systemPrompt += `, ${bestAgent.description}`;
      }
      
      // Add user name instruction to the system prompt
      if (userName) {
        systemPrompt += `\n\nThe user's name is ${userName}. Always address them by name in your responses.`;
      }
      
      // Add memory context to the system prompt if available
      if (memoryContext) {
        systemPrompt += `\n\nREMEMBER THE FOLLOWING ABOUT THE USER:\n${memoryContext}`;
      }
      
      // Create the primary response prompt
      const prompt = `
      User: ${userName || message.contact_name || 'User'}
      Message: ${message.content}
      
      Please respond in a helpful, concise, and friendly manner.
      `;
      
      console.log(`Generating response with system context length: ${systemPrompt.length}`);
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });
      
      responseText = response.content[0].text;
      
      console.log(`Generated response (${responseText.length} chars): ${responseText.substring(0, 50)}...`);
      
      // Save the response to the database
      const { data: savedMessage, error: insertError } = await dbClient
        .from('messages')
        .insert({
          contact_id: message.contact_id,
          content: responseText,
          timestamp: new Date().toISOString(),
          is_ai_response: true,
          is_sent: false,
          is_viewed: false,
          is_from_customer: false,
          direction: 'outgoing'
        })
        .select();
      
      if (insertError) {
        console.error('Error saving AI response to database:', insertError);
      }
      
      // Immediately send the message via send-message API
      if (savedMessage && savedMessage.length > 0) {
        const responseMessageId = savedMessage[0].id;
        console.log(`Automatically sending message ID ${responseMessageId} to contact ${message.contact_id}`);
        
        try {
          // Use contact info from the original message
          const contactInfo = message.contacts?.contact_info || message.contact_info;
          
          if (!contactInfo) {
            console.warn(`No contact info available for contact ${message.contact_id}, cannot send message`);
          } else {
            // Call the send-message API to deliver the message
            const baseUrl = await getApiBaseUrl();
            const sendUrl = `${baseUrl}/api/send-message`;
            
            console.log(`Calling send-message API to deliver response to ${contactInfo}`);
            const sendResponse = await fetch(sendUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Forward the user mode header
                ...(requestHeaders?.get('x-bladex-user-mode') === 'true' ? {'x-bladex-user-mode': 'true'} : {}),
                // Forward any authorization header if present
                ...(requestHeaders?.get('authorization') ? {'authorization': requestHeaders.get('authorization')!} : {}),
                // Forward any cookie header if present
                ...(requestHeaders?.get('cookie') ? {'cookie': requestHeaders.get('cookie')!} : {})
              },
              body: JSON.stringify({
                contactId: message.contact_id,
                contactInfo: contactInfo,
                message: responseText,
                agentName: bestAgent.name,
                messageId: responseMessageId,
                // Explicitly indicate the mode
                userMode: requestHeaders?.get('x-bladex-user-mode') === 'true'
              })
            });
            
            if (!sendResponse.ok) {
              console.error(`Error sending message: ${sendResponse.status}`);
              const errorText = await sendResponse.text();
              console.error(`Send message error details: ${errorText}`);
            } else {
              const sendResult = await sendResponse.json();
              console.log(`Send-message API response:`, sendResult);
            }
          }
        } catch (sendError) {
          console.error('Error sending message via API:', sendError);
        }
      }
      
      // Update message status with the response
      updateMessageStatus(messageId, 'completed', {
        stage: 'completed',
        details: 'Response generated successfully',
        response: responseText,
        agentName: bestAgent.name,
        agentDescription: bestAgent.description
      });
      
      // Mark original message as processed
      markMessageAsProcessed(messageId);
      return messageStatusCache.get(messageId)!;
    } catch (aiError) {
      console.error(`Error generating response: ${aiError}`);
      
      // Provide a fallback response
      const fallbackResponse = `I'm ${bestAgent.name}, and I'd be happy to help with your request. However, I'm experiencing some technical difficulties right now. Please try again later or contact support if this issue persists.`;
      
      // Attempt to save the fallback response to database
      let savedMessageId: string | undefined;
      try {
        const { data: savedMessage, error: insertError } = await dbClient
          .from('messages')
          .insert({
            contact_id: message.contact_id,
            content: fallbackResponse,
            timestamp: new Date().toISOString(),
            is_ai_response: true,
            is_sent: false,
            is_viewed: false,
            is_from_customer: false,
            direction: 'outgoing'
          })
          .select();
      
        if (insertError) {
          console.error('Error saving fallback response to database:', insertError);
        } else if (savedMessage && savedMessage.length > 0) {
          savedMessageId = savedMessage[0].id;
          console.log(`Saved fallback response with ID: ${savedMessageId}`);
          
          // Try to send the fallback message
          try {
            // Use contact info from the original message
            const contactInfo = message.contacts?.contact_info || message.contact_info;
            
            if (!contactInfo) {
              console.warn(`No contact info available for contact ${message.contact_id}, cannot send fallback message`);
            } else {
              // Call the send-message API to deliver the fallback message
              const baseUrl = await getApiBaseUrl();
              const sendUrl = `${baseUrl}/api/send-message`;
              
              console.log(`Calling send-message API to deliver fallback response to ${contactInfo}`);
              const sendResponse = await fetch(sendUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  // Forward the user mode header
                  ...(requestHeaders?.get('x-bladex-user-mode') === 'true' ? {'x-bladex-user-mode': 'true'} : {}),
                  // Forward any authorization header if present
                  ...(requestHeaders?.get('authorization') ? {'authorization': requestHeaders.get('authorization')!} : {}),
                  // Forward any cookie header if present
                  ...(requestHeaders?.get('cookie') ? {'cookie': requestHeaders.get('cookie')!} : {})
                },
                body: JSON.stringify({
                  contactId: message.contact_id,
                  contactInfo: contactInfo,
                  message: fallbackResponse,
                  agentName: bestAgent.name,
                  messageId: savedMessageId,
                  // Explicitly indicate the mode
                  userMode: requestHeaders?.get('x-bladex-user-mode') === 'true'
                })
              });
              
              if (!sendResponse.ok) {
                console.error(`Error sending fallback message: ${sendResponse.status}`);
                const errorText = await sendResponse.text();
                console.error(`Send fallback message error details: ${errorText}`);
              } else {
                const sendResult = await sendResponse.json();
                console.log(`Fallback message send response:`, sendResult);
              }
            }
          } catch (sendError) {
            console.error('Error sending fallback message via API:', sendError);
          }
        }
      } catch (dbError) {
        console.error('Error in fallback database operation:', dbError);
      }
      
      // Update status to completed with fallback response
      updateMessageStatus(messageId, 'completed', {
        stage: 'completed',
        details: `Response generated with fallback due to error`,
        agentName: bestAgent.name,
        agentDescription: bestAgent.description,
        response: fallbackResponse
      });
    }
    
    // Mark message as processed
    markMessageAsProcessed(messageId);
    return messageStatusCache.get(messageId)!;
    
  } catch (error) {
    console.error(`Error processing message ${messageId}:`, error);
    
    updateMessageStatus(messageId, 'error', {
      details: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
    
    markMessageAsProcessed(messageId);
    return messageStatusCache.get(messageId)!;
  }
}

/**
 * GET endpoint to get the status of a message
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  console.log('GET /api/orchestration - Getting message status');
  
  // Parse message ID from URL or query parameters
  const url = new URL(req.url);
  const messageId = url.searchParams.get('id'); // Changed from 'messageId' to 'id'
  const endpoint = url.searchParams.get('endpoint');
  
  console.log(`Request params: id=${messageId}, endpoint=${endpoint}`); // Log request parameters
  
  if (endpoint === 'health') {
    console.log('Health check requested');
    return NextResponse.json({ status: 'ok' });
  }
  
  // Add a ping endpoint to quickly check service health
  if (endpoint === 'ping') {
    console.log('Ping requested');
    // Check if we can access our database
    let dbStatus = 'unknown';
    try {
      const dbClient = await getServerSupabaseClient(req.headers);
      const { count, error } = await dbClient
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        console.error('Database connection error on ping:', error);
        dbStatus = 'error';
      } else {
        dbStatus = 'connected';
      }
    } catch (error) {
      console.error('Error pinging database:', error);
      dbStatus = 'error';
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Orchestration service is running',
      mode: req.headers.get('x-bladex-user-mode') === 'true' ? 'user' : 'admin',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus
    });
  }
  
  // Add debug endpoint to see all message statuses
  if (endpoint === 'debug') {
    console.log('Debug info requested');
    // Convert Map to Object for JSON serialization
    const statuses: Record<string, any> = {};
    messageStatusCache.forEach((value, key) => {
      statuses[key] = value;
    });
    
    return NextResponse.json({
      activeProcessing: Array.from(processingMessages),
      processedMessages: Array.from(processedMessages),
      statuses
    });
  }
  
  if (!messageId) {
    console.log('Missing id parameter in request');
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }
  
  // Get current status from cache
  const status = messageStatusCache.get(messageId);
  console.log(`Status for message ${messageId}:`, status); // Log the status being returned
  
  // Check if message is in processed set but not in cache
  if (!status && processedMessages.has(messageId)) {
    console.log(`Message ${messageId} was processed but status is no longer in cache`);
    // Return a completed status for messages that were processed but are no longer in cache
    return NextResponse.json({
      status: {
        id: messageId,
        status: 'completed',
        processingStage: {
          stage: 'completed',
          details: 'Message was processed (status retrieved from processed set)'
        }
      }
    });
  }
  
  // Return the status directly without nesting, to match what the frontend expects
  return NextResponse.json(
    { 
      status: status || {
        id: messageId,
        status: 'unknown',
        processingStage: {
          stage: 'unknown',
          details: 'Message status unknown'
        }
      }
    }
  );
}

/**
 * POST endpoint to process a message or check status of multiple messages
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log('POST /api/orchestration - Processing message');
  
  try {
    const body = await req.json();
    console.log('Request body:', body); // Log the request body
    
    // Log the headers to help with debugging
    console.log('Request headers:', {
      'x-bladex-user-mode': req.headers.get('x-bladex-user-mode'),
      'x-user-email': req.headers.get('x-user-email')
    });
    
    // Check if we're processing a single message (now using 'id' instead of 'messageId')
    if (body.id) {
      const messageId = body.id;
      console.log(`Processing message: ${messageId}`);
      
      // Only check if the message is currently being processed
      // but don't check processedMessages to allow reprocessing if needed
      if (isMessageBeingProcessed(messageId) && !body.forceReprocess) {
        console.log(`Message ${messageId} is already being processed, returning current status`);
        const currentStatus = messageStatusCache.get(messageId) || {
          id: messageId,
          status: 'processing',
          processingStage: {
            stage: 'analyzing',
            details: 'Message is already being processed...'
          }
        };
        
        return NextResponse.json({
          messageId,
          status: currentStatus.status,
          details: 'Message already processing',
          processingStage: currentStatus.processingStage
        });
      }
      
      // Always process the message, just don't process twice simultaneously
      console.log(`Starting/continuing processing for message ${messageId}`);
      
      // Mark message as being processed
      addMessageToProcessing(messageId);
      
      // Process the message asynchronously, passing the request headers
      processMessage(messageId, req.headers).catch(error => {
        console.error(`Error in async message processing: ${error}`);
        updateMessageStatus(messageId, 'error', {
          details: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
        markMessageAsProcessed(messageId);
      });
      
      // Return immediately with initial status
      return NextResponse.json({
        messageId,
        status: 'processing',
        details: 'Message processing started'
      });
    }
    
    // Check if we're checking status of multiple messages
    if (body.messageIds && Array.isArray(body.messageIds)) {
      const messageIds = body.messageIds as string[];
      console.log(`Checking status of ${messageIds.length} messages`);
      
      const statuses = messageIds.map(id => ({
        messageId: id,
        status: messageStatusCache.get(id) || {
          id,
          status: 'unknown',
          processingStage: {
            stage: 'unknown',
            details: 'Message status unknown'
          }
        },
        isProcessing: isMessageBeingProcessed(id),
        isProcessed: processedMessages.has(id)
      }));
      
      return NextResponse.json({ statuses });
    }
    
    // If we get here, invalid request
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error processing orchestration request:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
