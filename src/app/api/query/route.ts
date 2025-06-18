import { NextResponse } from 'next/server';
import { parseNaturalLanguageQuery } from '../anthropic/client';
import { getServerSupabaseClient } from '../../../lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    // Explicitly check for user mode from cookies and headers
    const isUserMode = request.headers.get('x-bladex-user-mode') === 'true' || 
                      request.headers.get('cookie')?.includes('supabase-auth-token');
    
    // Get the appropriate Supabase client based on request headers
    const requestHeaders = new Headers(request.headers);
    
    // Set user mode header explicitly if detected from cookies but not set in header
    if (isUserMode && request.headers.get('x-bladex-user-mode') !== 'true') {
      requestHeaders.set('x-bladex-user-mode', 'true');
      console.log('[QUERY] Setting x-bladex-user-mode header based on cookie auth');
    }
    
    const supabase = await getServerSupabaseClient(requestHeaders);
    
    // Add more debugging to track mode
    console.log(`Query API called with mode detection:`, { 
      explicitUserModeHeader: request.headers.get('x-bladex-user-mode') === 'true',
      hasCookieAuth: request.headers.get('cookie')?.includes('supabase-auth-token'),
      determinedMode: isUserMode ? 'User Mode' : 'Admin Mode'
    });

    if (!prompt) {
      return NextResponse.json({
        type: 'error',
        error: 'Query is not relevant. Please try a different query format or rephrase your question.'
      });
    }

    // Parse the natural language query
    const parsedQuery = await parseNaturalLanguageQuery(prompt);
    console.log('Parsed query:', parsedQuery);

    // Handle any parsing errors or invalid queries
    if (parsedQuery.error || !parsedQuery.query) {
      return NextResponse.json({
        type: 'error',
        error: 'Query is not relevant. Please try a different query format or rephrase your question.'
      });
    }

    // Handle "Tell me about X" queries directly
    if (prompt.toLowerCase().startsWith('tell me about ')) {
      const customerName = prompt.substring('tell me about '.length).trim();
      console.log('Direct customer summary request detected for:', customerName);
      return await getCustomerSummary(customerName, supabase);
    }
    
    // Handle query type
    if (parsedQuery.type === 'query' || parsedQuery.type === 'summary') {
      const { functionName, parameters } = parsedQuery.query;
      
      // Validate function name and parameters
      if (!functionName || !parameters) {
        return NextResponse.json({
          type: 'error',
          error: 'Query is not relevant. Please try a different query format or rephrase your question.'
        });
      }
      
      // Handle customer summary request
      if (functionName === 'get_customer_summary') {
        if (!parameters.customer_name) {
          return NextResponse.json({
            type: 'error',
            error: 'Query is not relevant. Please try a different query format or rephrase your question.'
          });
        }
        console.log('Processing customer summary request for:', parameters.customer_name);
        return await getCustomerSummary(parameters.customer_name, supabase);
      }
      
      // Handle existing query functions
      if (functionName === 'get_customers_by_message_keyword') {
        if (!parameters.keyword) {
          return NextResponse.json({
            type: 'error',
            error: 'Query is not relevant. Please try a different query format or rephrase your question.'
          });
        }
        // First, get messages matching the keyword
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('contact_id, content, timestamp')
          .ilike('content', `%${parameters.keyword}%`)
          .order('timestamp', { ascending: false });
          
        if (messageError) throw messageError;
        
        // For action queries, always ensure we have at least some default data
        const isActionQuery = parsedQuery.type === 'action';
        
        if (!messageData || messageData.length === 0) {
          if (isActionQuery) {
            // If it's an action but no matches found, still provide a fallback
            // so the action UI can be displayed
            return NextResponse.json({ 
              type: 'pending_action', 
              action: parsedQuery.action,
              message: parsedQuery.message,
              recipients: []
            });
          } else {
            // For regular queries, return empty results
            return NextResponse.json({ 
              type: 'query_result', 
              memories: [] 
            });
          }
        }
        
        // Get unique contact IDs with their latest matching message
        const contactMessages = messageData.reduce((acc: any, msg: any) => {
          if (!acc[msg.contact_id] || new Date(msg.timestamp) > new Date(acc[msg.contact_id].timestamp)) {
            acc[msg.contact_id] = msg;
          }
          return acc;
        }, {});
        
        const contactIds = Object.keys(contactMessages);
        
        // Then get the contact details
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .select('id, name, contact_info')
          .in('id', contactIds);
          
        if (contactError) throw contactError;

        // If this is a send_message action, send the message to all matching contacts
        if (isActionQuery && parsedQuery.action === 'send_message' && parsedQuery.message) {
          // We'll use the execute-action API to handle the message sending
          // This is more reliable than trying to do it directly here
          
          // Call the execute-action API to handle message sending
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
            const actionUrl = `${baseUrl}/api/execute-action`;
            console.log(`[QUERY] Calling execute-action API at ${actionUrl} with mode: ${isUserMode ? 'user' : 'admin'}`);
            
            // Generate a unique batch ID to prevent duplicates across retries
            const batchId = `query-${uuidv4()}`;
            console.log(`[QUERY] Generated batch ID for deduplication: ${batchId}`);
            
            // Prepare headers with the correct mode
            const actionHeaders = new Headers();
            actionHeaders.set('Content-Type', 'application/json');
            
            // Copy the authorization header if it exists
            const authHeader = request.headers.get('authorization');
            if (authHeader) {
              actionHeaders.set('authorization', authHeader);
            }
            
            // Copy cookie header for auth context
            const cookieHeader = request.headers.get('cookie');
            if (cookieHeader) {
              actionHeaders.set('cookie', cookieHeader);
            }
            
            // Set user mode header explicitly only if in user mode
            if (isUserMode) {
              actionHeaders.set('x-bladex-user-mode', 'true');
              console.log('[QUERY] Setting user mode header for execute-action');
            } else {
              // Ensure no user mode header if in admin mode
              actionHeaders.delete('x-bladex-user-mode');
              console.log('[QUERY] Setting admin mode for execute-action');
            }
            
            const actionResponse = await fetch(actionUrl, {
              method: 'POST',
              headers: actionHeaders,
              body: JSON.stringify({
                action: 'send_message',
                message: parsedQuery.message,
                recipients: contactData || [],
                userMode: isUserMode, // Include the userMode flag in the body as well
                batchId: batchId // Include batch ID for deduplication
              })
            });
            
            const actionResult = await actionResponse.json();
            console.log('[QUERY] Action execution result:', actionResult);
          } catch (actionError) {
            console.error('[QUERY] Error executing action:', actionError);
          }
        }
        
        // Format contact data as memories for consistent handling
        const formattedMemories = contactData?.map(contact => {
          const latestMessage = contactMessages[contact.id];
          return {
            id: contact.id,
            user_id: contact.id,
            content: latestMessage.content,
            created_at: latestMessage.timestamp,
            memory_data: { 
              type: 'contact',
              messageTimestamp: latestMessage.timestamp
            },
            name: contact.name,
            contact_info: contact.contact_info
          };
        }).sort((a: any, b: any) => 
          new Date(b.memory_data.messageTimestamp).getTime() - 
          new Date(a.memory_data.messageTimestamp).getTime()
        ) || [];
        
        // If this is part of an action, return in the correct format for the UI
        if (parsedQuery.type === 'action') {
          return NextResponse.json({ 
            type: 'pending_action', 
            action: parsedQuery.action,
            message: parsedQuery.message,
            recipients: contactData || []
          });
        }
        
        return NextResponse.json({ 
          type: 'query_result', 
          memories: formattedMemories 
        });
      }
      
      if (functionName === 'get_customers_by_message_keyword_and_date_range') {
        // First, get messages matching the keyword and date range
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('contact_id, content, timestamp')
          .ilike('content', `%${parameters.keyword}%`)
          .gte('timestamp', parameters.start_date)
          .lte('timestamp', parameters.end_date);
          
        if (messageError) throw messageError;
        
        if (!messageData || messageData.length === 0) {
          return NextResponse.json({ 
            type: 'query_result', 
            memories: [] 
          });
        }
        
        // Get unique contact IDs with their latest matching message
        const contactMessages = messageData.reduce((acc: any, msg: any) => {
          if (!acc[msg.contact_id] || new Date(msg.timestamp) > new Date(acc[msg.contact_id].timestamp)) {
            acc[msg.contact_id] = msg;
          }
          return acc;
        }, {});
        
        const contactIds = Object.keys(contactMessages);
        
        // Then get the contact details
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .select('id, name, contact_info')
          .in('id', contactIds);
          
        if (contactError) throw contactError;
        
        // Format contact data as memories for consistent handling
        const formattedMemories = contactData?.map(contact => {
          const latestMessage = contactMessages[contact.id];
          return {
            id: contact.id,
            user_id: contact.id,
            content: latestMessage.content,
            created_at: latestMessage.timestamp,
            memory_data: { 
              type: 'contact',
              messageTimestamp: latestMessage.timestamp
            },
            name: contact.name,
            contact_info: contact.contact_info
          };
        }).sort((a: any, b: any) => 
          new Date(b.memory_data.messageTimestamp).getTime() - 
          new Date(a.memory_data.messageTimestamp).getTime()
        ) || [];
        
        return NextResponse.json({ 
          type: 'query_result', 
          memories: formattedMemories 
        });
      }
    }

    // Handle action type
    if (parsedQuery.type === 'action') {
      if (parsedQuery.action === 'send_message') {
        const { functionName, parameters } = parsedQuery.query;
        
        // Validate action parameters
        if (!functionName || !parameters || !parsedQuery.message) {
          return NextResponse.json({
            type: 'error',
            error: 'Query is not relevant. Please try a different query format or rephrase your question.'
          });
        }
        
        // Get the list of customers using the direct approach
        let data;
        if (functionName === 'get_customers_by_message_keyword') {
          if (!parameters.keyword) {
            return NextResponse.json({
              type: 'error',
              error: 'Query is not relevant. Please try a different query format or rephrase your question.'
            });
          }
          // First, get messages matching the keyword
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('contact_id')
            .ilike('content', `%${parameters.keyword}%`);
            
          if (messageError) throw messageError;
          
          if (messageData && messageData.length > 0) {
            // Get unique contact IDs
            const contactIds = Array.from(new Set(messageData.map(msg => msg.contact_id)));
            
            // Then get the contact details
            const { data: contactData, error: contactError } = await supabase
              .from('contacts')
              .select('id, name, contact_info')
              .in('id', contactIds);
              
            if (contactError) throw contactError;
            data = contactData;
          } else {
            data = [];
          }
        } else if (functionName === 'get_customers_by_message_keyword_and_date_range') {
          // First, get messages matching the keyword and date range
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('contact_id, content, timestamp')
            .ilike('content', `%${parameters.keyword}%`)
            .gte('timestamp', parameters.start_date)
            .lte('timestamp', parameters.end_date);
            
          if (messageError) throw messageError;
          
          if (messageData && messageData.length > 0) {
            // Get unique contact IDs
            const contactIds = Array.from(new Set(messageData.map(msg => msg.contact_id)));
            
            // Then get the contact details
            const { data: contactData, error: contactError } = await supabase
              .from('contacts')
              .select('id, name, contact_info')
              .in('id', contactIds);
              
            if (contactError) throw contactError;
            data = contactData;
          } else {
            data = [];
          }
        }
        
        // Return pending action for approval
        return NextResponse.json({ 
          type: 'pending_action', 
          action: 'send_message',
          message: parsedQuery.message,
          recipients: data || []
        });
      }
    }

    // If we get here, the query didn't match any expected format
    return NextResponse.json({
      type: 'error',
      error: 'Query is not relevant. Please try a different query format or rephrase your question.'
    });
  } catch (error: any) {
    console.error('Error processing query:', error);
    return NextResponse.json({
      type: 'error',
      error: 'Query is not relevant. Please try a different query format or rephrase your question.'
    });
  }
}

