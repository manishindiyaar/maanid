import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/getSupabaseClient';

/**
 * GET endpoint to list available bots
 * 
 * Query parameters:
 * - platform: Filter by platform (e.g., 'telegram')
 * - active: Filter by active status ('true' or 'false')
 * - mode: Force mode to use ('admin' or 'user')
 * 
 * @param request NextRequest
 * @returns JSON response with list of bots
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    const active = url.searchParams.get('active');
    const mode = url.searchParams.get('mode');
    
    // Determine if we should force a specific mode
    const options = {
      forceAdmin: mode === 'admin',
      forceUser: mode === 'user',
      requestHeaders: request.headers
    };
    
    // Log the request parameters
    console.log(`[BOTS API] Fetching bots with filters:`, { platform, active, mode });
    
    // Get the Supabase client using our utility
    const supabase = await getSupabaseClient(options);
    
    // Build query with optional filters
    let query = supabase
      .from('bots')
      .select('id, name, platform, token, username, telegram_id, webhook_url, is_active, created_at, updated_at, organization_id');
    
    // Apply filters if provided
    if (platform) {
      query = query.eq('platform', platform);
      console.log(`[BOTS API] Filtering by platform: ${platform}`);
    }
    
    if (active === 'true') {
      query = query.eq('is_active', true);
      console.log(`[BOTS API] Filtering for active bots only`);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
      console.log(`[BOTS API] Filtering for inactive bots only`);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('[BOTS API] Error fetching bots:', error);
      return NextResponse.json({ 
        error: 'Database error fetching bots',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    // If no bots found, return empty array
    if (!data || data.length === 0) {
      console.log('[BOTS API] No bots found matching criteria');
      return NextResponse.json({ bots: [] }, { status: 200 });
    }
    
    // Sanitize tokens before returning for security
    const sanitizedBots = data.map(bot => ({
      ...bot,
      token: bot.token ? `${bot.token.substring(0, 8)}...` : null
    }));
    
    console.log(`[BOTS API] Found ${data.length} bots`);
    return NextResponse.json({ bots: sanitizedBots }, { status: 200 });
  } catch (error: any) {
    console.error('[BOTS API] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
