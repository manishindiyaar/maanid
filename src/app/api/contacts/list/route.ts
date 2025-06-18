import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from './../../../../lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

//This is just for testing purposes and should be removed in production

export async function GET(request: Request) {
  try {
    // Create request headers for context
    const headers = new Headers();
    headers.set('x-list-contacts', 'true');
    
    // Get the appropriate Supabase client using server.ts (handles USER/ADMIN MODE)
    const supabase = await getServerSupabaseClient(headers);
    
    const cookieStore = cookies();
    const isAdminMode = cookieStore?.get('admin_mode')?.value === 'true';
    
    if (isAdminMode) {
      console.log('👑 [CONTACTS LIST] Operating in ADMIN MODE');
    } else {
      console.log('👤 [CONTACTS LIST] Operating in USER MODE');
    }
    
    // Build query
    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, name, contact_info, last_contact, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('❌ [CONTACTS LIST] Database error fetching contacts:', error);
        return NextResponse.json({ 
          error: 'Database error fetching contacts',
          details: error.message,
          code: error.code
        }, { status: 500 });
      }
      
      if (!contacts || contacts.length === 0) {
        console.log('⚠️ [CONTACTS LIST] No contacts found');
        return NextResponse.json({ contacts: [] }, { status: 200 });
      }
      
      console.log(`✅ [CONTACTS LIST] Found ${contacts.length} contacts`);
      return NextResponse.json({ contacts });
    } catch (dbError: any) {
      console.error('❌ [CONTACTS LIST] Exception executing query:', dbError);
      return NextResponse.json({ 
        error: 'Exception executing query',
        details: dbError.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ [CONTACTS LIST] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
} 