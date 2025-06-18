import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    const active = url.searchParams.get('active');
    
    // Create headers to simulate a webhook request
    const headers = new Headers(request.headers);
    headers.set('x-webhook', 'true');
    
    // Set path that looks like a webhook path to trigger the multi-tenant search
    if (platform === 'telegram') {
      headers.set('x-invoke-path', '/api/bots/telegram/webhook');
    } else {
      headers.set('x-invoke-path', '/api/bots/webhook');
    }
    
    // Log mode for debugging
    const cookieStore = cookies();
    const isAdminMode = cookieStore?.get('admin_mode')?.value === 'true';
    
    if (isAdminMode) {
      console.log('👑 [BOTS LIST] Operating in ADMIN MODE');
    } else {
      console.log('👤 [BOTS LIST] Operating in USER MODE');
    }
    
    // Log the filters being applied
    console.log(`[BOTS LIST] Filters: platform=${platform || 'any'}, active=${active || 'any'}`);
    
    // Get Supabase client using the server.ts logic with webhook detection
    const supabase = await getServerSupabaseClient(headers);
    
    // Build query using only schema fields
    let query = supabase
      .from('bots')
      .select('id, name, platform, token, username, telegram_id, webhook_url, is_active, created_at, updated_at, organization_id');
    
    // Apply filters if provided
    if (platform) {
      query = query.eq('platform', platform);
      console.log(`[BOTS LIST] Filtering by platform: ${platform}`);
    }
    
    if (active === 'true') {
      query = query.eq('is_active', true);
      console.log(`[BOTS LIST] Filtering for active bots only`);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
      console.log(`[BOTS LIST] Filtering for inactive bots only`);
    }
    
    // Execute query
    try {
      const { data: bots, error } = await query;
      
      if (error) {
        console.error('❌ [BOTS LIST] Database error fetching bots:', error);
        return NextResponse.json({ 
          error: 'Database error fetching bots',
          details: error.message,
          code: error.code
        }, { status: 500 });
      }
      
      if (!bots || bots.length === 0) {
        console.log('⚠️ [BOTS LIST] No bots found matching criteria');
        return NextResponse.json({ bots: [] }, { status: 200 });
      }
      
      // Sanitize tokens before returning
      const sanitizedBots = bots.map((bot: { token: string; }) => ({
        ...bot,
        token: bot.token ? `${bot.token.substring(0, 8)}...` : null
      }));
      
      console.log(`✅ [BOTS LIST] Found ${bots.length} bots`);
      return NextResponse.json({ bots: sanitizedBots });
    } catch (dbError: any) {
      console.error('❌ [BOTS LIST] Exception executing query:', dbError);
      return NextResponse.json({ 
        error: 'Exception executing query',
        details: dbError.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ [BOTS LIST] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
} 