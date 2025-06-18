import { NextRequest, NextResponse } from 'next/server';
import { VapiClient } from '@vapi-ai/server-sdk';
import { parseCallQuery } from '../anthropic/call-parser';

export const dynamic = 'force-dynamic';

// Initialize VAPI client with better error handling
let vapi: VapiClient | null = null;
try {
  if (process.env.VAPI_API_KEY && process.env.VAPI_API_KEY !== 'demo-key') {
    vapi = new VapiClient({
      token: process.env.VAPI_API_KEY,
    });
  }
} catch (error) {
  console.error('Failed to initialize VAPI client:', error);
}

// Contact database (for now, hardcoded)
const contacts = [
  { name: "Manish", phoneNumber: "+919801441675" },
  { name: "Aadidev", phoneNumber: "+919004200798" }
];

interface CallResult {
  contact: string;
  phoneNumber: string;
  callId: string | null;
  status: 'initiated' | 'failed';
  error?: string;
}

async function createCallAssistant(message: string) {
  try {
    // For demo purposes, we'll simulate assistant creation
    if (!vapi || !process.env.VAPI_API_KEY || process.env.VAPI_API_KEY === 'demo-key') {
      console.log('[DEMO MODE] Simulating assistant creation');
      return {
        id: `demo-assistant-${Date.now()}`,
        name: "Call Assistant",
        message: message
      };
    }

    console.log('[VAPI] Creating assistant with message:', message);
    const assistant = await vapi.assistants.create({
      name: "Call Assistant - " + Date.now(),
      firstMessage: `Hello! ${message}`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional assistant making a call on behalf of someone. 
            Your message is: "${message}"
            
            Instructions:
            1. Deliver the message clearly and professionally
            2. Be polite and friendly
            3. If they have questions, try to answer based on the context
            4. Keep the call brief and to the point
            5. End the call politely after delivering the message
            
            Start by greeting them and then deliver your message.`
          }
        ],
        temperature: 0.7,
        maxTokens: 150
      },
      voice: {
        provider: "11labs",
        voiceId: "burt"
      }
    });
    
    console.log('[VAPI] Assistant created successfully:', assistant.id);
    return assistant;
  } catch (error: any) {
    console.error('[VAPI] Error creating assistant:', error);
    
    // Provide more detailed error information
    const errorDetails = {
      message: error.message || 'Unknown error',
      status: error.status || error.statusCode,
      response: error.response?.data || error.body,
      stack: error.stack
    };
    
    console.error('[VAPI] Detailed error:', errorDetails);
    throw new Error(`Failed to create assistant: ${error.message || 'Unknown error'}`);
  }
}

async function makeCall(phoneNumber: string, assistantId: string) {
  try {
    // For demo purposes, we'll simulate call creation
    if (!vapi || !process.env.VAPI_API_KEY || process.env.VAPI_API_KEY === 'demo-key') {
      console.log('[DEMO MODE] Simulating call to:', phoneNumber);
      return {
        id: `demo-call-${Date.now()}`,
        status: 'initiated',
        phoneNumber: phoneNumber,
        assistantId: assistantId
      };
    }

    if (!process.env.VAPI_PHONE_NUMBER_ID) {
      throw new Error('VAPI_PHONE_NUMBER_ID not configured');
    }

    console.log('[VAPI] Making call to:', phoneNumber, 'with assistant:', assistantId);
    const call = await vapi.calls.create({
      assistantId: assistantId,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: phoneNumber
      }
    });

    // Safely extract call ID for logging
    let callId: string | undefined = undefined;
    if ('id' in call) {
      callId = call.id;
    } else if ('calls' in call && Array.isArray(call.calls) && call.calls.length > 0) {
      callId = call.calls[0].id;
    }

    console.log('[VAPI] Call created successfully:', callId);
    return call;
  } catch (error: any) {
    console.error('[VAPI] Error making call:', error);
    // Provide more detailed error information
    const errorDetails = {
      message: error.message || 'Unknown error',
      status: error.status || error.statusCode,
      response: error.response?.data || error.body,
      phoneNumber,
      assistantId
    };
    
    console.error('[VAPI] Detailed call error:', errorDetails);
    throw new Error(`Failed to make call: ${error.message || 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log(`[MAKE-CALL] Processing query: ${query}`);

    // Parse the natural language query
    const parsedQuery = await parseCallQuery(query);
    
    if (parsedQuery.error) {
      return NextResponse.json(
        { error: parsedQuery.error },
        { status: 400 }
      );
    }

    if (!parsedQuery.contacts.length || !parsedQuery.message) {
      return NextResponse.json(
        { error: 'No contacts or message found in the query' },
        { status: 400 }
      );
    }

    // Find matching contacts
    const matchedContacts = parsedQuery.contacts.map(name => {
      const contact = contacts.find(c => 
        c.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(c.name.toLowerCase())
      );
      return contact;
    }).filter(Boolean);

    if (!matchedContacts.length) {
      return NextResponse.json(
        { error: `No matching contacts found for: ${parsedQuery.contacts.join(', ')}` },
        { status: 404 }
      );
    }

    // Create assistant for this call
    const assistant = await createCallAssistant(parsedQuery.message);
    
    // Make calls to all matched contacts
    const callPromises = matchedContacts.map(async (contact) => {
      try {
        const call = await makeCall(contact!.phoneNumber, assistant.id);
        return {
          contact: contact!.name,
          phoneNumber: contact!.phoneNumber,
          callId: 'id' in call ? call.id : null,
          status: 'initiated' as const
        };
      } catch (error) {
        console.error(`Error calling ${contact!.name}:`, error);
        return {
          contact: contact!.name,
          phoneNumber: contact!.phoneNumber,
          callId: null,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const callResults = await Promise.all(callPromises);

    return NextResponse.json({
      success: true,
      message: `Initiated calls to ${matchedContacts.length} contact(s)`,
      parsedQuery,
      assistantId: assistant.id,
      calls: callResults,
      demo: !process.env.VAPI_API_KEY || process.env.VAPI_API_KEY === 'demo-key'
    });

  } catch (error) {
    console.error('[MAKE-CALL] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Test VAPI connection
  let vapiStatus = 'unknown';
  let vapiDetails = {};
  
  if (!process.env.VAPI_API_KEY || process.env.VAPI_API_KEY === 'demo-key') {
    vapiStatus = 'demo';
    vapiDetails = { message: 'Running in demo mode - no VAPI key configured' };
  } else if (!vapi) {
    vapiStatus = 'error';
    vapiDetails = { message: 'Failed to initialize VAPI client' };
  } else {
    try {
      const assistants = await vapi.assistants.list();
      vapiStatus = 'connected';
      vapiDetails = { 
        message: 'Successfully connected to VAPI',
        assistantCount: assistants.length || 0
      };
    } catch (error: any) {
      vapiStatus = 'error';
      vapiDetails = { 
        message: 'Failed to connect to VAPI',
        error: error.message,
        status: error.status || error.statusCode
      };
    }
  }

  return NextResponse.json({
    message: 'Make Call API is running',
    contacts: contacts.map(c => ({ name: c.name, phone: c.phoneNumber.slice(-4) })),
    vapi: {
      status: vapiStatus,
      details: vapiDetails,
      hasApiKey: !!process.env.VAPI_API_KEY,
      hasPhoneNumberId: !!process.env.VAPI_PHONE_NUMBER_ID,
      apiKeyLength: process.env.VAPI_API_KEY?.length || 0
    }
  });
}
