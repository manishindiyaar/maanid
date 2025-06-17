/**
 * Supabase client utility
 * Provides a centralized client for Supabase operations
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config');

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

// Initialize Supabase client with anon key for client-side operations
const supabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);

// Agent operations
async function getAgents() {
  try {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('*');
    
    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
    
    // Add default values for missing fields
    const enhancedAgents = data.map(agent => ({
      ...agent,
      priority: agent.priority || 'medium', // Default priority if not in schema
      enabled: agent.enabled !== undefined ? agent.enabled : true, // Default to enabled
      model: agent.model || 'claude-3-haiku-20240307', // Default model
      type: agent.type || 'llm' // Default type
    }));
    
    // Sort by priority (high, medium, low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    enhancedAgents.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      return aPriority - bPriority;
    });
    
    return enhancedAgents;
  } catch (error) {
    console.error('Error in getAgents:', error);
    return [];
  }
}

async function createAgent(agentData) {
  // Remove fields that might not exist in the schema
  const { priority, enabled, model, type, ...essentialData } = agentData;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert(essentialData)
      .select();
    
    if (error) {
      console.error(`Error creating agent ${agentData.name}:`, error);
      return null;
    }
    
    // Return the created agent with the additional fields
    return {
      ...data[0],
      priority: priority || 'medium',
      enabled: enabled !== undefined ? enabled : true,
      model: model || 'claude-3-haiku-20240307',
      type: type || 'llm'
    };
  } catch (error) {
    console.error(`Error in createAgent for ${agentData.name}:`, error);
    return null;
  }
}

async function deleteAgent(agentId) {
  const { error } = await supabaseAdmin
    .from('agents')
    .delete()
    .eq('id', agentId);
  
  if (error) {
    console.error(`Error deleting agent ${agentId}:`, error);
    return false;
  }
  
  return true;
}

// Message operations
async function getUnviewedMessages() {
  const { data, error } = await supabaseAdmin.rpc('get_unseen_messages');
  
  if (error) {
    console.error('Error fetching unviewed messages:', error);
    return [];
  }
  
  return data;
}

async function markMessageAsViewed(messageId) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .update({ is_viewed: true })
    .eq('id', messageId)
    .select();
  
  if (error) {
    console.error(`Error marking message ${messageId} as viewed:`, error);
    return false;
  }
  
  return true;
}

async function getMessageWithContact(messageId) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select(`
      id,
      content,
      contact_id,
      is_viewed,
      created_at,
      contacts (
        id,
        name,
        contact_info
      )
    `)
    .eq('id', messageId)
    .single();
  
  if (error) {
    console.error(`Error fetching message ${messageId}:`, error);
    return null;
  }
  
  return data;
}

// Contact operations
async function createContact(contactData) {
  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert(contactData)
    .select();
  
  if (error) {
    console.error(`Error creating contact ${contactData.name}:`, error);
    return null;
  }
  
  return data[0];
}

async function deleteContact(contactId) {
  const { error } = await supabaseAdmin
    .from('contacts')
    .delete()
    .eq('id', contactId);
  
  if (error) {
    console.error(`Error deleting contact ${contactId}:`, error);
    return false;
  }
  
  return true;
}

// Message creation
async function createMessage(messageData) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert(messageData)
    .select();
  
  if (error) {
    console.error('Error creating message:', error);
    return null;
  }
  
  return data[0];
}

// Export the clients and helper functions
module.exports = {
  supabaseAdmin,
  supabaseClient,
  getAgents,
  createAgent,
  deleteAgent,
  getUnviewedMessages,
  markMessageAsViewed,
  getMessageWithContact,
  createContact,
  deleteContact,
  createMessage
}; 