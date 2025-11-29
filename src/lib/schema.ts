'use client';

// Schema application and SQL execution utilities
import { TokenResponse } from './supabaseOAuth';

// SQL schema to apply to the Supabase database
const SCHEMA_SQL = `
-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  platform TEXT DEFAULT 'web', -- 'whatsapp', 'telegram', 'web'
  external_id TEXT, -- Phone number or Telegram ID
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'user' or 'assistant'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on contacts name for faster searches
CREATE INDEX IF NOT EXISTS contacts_name_idx ON contacts(name);
CREATE INDEX IF NOT EXISTS contacts_platform_idx ON contacts(platform);
CREATE INDEX IF NOT EXISTS contacts_external_id_idx ON contacts(external_id);

-- Create index on messages contact_id for faster joins
CREATE INDEX IF NOT EXISTS messages_contact_id_idx ON messages(contact_id);
`;

// Sample data to insert
const SAMPLE_DATA_SQL = `
INSERT INTO contacts (name, contact_info) VALUES ('John Doe', '@johndoe');
INSERT INTO contacts (name, contact_info) VALUES ('Jane Smith', '@janesmith');
INSERT INTO contacts (name, contact_info) VALUES ('Alice Johnson', '@alicejohnson');
`;

// Apply the schema to the Supabase database
export async function applySchema(): Promise<any> {
  try {
    console.log('Applying schema to Supabase...');
    
    // Get the access token and project reference
    const accessToken = localStorage.getItem('supabase_access_token');
    const projectRef = localStorage.getItem('supabase_project_ref');
    
    if (!accessToken) {
      throw new Error('No access token found. Please authenticate with Supabase first.');
    }
    
    if (!projectRef) {
      throw new Error('No project reference found. Please authenticate with Supabase first.');
    }
    
    console.log('Using project_ref:', projectRef);
    
    // Execute the schema SQL
    console.log('Executing schema SQL...');
    const schemaResult = await executeSQL(SCHEMA_SQL);
    console.log('Schema applied successfully:', schemaResult);
    
    // Insert sample data
    console.log('Preparing to insert sample contacts...');
    console.log('Executing contacts insert SQL...');
    const sampleDataResult = await executeSQL(SAMPLE_DATA_SQL);
    console.log('Sample contacts inserted successfully:', sampleDataResult);
    
    // Get the contact IDs for the sample data
    console.log('Retrieving contact IDs...');
    const contactIdsResult = await executeSQL('SELECT id FROM contacts ORDER BY id ASC LIMIT 3');
    
    // Check if we got a result with contact IDs
    if (contactIdsResult.data && Array.isArray(contactIdsResult.data)) {
      const contactIds = contactIdsResult.data.map((row: any) => row.id);
      console.log('Retrieved contact IDs:', contactIds);
      
      // Insert sample messages for each contact
      if (contactIds.length > 0) {
        console.log('Inserting sample messages...');
        const messageInserts = contactIds.map((id: number) => 
          `INSERT INTO messages (contact_id, content) VALUES (${id}, 'Hello from contact ${id}!')`
        ).join(';');
        
        const messagesResult = await executeSQL(messageInserts);
        console.log('Sample messages inserted successfully:', messagesResult);
      } else {
        console.log('No contact IDs found, skipping message insertion');
      }
    } else {
      console.log('No contact IDs found, skipping message insertion');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error applying schema:', error);
    throw error;
  }
}

// Execute SQL on the Supabase database
export async function executeSQL(sqlQuery: string): Promise<any> {
  try {
    const token = localStorage.getItem('supabase_access_token');
    const projectRef = localStorage.getItem('supabase_project_ref');
    
    if (!token) {
      throw new Error('No Supabase token found');
    }
    
    if (!projectRef) {
      throw new Error('No Supabase project reference found');
    }
    
    console.log(`Executing SQL with token: ${token.substring(0, 5)}...${token.substring(token.length - 5)}`);
    console.log(`Project ref: ${projectRef}`);
    console.log(`SQL query: ${sqlQuery.substring(0, 100)}...`);
    
    const response = await fetch('/api/sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sqlQuery,
        token,
        projectRef,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`SQL execution failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('SQL execution successful:', data);
    
    // Check if the response includes sql_editor_link, which indicates manual execution is needed
    if (data.sql_editor_link || data.formatted_sql) {
      return {
        success: true,
        mode: 'manual_execution', // Add this so the UI knows to show SQL editor panel
        sqlEditorLink: data.sql_editor_link,
        formattedSql: data.formatted_sql || sqlQuery,
        instructions: data.instructions || [
          "1. Click the 'Open SQL Editor' button below",
          "2. Copy the SQL code using the copy button",
          "3. Paste the SQL into the Supabase SQL Editor",
          "4. Click 'Run' in the Supabase interface to execute the SQL"
        ],
        message: data.message || "For security reasons, SQL needs to be executed directly in Supabase"
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error executing SQL:', error);
    throw error;
  }
} 