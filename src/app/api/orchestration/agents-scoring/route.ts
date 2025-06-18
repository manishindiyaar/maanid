/**
 * API endpoint for scoring agents based on message content
 * This endpoint selects the best agent for a given message
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
 * Helper function to create error responses
 */
function errorResponse(message: string, status = 400) {
  console.error(`Error in agent scoring: ${message}`);
  return {
    error: message,
    agentName: 'Error',
    agentDescription: message,
    score: 0
  };
}

/**
 * Function to score agents based on message content
 * @param messageId The message ID to analyze
 * @returns The best agent for the message with score and description
 */
async function scoreAgentsForMessage(messageId: string) {
  try {
    console.log(`🧮 Scoring agents for message: ${messageId}`);
    
    // Fetch the message data
    const { data: message, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching message: ${error.message}`);
      return errorResponse('Error fetching message: ' + error.message);
    }
    
    if (!message) {
      console.error(`Message not found with ID: ${messageId}`);
      return errorResponse(`Message not found with ID: ${messageId}`);
    }
    
    // Fetch all available agents without filtering by 'enabled'
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');
      
    if (agentsError) {
      console.error('❌ Error fetching agents:', agentsError);
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }
    
    if (!agents || agents.length === 0) {
      console.warn('⚠️ No agents found');
      
      // Return default agent if no agents are available
      return {
        agentName: 'Default Assistant',
        agentDescription: 'General-purpose AI assistant',
        score: 1.0
      };
    }
    
    console.log(`🤖 Found ${agents.length} agents`);
    
    // For demo purposes, we'll use a simple scoring approach
    // In a real system, this would be more sophisticated using Claude to analyze
    const messageContent = message.content.toLowerCase();
    
    // Score each agent based on a simple keyword matching
    const scoredAgents = agents.map(agent => {
      // Default medium score
      let score = 0.5;
      
      // Very simple scoring based on agent's name and description matching keywords in message
      const agentKeywords = [
        ...(agent.name ? agent.name.toLowerCase().split(' ') : []),
        ...(agent.description ? agent.description.toLowerCase().split(' ') : [])
      ];
      
      // Count how many keywords from the agent appear in the message
      const matchingKeywords = agentKeywords.filter(keyword => 
        keyword.length > 3 && messageContent.includes(keyword)
      );
      
      // Adjust score based on matches
      if (matchingKeywords.length > 0) {
        score += 0.1 * matchingKeywords.length;
      }
      
      // Consider agent priority if defined
      if (agent.priority) {
        switch (agent.priority) {
          case 'high': score += 0.2; break;
          case 'medium': score += 0.1; break;
          // Low priority doesn't get a boost
        }
      }
      
      return {
        ...agent,
        score: Math.min(score, 1.0) // Cap score at 1.0
      };
    });
    
    // Sort by score (highest first) and take the best agent
    const bestAgent = scoredAgents.sort((a, b) => b.score - a.score)[0];
    
    console.log(`✅ Best agent for message: ${bestAgent.name} (score: ${bestAgent.score})`);
    
    return {
      agentName: bestAgent.name,
      agentDescription: bestAgent.description || '',
      score: bestAgent.score
    };
  } catch (error) {
    console.error('❌ Error scoring agents:', error);
    throw error;
  }
}

/**
 * GET handler for selecting the best agent for a message
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Missing messageId parameter' },
        { status: 400 }
      );
    }
    
    const bestAgent = await scoreAgentsForMessage(messageId);
    
    return NextResponse.json({
      success: true,
      bestAgent: bestAgent
    });
  } catch (error) {
    console.error('❌ Error in agents-scoring API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for scoring agents for a message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messageId = body.messageId || body.id; // Accept either messageId or id parameter
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Missing messageId or id in request body' },
        { status: 400 }
      );
    }
    
    const bestAgent = await scoreAgentsForMessage(messageId);
    
    return NextResponse.json({
      success: true,
      bestAgent: bestAgent
    });
  } catch (error) {
    console.error('❌ Error in agents-scoring API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
