// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { generateCompletion } from './../../../lib/ai/utils/ai-client';

// POST handler for chat messages
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Find the system message and user message
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');

    if (!systemMessage || !userMessage) {
      return NextResponse.json(
        { error: 'Invalid request: system and user messages are required' },
        { status: 400 }
      );
    }

    // Generate response using the AI client
    const response = await generateCompletion(userMessage.content, {
      system_prompt: systemMessage.content
    });

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

// GET handler for endpoint info
export async function GET() {
  return NextResponse.json({
    message: 'This is a POST-only chat endpoint',
    usage: 'Send a POST request with { "messages": [{ "role": "system/user", "content": "message" }] }',
    example: {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, how are you?' }
      ]
    }
  });
}