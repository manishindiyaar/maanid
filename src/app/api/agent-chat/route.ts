import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { processDocumentTags } from './../../../lib/ai/utils/document-service';
import { queryDocuments, formatDocumentContext } from './../../../lib/ai/utils/document-service';
import type { AgentDocument } from './../../../lib/ai/utils/document-service';

// Initialize Anthropic client with server-side API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(req: Request) {
  try {
    const { prompt, agentName, agentDescription, agentId } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Process document tags in agent description if agentId is provided
    let processedDescription = agentDescription || '';
    let documentContext = '';
    let relevantDocuments: AgentDocument[] = [];
    
    if (agentId) {
      try {
        // Replace {tag} references in description with actual content
        processedDescription = await processDocumentTags(agentId, agentDescription);
        
        // Query relevant documents based on the prompt
        relevantDocuments = await queryDocuments(agentId, prompt, 3);
        
        if (relevantDocuments.length > 0) {
          documentContext = formatDocumentContext(relevantDocuments);
        }
      } catch (error) {
        console.error('Error processing document context:', error);
        // Continue without document context if there's an error
      }
    }
    
    // Build system prompt with document context
    const systemPrompt = `You are ${agentName}${processedDescription ? `, ${processedDescription}` : ''}. 
Respond to the user's message in a helpful and natural way.

${documentContext}`;

    console.log(`Generating response with system prompt: ${systemPrompt.substring(0, 100)}...`);

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    return NextResponse.json({
      content: response.content[0].text,
      metadata: {
        documents: relevantDocuments.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          tag: doc.tag,
          relevance: doc.similarity
        }))
      }
    });
  } catch (error) {
    console.error('Error in agent chat:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 