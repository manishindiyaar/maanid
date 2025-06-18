import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from './../../../lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Create request headers for context
    const headers = new Headers();
    headers.set('x-admin-data', 'true');
    
    // Force ADMIN MODE
    const cookieStore = cookies();
    cookieStore.set('admin_mode', 'true');
    
    console.log('👑 [ADMIN-DATA] Enforcing ADMIN MODE for data access');
    
    // Get the appropriate Supabase client using server.ts in ADMIN MODE
    const supabase = await getServerSupabaseClient(headers);
    
    // Get URL params for filtering
    const url = new URL(request.url);
    const botsOnly = url.searchParams.get('bots') === 'true';
    const contactsOnly = url.searchParams.get('contacts') === 'true';
    const platform = url.searchParams.get('platform') || null;
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Initialize response object
    const response: any = { success: true, mode: 'ADMIN' };
    
    // Fetch bots if requested or both are requested
    if (!contactsOnly) {
      console.log('🔍 [ADMIN-DATA] Fetching bots...');
      
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
        console.error('❌ [ADMIN-DATA] Error fetching bots:', botsError);
        response.botsError = botsError.message;
      } else {
        response.bots = bots || [];
        response.botsCount = bots?.length || 0;
        console.log(`✅ [ADMIN-DATA] Found ${bots?.length || 0} bots`);
      }
    }
    
    // Fetch contacts if requested or both are requested
    if (!botsOnly) {
      console.log('🔍 [ADMIN-DATA] Fetching contacts...');
      
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, contact_info, last_contact, created_at')
        .order('last_contact', { ascending: false, nullsFirst: false })
        .limit(limit);
      
      if (contactsError) {
        console.error('❌ [ADMIN-DATA] Error fetching contacts:', contactsError);
        response.contactsError = contactsError.message;
      } else {
        response.contacts = contacts || [];
        response.contactsCount = contacts?.length || 0;
        console.log(`✅ [ADMIN-DATA] Found ${contacts?.length || 0} contacts`);
      }
    }
    
    // Return the combined response
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [ADMIN-DATA] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      mode: 'ADMIN'
    }, { status: 500 });
  }
} 
