import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { encryptCredentials } from './encryption';
import { getSupabaseMode } from '@/lib/supabase/modeDetection';

/**
 * Register a bot in the bot registry for efficient webhook handling
 * This should be called whenever a new bot is created or updated
 * 
 * @param token The bot token
 * @param ownerId The owner's user ID
 * @param ownerEmail The owner's email
 * @param databaseUrl The Supabase URL for the user's database (or admin DB for admin bots)
 * @param databaseKey The Supabase anon key for the user's database (or admin DB for admin bots)
 * @param isAdminBot Whether this bot should use the admin database (true) or user database (false)
 * @returns Success indicator and any error
 */
export async function registerBotInRegistry(
  token: string,
  ownerId: string,
  ownerEmail: string,
  databaseUrl: string,
  databaseKey: string,
  isAdminBot: boolean = false
) {
  console.log(`🔖 Registering bot in registry (${isAdminBot ? 'ADMIN' : 'USER'} mode)`);
  
  try {
    const admin = createAdminSupabaseClient();

    // First check if this bot already exists in the registry
    console.log('🔍 Checking if bot already exists in registry...');
    const { data: existingBot, error: checkError } = await admin
      .from('bot_registry')
      .select('token')
      .eq('token', token)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking bot registry:', checkError);
      // Continue with registration attempt anyway
    } else if (existingBot) {
      console.log('🔄 Bot already exists in registry, updating entry');
      
      // Use update if bot already exists
      const { data: updatedData, error: updateError } = await admin
        .from('bot_registry')
        .update({
          owner_id: ownerId,
          owner_email: ownerEmail,
          database_url: databaseUrl,
          database_key: databaseKey,
          is_admin_bot: isAdminBot,
          updated_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        })
        .eq('token', token)
        .select('token');

      if (updateError) {
        console.error('❌ Failed to update bot in registry:', updateError);
        return { success: false, error: updateError };
      }

      console.log('✅ Bot registry entry updated successfully');
      return { success: true, ownerId };
    }
    
    // If bot doesn't exist or check failed, try to insert
    console.log('🆕 Creating new bot registry entry');
    
    // First try the RPC function
    try {
      const { data, error } = await admin.rpc('register_bot_in_registry', {
        p_token: token,
        p_owner_id: ownerId,
        p_owner_email: ownerEmail,
        p_database_url: databaseUrl,
        p_database_key: databaseKey,
        p_is_admin_bot: isAdminBot
      });
      
      if (error) {
        console.error('❌ RPC registration failed:', error);
        throw error; // Will be caught below and fallback to direct insert
      }
      
      console.log('✅ Bot successfully registered in registry via RPC');
      return { success: true, ownerId: data };
    } catch (rpcError) {
      console.warn('⚠️ RPC failed, falling back to direct insert:', rpcError);
      
      // Fallback to direct insert
      const { data: insertData, error: insertError } = await admin
        .from('bot_registry')
        .insert({
          token: token,
          owner_id: ownerId,
          owner_email: ownerEmail,
          database_url: databaseUrl,
          database_key: databaseKey,
          is_admin_bot: isAdminBot,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        })
        .select('token');
      
      if (insertError) {
        console.error('❌ Failed to insert bot in registry:', insertError);
        return { success: false, error: insertError };
      }
      
      console.log('✅ Bot successfully registered in registry via direct insert');
      return { success: true, ownerId };
    }
  } catch (error) {
    console.error('❌ Error registering bot:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Register a bot in USER mode with the registry
 * This simplifies the process by taking credentials object
 * 
 * @param token The bot token
 * @param ownerId The owner's user ID
 * @param ownerEmail The owner's email
 * @param credentials The user's Supabase credentials
 * @returns Success indicator and any error
 */
export async function registerUserBot(
  token: string,
  ownerId: string,
  ownerEmail: string,
  credentials: { supabase_url: string; supabase_anon_key: string }
) {
  if (!token || token.trim() === '') {
    console.error('❌ Invalid token provided for registration');
    return { success: false, error: 'Invalid bot token' };
  }

  if (!ownerId || ownerId.trim() === '') {
    console.error('❌ Invalid owner ID provided for registration');
    return { success: false, error: 'Invalid owner ID' };
  }

  if (!ownerEmail || ownerEmail.trim() === '') {
    console.error('❌ Missing owner email for registration');
    return { success: false, error: 'Missing owner email' };
  }

  if (!credentials || !credentials.supabase_url || !credentials.supabase_anon_key) {
    console.error('❌ Missing or invalid credentials for registration');
    return { success: false, error: 'Invalid credentials' };
  }

  return registerBotInRegistry(
    token,
    ownerId,
    ownerEmail,
    credentials.supabase_url,
    credentials.supabase_anon_key,
    false // USER mode
  );
}

/**
 * Register a bot in ADMIN mode with the registry
 * This simplifies the process by using admin credentials directly
 * 
 * @param token The bot token
 * @param ownerId The owner's user ID (optional for admin bots)
 * @param ownerEmail The owner's email (optional for admin bots)
 * @returns Success indicator and any error
 */
export async function registerAdminBot(
  token: string,
  ownerId: string = '',
  ownerEmail: string = ''
) {
  if (!token || token.trim() === '') {
    console.error('❌ Invalid token provided for registration');
    return { success: false, error: 'Invalid bot token' };
  }

  console.log('🔖 [BOT REGISTER] Registering bot in registry for ADMIN mode');
  
  const adminClient = createAdminSupabaseClient();
  
  // For admin bots, use the admin database URL and key
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const databaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!databaseUrl || !databaseKey) {
    return {
      success: false,
      error: 'Missing admin database credentials in environment variables'
    };
  }

  try {
    // First check if this bot already exists in the registry to update it
    const { data: existingBot } = await adminClient
      .from('bot_registry')
      .select('token')
      .eq('token', token)
      .maybeSingle();

    if (existingBot) {
      // Update existing bot
      const { error: updateError } = await adminClient
        .from('bot_registry')
        .update({
          database_url: databaseUrl,
          database_key: databaseKey,
          is_admin_bot: true,
          updated_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        })
        .eq('token', token);

      if (updateError) {
        console.error('❌ [BOT REGISTER] Failed to update admin bot in registry:', updateError);
        return { success: false, error: updateError };
      }

      console.log('✅ [BOT REGISTER] Updated admin bot in registry');
      return { success: true };
    }

    // For new bots in admin mode, try direct insert first (avoiding owner constraints)
    const { error: insertError } = await adminClient
      .from('bot_registry')
      .insert({
        token: token,
        database_url: databaseUrl,
        database_key: databaseKey,
        is_admin_bot: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_used: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ [BOT REGISTER] Failed to insert admin bot in registry:', insertError);
      
      // Try insert with owner ID and email if provided (might fail if they don't exist)
      if (ownerId && ownerEmail) {
        try {
          const { error: insertWithOwnerError } = await adminClient
            .from('bot_registry')
            .insert({
              token: token,
              owner_id: ownerId,
              owner_email: ownerEmail,
              database_url: databaseUrl,
              database_key: databaseKey,
              is_admin_bot: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_used: new Date().toISOString()
            });
            
          if (insertWithOwnerError) {
            console.error('❌ [BOT REGISTER] Failed to insert admin bot with owner details:', insertWithOwnerError);
            return { success: false, error: insertWithOwnerError };
          }
        } catch (ownerInsertError) {
          console.error('❌ [BOT REGISTER] Error during owner insert attempt:', ownerInsertError);
          return { success: false, error: insertError };
        }
      } else {
        return { success: false, error: insertError };
      }
    }
    
    console.log('✅ [BOT REGISTER] Registered admin bot in registry');
    return { success: true };
  } catch (error) {
    console.error('❌ [BOT REGISTER] Failed to register admin bot in registry:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete a bot from the registry and user database
 * This should be called whenever a bot is deleted from the frontend
 * 
 * @param token The bot token
 * @param userClient Optional Supabase client for the user database (if available)
 * @param skipRegistry Whether to skip registry operations (true for ADMIN mode)
 * @returns Success indicator and any error
 */
export async function deleteBotFromRegistryAndUserDb(
  token: string,
  userClient?: any,
  skipRegistry: boolean = false
) {
  console.log(`🗑️ Deleting bot from registry and user DB: ${token.substring(0, 5)}...`);
  
  try {
    const admin = createAdminSupabaseClient();
    let userDbDeleted = false;
    let registryDeleted = skipRegistry; // If we're skipping registry, consider it already deleted
    
    // Check if we're in ADMIN mode
    const mode = getSupabaseMode();
    if (mode === 'ADMIN') {
      console.log('👑 ADMIN mode detected - skipping registry operations');
      skipRegistry = true;
      registryDeleted = true;
    }
    
    // 1. First, if we have a user client, delete from user DB
    if (userClient) {
      try {
        console.log('🔄 Attempting to delete bot from user database');
        const { error: userDeleteError } = await userClient
          .from('bots')
          .delete()
          .eq('token', token);
        
        if (userDeleteError) {
          console.error('⚠️ Error deleting from user database:', userDeleteError);
        } else {
          console.log('✅ Successfully deleted bot from user database');
          userDbDeleted = true;
        }
      } catch (userDbError) {
        console.error('❌ Failed to delete bot from user database:', userDbError);
        // Continue with registry deletion even if user DB deletion fails
      }
    }
    
    // 2. If we don't have a user client or user DB deletion failed, 
    // try to find user credentials from registry and delete from their DB
    if (!userDbDeleted && !userClient && !skipRegistry) {
      try {
        // Get bot credentials from registry
        const { data: botEntry } = await admin
          .from('bot_registry')
          .select('database_url, database_key, is_admin_bot')
          .eq('token', token)
          .maybeSingle();
        
        if (botEntry && !botEntry.is_admin_bot) {
          console.log('🔍 Found bot credentials in registry, attempting to delete from user DB');
          
          // Create a temporary client with these credentials
          const { createClient } = await import('@supabase/supabase-js');
          const tempClient = createClient(
            botEntry.database_url,
            botEntry.database_key,
            { auth: { autoRefreshToken: false, persistSession: false }}
          );
          
          // Delete from user's database
          const { error: userDbError } = await tempClient
            .from('bots')
            .delete()
            .eq('token', token);
          
          if (userDbError) {
            console.error('⚠️ Error deleting from user database via registry credentials:', userDbError);
          } else {
            console.log('✅ Successfully deleted bot from user database via registry credentials');
            userDbDeleted = true;
          }
        }
      } catch (credentialsError) {
        console.error('❌ Error using credentials from registry:', credentialsError);
        // Continue with registry deletion
      }
    }
    
    // 3. Finally, delete from bot_registry in admin DB if not skipping registry operations
    if (!skipRegistry) {
      try {
        console.log('🔄 Deleting bot from admin registry');
        
        // First, check if the bot exists in the registry
        const { data: registryEntry, error: checkError } = await admin
          .from('bot_registry')
          .select('token')
          .eq('token', token)
          .maybeSingle();
          
        if (checkError) {
          console.error('❌ Error checking bot in registry:', checkError);
        } else if (!registryEntry) {
          console.log('⚠️ Bot not found in registry, nothing to delete');
          // Consider it a success since there's nothing to delete
          registryDeleted = true;
          return { success: true, userDbDeleted, registryDeleted };
        } else {
          console.log('✅ Found bot in registry, proceeding with deletion');
        }
        
        // Try RPC function first if available
        try {
          console.log('🔄 Attempting to delete via RPC with token:', token.substring(0, 5) + '...');
          const { data, error } = await admin.rpc('delete_bot_from_registry', {
            p_token: token
          });
          
          console.log('RPC response:', { data, error });
          
          if (error) {
            console.error('⚠️ RPC deletion failed:', error);
            throw error; // Will be caught and fall back to direct delete
          }
          
          console.log('✅ Successfully deleted bot from registry via RPC');
          registryDeleted = true;
        } catch (rpcError) {
          // Fall back to direct delete
          console.log('⚠️ Falling back to direct delete from registry, error:', rpcError);
          
          const { error: deleteError } = await admin
            .from('bot_registry')
            .delete()
            .eq('token', token);
          
          if (deleteError) {
            console.error('❌ Failed to delete bot from registry:', deleteError);
          } else {
            console.log('✅ Successfully deleted bot from registry via direct delete');
            registryDeleted = true;
          }
        }
      } catch (registryError) {
        console.error('❌ Error deleting from registry:', registryError);
      }
    }
    
    return { 
      success: registryDeleted || userDbDeleted, 
      userDbDeleted,
      registryDeleted
    };
  } catch (error) {
    console.error('❌ Error in deleteBotFromRegistryAndUserDb:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      error: errorMessage,
      userDbDeleted: false,
      registryDeleted: false
    };
  }
} 