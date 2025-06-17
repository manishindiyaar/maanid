import { NextResponse } from 'next/server';
import { getServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { isAdminModeServer } from '@/lib/utils/admin-mode';
import { cookies } from 'next/headers';
import { deleteBotFromRegistryAndUserDb } from '@/lib/utils/bot-registry';

/**
 * API endpoint to delete a bot from both user database and admin registry
 */
export async function DELETE(request: Request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing required field: token' },
        { status: 400 }
      );
    }
    
    // Determine if we're in admin mode
    const cookieStore = cookies();
    const isAdminMode = isAdminModeServer(cookieStore);
    
    console.log(`🔐 [BOT DELETE] Operating in ${isAdminMode ? 'ADMIN' : 'USER'} mode`);
    console.log(`🤖 Deleting bot with token: ${token.substring(0, 5)}...`);
    
    // Get the appropriate Supabase client
    const supabase = await getServerSupabaseClient(request.headers);
    
    // First delete from database directly
    let userDbDeleted = false;
    try {
      console.log('🔄 Deleting bot from database');
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('token', token);
      
      if (error) {
        console.error('❌ Error deleting from database:', error);
      } else {
        console.log('✅ Successfully deleted bot from database');
        userDbDeleted = true;
      }
    } catch (error) {
      console.error('❌ Failed to delete bot from database:', error);
      // Continue with registry deletion
    }
    
    // Then delete from the bot registry (which will also try to delete from user DB if needed)
    const result = await deleteBotFromRegistryAndUserDb(token, userDbDeleted ? null : supabase);
    
    // Debug logging for registry deletion
    console.log('🔍 Registry deletion result:', result);
    
    if (!result.registryDeleted) {
      // Try direct admin deletion as a fallback
      try {
        console.log('⚠️ Registry deletion failed, trying direct admin deletion');
        const admin = createAdminSupabaseClient();
        const { error: registryError } = await admin
          .from('bot_registry')
          .delete()
          .eq('token', token);
          
        if (registryError) {
          console.error('❌ Direct registry deletion failed:', registryError);
        } else {
          console.log('✅ Successfully deleted from registry via direct deletion');
          result.registryDeleted = true;
        }
      } catch (directError) {
        console.error('❌ Error in direct registry deletion:', directError);
      }
    }
    
    // Consider success if either database deletion or registry deletion worked
    const success = userDbDeleted || result.userDbDeleted || result.registryDeleted;
    
    // Return response
    return NextResponse.json({
      success,
      userDbDeleted: userDbDeleted || result.userDbDeleted,
      registryDeleted: result.registryDeleted,
      message: success 
        ? 'Bot successfully deleted' 
        : 'Failed to delete bot completely'
    });
  } catch (error) {
    console.error('❌ Error in bot delete API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 