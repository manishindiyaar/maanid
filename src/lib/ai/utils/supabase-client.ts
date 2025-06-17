/**
 * Supabase client utilities for AI system data access
 */

import { createClient } from '@supabase/supabase-js';
import { Agent, Message, Contact, MessageStatus } from '../models/types';

// Initialize the Supabase client for server-side operations
const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for server operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Get all active agents
export async function getActiveAgents(): Promise<Agent[]> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('enabled', true)
    .order('priority', { ascending: false });
    
  if (error) {
    console.error('Error fetching active agents:', error);
    throw error;
  }
  
  return data || [];
}

// Get an agent by ID
export async function getAgentById(agentId: string): Promise<Agent | null> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();
    
  if (error) {
    console.error(`Error fetching agent with ID ${agentId}:`, error);
    return null;
  }
  
  return data;
}

// Get a contact by ID
export async function getContactById(contactId: string): Promise<Contact | null> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
    
  if (error) {
    console.error(`Error fetching contact with ID ${contactId}:`, error);
    return null;
  }
  
  return data;
}

// Get message history for a contact
export async function getMessageHistory(contactId: string, limit = 20): Promise<Message[]> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('timestamp', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error(`Error fetching message history for contact ${contactId}:`, error);
    throw error;
  }
  
  return (data || []).reverse(); // Return in chronological order
}

// Save a new message
export async function saveMessage(message: Omit<Message, 'id'>): Promise<Message> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('messages')
    .insert([message])
    .select()
    .single();
    
  if (error) {
    console.error('Error saving message:', error);
    throw error;
  }
  
  return data;
}

// Update message status
export async function updateMessageStatus(messageId: string, status: MessageStatus): Promise<Message> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('messages')
    .update({ status })
    .eq('id', messageId)
    .select()
    .single();
    
  if (error) {
    console.error(`Error updating message status for message ${messageId}:`, error);
    throw error;
  }
  
  return data;
}

// Update contact's last_contact timestamp
export async function updateContactLastContact(contactId: string): Promise<Contact> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('contacts')
    .update({ last_contact: new Date().toISOString() })
    .eq('id', contactId)
    .select()
    .single();
    
  if (error) {
    console.error(`Error updating last_contact for contact ${contactId}:`, error);
    throw error;
  }
  
  return data;
}

// Get a message by its ID
export async function getMessageById(messageId: string): Promise<Message | null> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  
  return data as Message;
} 