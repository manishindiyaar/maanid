import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from './../../../lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // Create request headers for context
    const headers = new Headers();
    headers.set('x-user-data', 'true');
    
    // Ensure we're in USER MODE
    const cookieStore = cookies();
    cookieStore.delete('admin_mode'); // Force USER MODE
    
    // Set supabase credentials for a specific test user (like Manish) for USER MODE 
    // Note: In production, these would come from the logged-in user's session
    cookieStore.set('supabase_url', process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    cookieStore.set('supabase_anon_key', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    
    // Copy cookie values to headers for server.ts
    const allCookies = cookieStore.getAll();
    if (allCookies.length > 0) {
      const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
      headers.set('cookie', cookieHeader);
      
      // Also set the x-bladex-user-mode header
      headers.set('x-bladex-user-mode', 'true');
    }
    
    console.log('👤 [USER-DATA] Enforcing USER MODE for data access');
    
    // Check URL for testing email (to look up specific user credentials)
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('email') || 'manish@test.com'; // Default test email
    
    // Add email to headers for server.ts to look up credentials
    headers.set('x-user-email', userEmail);
    console.log(`👤 [USER-DATA] Using credentials for email: ${userEmail}`);
    
    // Get the appropriate Supabase client using server.ts in USER MODE
    const supabase = await getServerSupabaseClient(headers);
    
    // Get URL params for filtering
    const botsOnly = url.searchParams.get('bots') === 'true';
    const contactsOnly = url.searchParams.get('contacts') === 'true';
    const platform = url.searchParams.get('platform') || null;
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Initialize response object
    const response: any = { success: true, mode: 'USER', email: userEmail };
    
    // Fetch bots if requested or both are requested
    if (!contactsOnly) {
      console.log('🔍 [USER-DATA] Fetching user bots...');
      
      try {
        // Build query for bots
        let botsQuery = supabase
          .from('bots')
          .select('id, name, platform, username, is_active, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Apply platform filter if provided
        if (platform) {
          botsQuery = botsQuery.eq('platform', platform);
        }
        
        // Execute query
        const { data: bots, error: botsError } = await botsQuery;
        
        if (botsError) {
          console.error('❌ [USER-DATA] Error fetching bots:', botsError);
          response.botsError = botsError.message;
        } else {
          response.bots = bots || [];
          response.botsCount = bots?.length || 0;
          console.log(`✅ [USER-DATA] Found ${bots?.length || 0} bots`);
        }
      } catch (botsException: any) {
        console.error('❌ [USER-DATA] Exception fetching bots:', botsException);
        response.botsException = botsException.message;
      }
    }
    
    // Fetch contacts if requested or both are requested
    if (!botsOnly) {
      console.log('🔍 [USER-DATA] Fetching user contacts...');
      
      try {
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('id, name, contact_info, last_contact, created_at')
          .order('last_contact', { ascending: false, nullsFirst: false })
          .limit(limit);
        
        if (contactsError) {
          console.error('❌ [USER-DATA] Error fetching contacts:', contactsError);
          response.contactsError = contactsError.message;
        } else {
          // Sanitize contact info for security
          response.contacts = contacts?.map(contact => ({
            ...contact,
            contact_info: contact.contact_info 
              ? `${contact.contact_info.substring(0, 5)}...` 
              : null
          })) || [];
          response.contactsCount = contacts?.length || 0;
          console.log(`✅ [USER-DATA] Found ${contacts?.length || 0} contacts`);
        }
      } catch (contactsException: any) {
        console.error('❌ [USER-DATA] Exception fetching contacts:', contactsException);
        response.contactsException = contactsException.message;
      }
    }
    
    // Always fetch recent messages for context
    console.log('🔍 [USER-DATA] Fetching recent messages...');
    
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, contact_id, content, is_from_customer, is_sent, message_status, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (messagesError) {
        console.error('❌ [USER-DATA] Error fetching recent messages:', messagesError);
        response.messagesError = messagesError.message;
      } else if (messages && messages.length > 0) {
        // Sanitize message content
        response.recentMessages = messages.map(msg => ({
          ...msg,
          content: msg.content.length > 30 
            ? `${msg.content.substring(0, 30)}...` 
            : msg.content
        }));
        console.log(`✅ [USER-DATA] Found ${messages.length} recent messages`);
      }
    } catch (messagesError: any) {
      console.error('❌ [USER-DATA] Exception fetching messages:', messagesError);
      response.messagesException = messagesError.message;
    }
    
    // Fetch user information for debugging
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userData?.user) {
        response.user = {
          id: userData.user.id,
          email: userData.user.email,
          role: userData.user.role
        };
      } else if (userError) {
        response.userError = userError.message;
      }
    } catch (userException: any) {
      response.userException = userException.message;
    }
    
    // Return the combined response
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [USER-DATA] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      mode: 'USER'
    }, { status: 500 });
  }
} 