import { NextRequest, NextResponse } from 'next/server';
import { VapiClient } from '@vapi-ai/server-sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Test the API key by trying to list assistants
    const vapi = new VapiClient({
      token: apiKey,
    });

    try {
      const assistants = await vapi.assistants.list();
      
      return NextResponse.json({
        valid: true,
        message: 'API key is valid and working',
        assistantCount: assistants.length || 0,
        keyType: 'private', // If it works for server operations, it's private
        keyFormat: apiKey.match(/^[a-f0-9-]{36}$/) ? 'UUID' : 'Other'
      });
    } catch (error: any) {
      let errorMessage = 'Unknown error';
      let keyType = 'unknown';
      
      if (error.statusCode === 401) {
        if (error.body?.message?.includes('private key instead of the public key')) {
          errorMessage = 'You are using a PUBLIC key, but need a PRIVATE key for server operations';
          keyType = 'public';
        } else if (error.body?.message?.includes('public key instead of the private key')) {
          errorMessage = 'You are using a PRIVATE key, but this context needs a PUBLIC key';
          keyType = 'private';
        } else {
          errorMessage = 'Invalid API key';
          keyType = 'invalid';
        }
      } else {
        errorMessage = error.message || 'API connection failed';
      }

      return NextResponse.json({
        valid: false,
        error: errorMessage,
        keyType,
        statusCode: error.statusCode,
        keyFormat: apiKey.match(/^[a-f0-9-]{36}$/) ? 'UUID' : 'Other'
      });
    }
  } catch (error) {
    console.error('Key validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const currentKey = process.env.VAPI_API_KEY;
  
  if (!currentKey || currentKey === 'demo-key') {
    return NextResponse.json({
      hasKey: false,
      message: 'No VAPI API key configured'
    });
  }

  // Test current key
  try {
    const vapi = new VapiClient({
      token: currentKey,
    });

    const assistants = await vapi.assistants.list();
    
    return NextResponse.json({
      hasKey: true,
      valid: true,
      message: 'Current API key is valid',
      assistantCount: assistants.length || 0,
      keyLength: currentKey.length,
      keyFormat: currentKey.match(/^[a-f0-9-]{36}$/) ? 'UUID' : 'Other'
    });
  } catch (error: any) {
    return NextResponse.json({
      hasKey: true,
      valid: false,
      error: error.body?.message || error.message || 'Unknown error',
      statusCode: error.statusCode,
      keyLength: currentKey.length,
      keyFormat: currentKey.match(/^[a-f0-9-]{36}$/) ? 'UUID' : 'Other'
    });
  }
}
