/**
 * API endpoint for generating responses to messages
 * This endpoint uses the selected agent to generate a response
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './../../../../lib/supabase/client';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Function to generate a response to a message using the selected agent
 * @param messageId The message ID to respond to
 * @param agentName The name of the agent
 * @param agentDescription The description of the agent
 * @returns The generated response and agent info
 */
async function generateResponse(
  messageId: string, 
  agentName: string, 
  agentDescription: string
) {
  try {
    console.log(`✍️ Generating response for message: ${messageId} using agent: ${agentName}`);
    
    // Get message from database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*, contacts(*)')
      .eq('id', messageId)
      .maybeSingle();
    
    if (messageError) {
      console.error('❌ Error fetching message:', messageError);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch message: ${messageError.message}`
      }, { status: 500 });
    }
    
    if (!message) {
      const errorMsg = `Message with ID ${messageId} not found`;
      console.error(errorMsg);
      return NextResponse.json({
        success: false,
        error: errorMsg
      }, { status: 404 });
    }
    
    // Get customer name and contact info
    const customerName = message.contacts?.name || 'Customer';
    const contactInfo = message.contacts?.contact_info || '';
    
    // Prepare system prompt with agent information
    const systemPrompt = `You are ${agentName}${agentDescription ? `, ${agentDescription}` : ''}.
You are responding to a message from ${customerName}.
Keep your responses professional, helpful, and concise.
Focus on answering the customer's question or addressing their concern directly.
When appropriate, ask follow-up questions to better understand customer needs.`;

    // Generate response using Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message.content
        }
      ]
    });
    
    // Extract the response text
    const responseText = response.content[0].text;
    
    console.log(`✅ Response generated for message ${messageId}`);
    
    return {
      reply: responseText,
      agentName,
      agentDescription,
      contactName: customerName,
      contactInfo
    };
  } catch (error) {
    console.error('❌ Error generating response:', error);
    throw error;
  }
}

/**
 * POST handler for generating a response to a message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messageId = body.messageId || body.id; // Accept either messageId or id parameter
    const { agentName, agentDescription } = body;
    
    // Validate required parameters
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Missing messageId or id in request body' },
        { status: 400 }
      );
    }
    
    if (!agentName) {
      return NextResponse.json(
        { success: false, error: 'Missing agentName in request body' },
        { status: 400 }
      );
    }
    
    // Generate the response
    const responseData = await generateResponse(
      messageId,
      agentName,
      agentDescription || ''
    );
    
    return NextResponse.json({
      success: true,
      response: responseData
    });
  } catch (error) {
    console.error('❌ Error in response API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
