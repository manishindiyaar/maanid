import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * API endpoint to verify that the schema has been properly applied to the user's Supabase database
 */
export async function POST(req: NextRequest) {
  try {
    // Get the project reference from the request
    const { projectRef } = await req.json();

    if (!projectRef) {
      return NextResponse.json(
        { success: false, error: 'Missing projectRef parameter' },
        { status: 400 }
      );
    }

    // Get Supabase credentials from cookies
    const supabaseUrl = cookies().get('supabase_url')?.value;
    const supabaseAnonKey = cookies().get('supabase_anon_key')?.value;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase credentials' },
        { status: 400 }
      );
    }

    // Create a Supabase client with the user's credentials
    const supabase = createServerComponentClient({ cookies });

    // Try to query the contacts table to verify schema
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('id')
      .limit(1);

    if (contactsError) {
      console.error('Error querying contacts table:', contactsError);
      return NextResponse.json(
        { 
          success: false, 
          error: contactsError.message,
          details: 'Could not verify contacts table'
        },
        { status: 200 } // Still return 200 to allow client-side handling
      );
    }

    // Try to query the messages table to verify schema
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    if (messagesError) {
      console.error('Error querying messages table:', messagesError);
      return NextResponse.json(
        { 
          success: false, 
          error: messagesError.message,
          details: 'Could not verify messages table'
        },
        { status: 200 } // Still return 200 to allow client-side handling
      );
    }

    // Try to query the agents table to verify schema
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('id')
      .limit(1);

    if (agentsError && agentsError.code !== 'PGRST116') { // Ignore empty result errors
      console.error('Error querying agents table:', agentsError);
      return NextResponse.json(
        { 
          success: false, 
          error: agentsError.message,
          details: 'Could not verify agents table'
        },
        { status: 200 } // Still return 200 to allow client-side handling
      );
    }

    // If we got here, the schema verification was successful
    return NextResponse.json({
      success: true,
      message: 'Schema verification successful',
      tables: {
        contacts: true,
        messages: true,
        agents: !agentsError
      }
    });
  } catch (error) {
    console.error('Error in schema verification:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Exception during verification'
      },
      { status: 500 }
    );
  }
}
