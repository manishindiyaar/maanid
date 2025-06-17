/**
 * Bridge between the AI system and the existing Supabase client
 * This file adapts the existing Supabase client to work with our AI system
 */

import { supabase, createServerSupabaseClient } from '../../supabase/client';
import { Agent, Message, Contact, MessageStatus } from '../models/types';

// Get all active agents
export async function getActiveAgents(): Promise<Agent[]> {
  try {
    console.log('Fetching active agents from existing Supabase client');
    
    // Use the server-side client with service role for admin operations
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('agents')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: false });
      
    if (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
    
    // Convert the data to match our Agent type
    const agents: Agent[] = data.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      type: agent.type || 'llm', // Default to LLM type
      model: agent.model || 'claude-3-opus-20240229', // Default to Claude
      priority: agent.priority || 'high', // Default to high priority
      enabled: agent.enabled !== false, // Default to true
      config: agent.config || {
        always_respond: true,
        system_prompt: 'You are a helpful assistant.'
      },
      created_at: agent.created_at,
      updated_at: agent.updated_at || agent.created_at
    }));
    
    return agents;
  } catch (error) {
    console.error('Unexpected error in getActiveAgents:', error);
    return [];
  }
}

// Get an agent by ID
export async function getAgentById(agentId: string): Promise<Agent | null> {
  try {
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (error) {
      console.error(`Error fetching agent with ID ${agentId}:`, error);
      return null;
    }
    
    // Convert to our Agent type
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      type: data.type || 'llm', // Default to LLM type
      model: data.model || 'claude-3-opus-20240229', // Default to Claude
      priority: data.priority || 'high', // Default to high priority
      enabled: data.enabled !== false, // Default to true
      config: data.config || {
        always_respond: true,
        system_prompt: 'You are a helpful assistant.'
      },
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at
    };
  } catch (error) {
    console.error(`Error in getAgentById:`, error);
    return null;
  }
}

// Get a contact by ID
export async function getContactById(contactId: string): Promise<Contact | null> {
  try {
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
      
    if (error) {
      console.error(`Error fetching contact with ID ${contactId}:`, error);
      return null;
    }
    
    // Convert to our Contact type
    return {
      id: data.id,
      name: data.name,
      contact_info: data.contact_info,
      last_contact: data.last_contact,
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
      organization_id: data.organization_id,
      metadata: {}
    };
  } catch (error) {
    console.error(`Error in getContactById:`, error);
    return null;
  }
}

// Get message history for a contact
export async function getMessageHistory(contactId: string, limit = 20): Promise<Message[]> {
  try {
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('timestamp', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error(`Error fetching message history for contact ${contactId}:`, error);
      throw error;
    }
    
    // Convert to our Message type
    const messages: Message[] = (data || []).map(msg => ({
      id: msg.id,
      contact_id: msg.contact_id,
      content: msg.content,
      timestamp: msg.timestamp,
      direction: msg.direction,
      is_ai_response: msg.is_ai_response,
      is_from_customer: msg.is_from_customer,
      is_sent: msg.is_sent,
      is_viewed: msg.is_viewed || false,
      status: 'sent' as MessageStatus,
      metadata: {},
      agent_id: msg.agent_id
    }));
    
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error(`Error in getMessageHistory:`, error);
    return [];
  }
}

// Save a new message
export async function saveMessage(message: Omit<Message, 'id'>): Promise<Message> {
  try {
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('messages')
      .insert([{
        contact_id: message.contact_id,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        direction: message.direction,
        is_ai_response: message.is_ai_response,
        is_from_customer: message.is_from_customer,
        is_sent: message.is_sent,
        agent_name: message.agent_name
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Error saving message:', error);
      throw error;
    }
    
    // Convert to our Message type
    return {
      id: data.id,
      contact_id: data.contact_id,
      content: data.content,
      timestamp: data.timestamp,
      direction: data.direction,
      is_ai_response: data.is_ai_response,
      is_from_customer: data.is_from_customer,
      is_sent: data.is_sent,
      is_viewed: data.is_viewed || false,
      status: 'sent' as MessageStatus,
      agent_name: data.agent_name
    };
  } catch (error) {
    console.error('Error in saveMessage:', error);
    throw error;
  }
}

/**
 * Update message status in the database
 * @param messageId Message ID
 * @param status New status
 * @returns Updated message or null if operation failed
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'read'
): Promise<Message | null> {
  try {
    console.log(`Updating message ${messageId} status to: ${status}`);
    
    const serverSupabase = createServerSupabaseClient();
    
    // Update message status
    const { data, error } = await serverSupabase
      .from('messages')
      .update({
        status,
        is_sent: status === 'sent' || status === 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating message status (${messageId}):`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error in updateMessageStatus (${messageId}):`, error);
    return null;
  }
}

// Update contact's last_contact timestamp
export async function updateContactLastContact(contactId: string): Promise<Contact> {
  try {
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('contacts')
      .update({ last_contact: new Date().toISOString() })
      .eq('id', contactId)
      .select()
      .single();
      
    if (error) {
      console.error(`Error updating last_contact for contact ${contactId}:`, error);
      throw error;
    }
    
    // Convert to our Contact type
    return {
      id: data.id,
      name: data.name,
      contact_info: data.contact_info,
      last_contact: data.last_contact,
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
      organization_id: data.organization_id,
      metadata: {}
    };
  } catch (error) {
    console.error('Error in updateContactLastContact:', error);
    throw error;
  }
}

// Get a message by its ID
export async function getMessageById(messageId: string): Promise<Message | null> {
  try {
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    
    // Convert to our Message type
    return {
      id: data.id,
      contact_id: data.contact_id,
      content: data.content,
      timestamp: data.timestamp,
      direction: data.direction,
      is_ai_response: data.is_ai_response,
      is_from_customer: data.is_from_customer,
      is_sent: data.is_sent,
      is_viewed: data.is_viewed || false,
      status: 'sent' as MessageStatus,
  
    };
  } catch (error) {
    console.error('Error in getMessageById:', error);
    return null;
  }
}

/**
 * Update a message's delivery status
 * @param messageId The message ID
 * @param isDelivered Whether the message was delivered
 * @returns The update result
 */
export async function updateMessageDeliveryStatus(
  messageId: string,
  isDelivered: boolean
): Promise<any> {
  try {
    const serverSupabase = createServerSupabaseClient();
    
    const { data, error } = await serverSupabase
      .from('messages')
      .update({
        is_sent: isDelivered,
        metadata: { 
          delivery_status: isDelivered ? 'delivered' : 'failed',
          delivery_timestamp: new Date().toISOString()
        }
      })
      .eq('id', messageId);
    
    return { data, error };
  } catch (error) {
    console.error('Error updating message delivery status:', error);
    return { data: null, error };
  }
} 