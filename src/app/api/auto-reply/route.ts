import { NextResponse } from 'next/server';
import { generateAutoReply } from './../../../lib/anthropic/client';

export async function POST(request: Request) {
  try {
    const { message, conversation } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Generate auto-reply using Anthropic
    const { reply, confidence } = await generateAutoReply(message, conversation || []);

    return NextResponse.json({
      reply,
      confidence
    });
  } catch (error: any) {
    console.error('Error generating auto-reply:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while generating the reply',
        reply: "I'll have a human representative get back to you soon.",
        confidence: 0
      },
      { status: 500 }
    );
  }
}