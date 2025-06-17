import { NextResponse } from 'next/server';
// import { getServerSupabaseClient } from './../../../lib/supabase/server';
import { getSupabaseClient } from '@/lib/supabase/getSupabaseClient';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET: Retrieve all agents or a specific agent
export async function GET(request: Request) {
  try {
    // const supabase = await getServerSupabaseClient(request.headers);
    const supabase = await getSupabaseClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    let query = supabase.from('agents').select('*');
    
    if (id) {
      query = query.eq('id', id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch agents' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in GET agents:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Create a new agent
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Agent name is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { data, error } = await supabase
      .from('agents')
      .insert({ name, description })
      .select();
    
    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create agent' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({ success: true, data: data[0] }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in POST agents:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT: Update an existing agent
export async function PUT(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const { id, name, description } = await request.json();
    
    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: 'Agent ID and name are required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // First check if the agent exists
    const { data: existingAgent, error: checkError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError || !existingAgent) {
      console.error('Agent not found:', id);
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Update the agent
    const { data, error } = await supabase
      .from('agents')
      .update({ name, description })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update agent' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({ success: true, data: data[0] }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in PUT agents:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE: Delete an agent
export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabaseClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete agent' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in DELETE agents:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500, headers: corsHeaders }
    );
  }
} 