/**
 * Get a summary of a customer based on their name
 * @param customerName The name of the customer to get a summary for
 * @param supabaseClient The Supabase client to use
 * @returns NextResponse with the customer summary data
 */
async function getCustomerSummary(customerName: string, supabaseClient: any) {
  try {
    console.log(`Looking for customer summary with name: "${customerName}"`);
    
    // Get the contact by name
    const { data: contactData, error: contactError } = await supabaseClient
      .from('contacts')
      .select('id, name, contact_info')
      .ilike('name', `%${customerName}%`)
      .limit(1);
      
    if (contactError) {
      console.error('Error getting contact for summary:', contactError);
      return NextResponse.json({
        type: 'error',
        error: 'Could not retrieve customer information'
      });
    }
    
    // If found contact in contacts table
    if (contactData && contactData.length > 0) {
      console.log(`Found contact in contacts table: ${contactData[0].name}`);
      const contactId = contactData[0].id;
      const contact = {
        id: contactId,
        name: contactData[0].name,
        contact_info: contactData[0].contact_info
      };
      
      // Get recent messages for this contact
      const { data: messageData, error: messageError } = await supabaseClient
        .from('messages')
        .select('content, is_from_customer, timestamp')
        .eq('contact_id', contactId)
        .order('timestamp', { ascending: false })
        .limit(10);
        
      if (messageError) {
        console.error('Error getting messages for summary:', messageError);
      }
      
      // Get memories from memory_with_contacts view for richer data
      console.log(`Fetching memories for contact: ${contactId}`);
      const { data: memoriesData, error: memoriesError } = await supabaseClient
        .from('memory_with_contacts')
        .select('*')
        .eq('user_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (memoriesError) {
        console.error('Error fetching memories from view:', memoriesError);
      }
      
      console.log(`Found ${memoriesData?.length || 0} memories in memory_with_contacts view`);
      
      // Also fetch using vector similarity if we have enough memories
      let vectorMemories: any[] = [];
      
      if (contactData[0].name) {
        try {
          // Use direct text search instead of embedding since generate_embedding function doesn't exist
          console.log('Performing text-based similarity search');
          
          // Search for memories directly related to this user with content similar to their name
          const { data: textMatchData, error: textMatchError } = await supabaseClient
            .from('memory')
            .select('*')
            .eq('user_id', contactId)
            .textSearch('content', contactData[0].name.split(' ').join(' | '), {
              config: 'english'
            })
            .limit(10);
            
          if (textMatchError) {
            console.error('Error text-searching memories:', textMatchError);
          } else if (textMatchData) {
            console.log(`Found ${textMatchData.length} memories via text search`);
            vectorMemories = textMatchData;
          }
          
          // Try to also use match_memory directly if textSearch didn't find enough results
          if (!textMatchData || textMatchData.length < 5) {
            console.log('Attempting to use match_memory directly');
            
            // Use direct keyword matching from the memory table
            const { data: matchData, error: matchError } = await supabaseClient
              .from('memory')
              .select('*')
              .eq('user_id', contactId)
              .order('created_at', { ascending: false })
              .limit(10);
              
            if (matchError) {
              console.error('Error fetching additional memories:', matchError);
            } else if (matchData) {
              console.log(`Found ${matchData.length} additional memories`);
              
              // Add these to the vector memories list if not already included
              const existingIds = new Set(vectorMemories.map(m => m.id));
              const newMemories = matchData.filter((m: any) => !existingIds.has(m.id));
              
              console.log(`Adding ${newMemories.length} new memories to results`);
              vectorMemories = [...vectorMemories, ...newMemories];
            }
          }
        } catch (err) {
          console.error('Error during memory search:', err);
        }
      }
      
      // Combine and deduplicate memories
      const allMemories = [...(memoriesData || []), ...(vectorMemories || [])];
      const uniqueMemories = allMemories.filter((memory, index, self) => 
        index === self.findIndex(m => m.id === memory.id)
      );
      
      console.log(`Combined ${uniqueMemories.length} unique memories for summary`);
      
      // Return in summary_result format for CustomerSummaryDashboard component
      return NextResponse.json({ 
        type: 'summary_result', 
        contact: contact,
        memories: uniqueMemories
      });
    }
    
    // If no contact found, try to find in memory table
    console.log(`No contact found in contacts table, checking memory table...`);
    const { data: memoryData, error: memoryError } = await supabaseClient
      .from('memory_with_contacts')
      .select('*')
      .ilike('content', `%${customerName}%`)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (memoryError) {
      console.error('Error searching memory table:', memoryError);
    }
    
    if (memoryData && memoryData.length > 0) {
      console.log(`Found ${memoryData.length} memories related to "${customerName}"`);
      
      // Get the user info from the first memory
      const userId = memoryData[0].user_id;
      
      // Get contact info
      const { data: userContactData } = await supabaseClient
        .from('contacts')
        .select('id, name, contact_info')
        .eq('id', userId)
        .single();
      
      const contact = userContactData || {
        id: userId,
        name: memoryData[0].user_name || 'Unknown',
        contact_info: memoryData[0].contact_info || 'Unknown'
      };
      
      // Return in summary_result format
      return NextResponse.json({ 
        type: 'summary_result', 
        contact: contact,
        memories: memoryData
      });
    }
    
    // If still no data found, return empty result with error
    console.log(`No data found for "${customerName}" in either contacts or memory table`);
    return NextResponse.json({
      type: 'error',
      error: `Could not find any information about ${customerName}`
    });
  } catch (error) {
    console.error('Error in getCustomerSummary:', error);
    return NextResponse.json({
      type: 'error',
      error: 'An error occurred while retrieving customer information'
    });
  }
}