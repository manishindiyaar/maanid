import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query, token, projectRef } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'No SQL query provided' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 400 });
    }

    if (!projectRef) {
      return NextResponse.json({ error: 'No project reference provided' }, { status: 400 });
    }

    console.log('SQL request received for project:', projectRef);
    console.log('SQL query:', query.substring(0, 100) + (query.length > 100 ? '...' : ''));
    
    try {
      // Execute the SQL query using the Supabase Management API
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SQL execution failed:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          return NextResponse.json({ 
            error: 'SQL execution failed', 
            details: errorData 
          }, { status: response.status });
        } catch (e) {
          return NextResponse.json({ 
            error: 'SQL execution failed', 
            message: errorText 
          }, { status: response.status });
        }
      }

      const data = await response.json();
      console.log('SQL execution successful, result:', JSON.stringify(data).substring(0, 200) + '...');
      return NextResponse.json(data);
    } catch (error: any) {
      console.error('Error executing SQL:', error);
      
      // If we can't connect to the Supabase API, return a formatted SQL for manual execution
      const sqlEditorLink = projectRef 
        ? `https://app.supabase.com/project/${projectRef}/sql`
        : 'https://app.supabase.com';
        
      return NextResponse.json({
        sql_editor_link: sqlEditorLink,
        formatted_sql: query,
        instructions: [
          "1. Click the 'Open SQL Editor' button below",
          "2. Copy the SQL code using the copy button",
          "3. Paste the SQL into the Supabase SQL Editor",
          "4. Click 'Run' in the Supabase interface to execute the SQL"
        ],
        message: "For security reasons, SQL needs to be executed directly in Supabase",
        error: error.message || 'Unknown error occurred while executing SQL'
      });
    }
  } catch (error: any) {
    console.error('Error processing SQL request:', error);
    return NextResponse.json({ error: error.message || 'Error processing SQL request' }, { status: 500 });
  }
} 
