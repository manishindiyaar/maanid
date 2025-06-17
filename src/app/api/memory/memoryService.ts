/**
 * Memory service for storing and retrieving message memory
 * This provides utilities for persisting and retrieving conversational memory
 */

import { supabase } from './../../../lib/supabase/client';
import { getServerSupabaseClient } from './../../../lib/supabase/server';
import generateGeminiEmbedding from './../../../lib/ai/utils/gemini-embeddings';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// Define memory types
export enum MemoryType {
  PERSONAL_INFO = 'personal_info',
  PREFERENCE = 'preference',
  CONTEXT = 'context',
  FACT = 'fact'
}

// Define memory interfaces
export interface Memory {
  id?: string;
  user_id: string;
  message_id?: string;
  vector?: number[];
  content: string;
  memory_data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  similarity?: number;
}

export interface MemoryQueryResult {
  memories: Memory[];
  user_name?: string;
  contact_info?: string;
}

/**
 * Process a message for memory storage
 * This extracts relevant information from a message and stores it in the memory system
 * 
 * @param message - Message content to process
 * @param userId - User ID associated with the message
 * @param messageId - Optional message ID for reference
 * @param requestHeaders - Optional request headers for retrieving the correct Supabase client
 * @returns Promise with stored memory IDs (if any)
 */
export async function processMessageMemory(
  message: string,
  userId: string,
  messageId?: string,
  requestHeaders?: Headers
): Promise<{stored: boolean, memoryCount: number}> {
  try {
    // Extract structured memory data from the message
    const memories = await extractMemories(message, userId);
    
    // If message ID is provided, associate it with the memories
    if (messageId) {
      memories.forEach(mem => {
        mem.message_id = messageId;
      });
    }
    
    // Store the memories
    const memoryIds = await storeMemories(memories, requestHeaders);
    
    return {
      stored: memoryIds.length > 0,
      memoryCount: memoryIds.length
    };
  } catch (error) {
    console.error('Error processing memory:', error);
    return {
      stored: false,
      memoryCount: 0
    };
  }
}

// Kept for backward compatibility
export async function processMemory(
  message: string,
  userId: string,
  messageId?: string,
  requestHeaders?: Headers
): Promise<string[]> {
  try {
    const memories = await extractMemories(message, userId);
    if (messageId) {
      memories.forEach(mem => {
        mem.message_id = messageId;
      });
    }
    return await storeMemories(memories, requestHeaders);
  } catch (error) {
    console.error('Error processing memory:', error);
    return [];
  }
}

/**
 * Extract structured memory data from a message
 * @param message Message content to analyze
 * @param userId User ID associated with the message
 * @returns Promise with extracted memories (if any)
 */
export async function extractMemories(message: string, userId: string): Promise<Memory[]> {
  try {
    // Use Claude to extract structured memory data
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: `You are a system that extracts important information from conversations for memory storage.
      Analyze the given message and extract any important information about the user that should be remembered for future conversations.
      
      Output a JSON array of objects with these fields:
      - content: a brief description of the memory (for search/retrieval)
      - memory_data: structured data related to the memory (key-value pairs)
      
      Only extract actual information. If no clear memories should be stored, return an empty array [].`,
      messages: [{ role: 'user', content: message }],
    });

    const content = response.content[0].text;
    
    // Extract the JSON array from the response
    let memories: Memory[] = [];
    try {
      // Find and parse JSON from the response
      const jsonMatch = content.match(/\[([\s\S]*)\]/);
      if (jsonMatch) {
        memories = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing memory extraction:', error);
      return [];
    }

    // Filter out invalid memories and add user_id
    const validMemories = memories.filter(mem => 
      mem.content && 
      mem.memory_data
    ).map(mem => ({
      ...mem,
      user_id: userId
    }));

    return validMemories;
  } catch (error) {
    console.error('Error extracting memories:', error);
    return [];
  }
}

/**
 * Store memories in the database
 * @param memories Array of memories to store
 * @param requestHeaders Optional request headers for retrieving the correct Supabase client
 * @returns Promise with stored memory IDs
 */
export async function storeMemories(memories: Memory[], requestHeaders?: Headers): Promise<string[]> {
  if (!memories.length) return [];
  
  const memoryIds: string[] = [];
  
  const dbClient = await getSupabaseClientForMemory(requestHeaders);
  
  console.log(`Storing ${memories.length} memories`);
  
  // Process and store each memory
  for (const memory of memories) {
    try {
      // Generate embedding for content using Gemini embeddings
      const vector = await generateGeminiEmbedding(memory.content);
      
      // Insert memory into database with simplified structure
      const { data, error } = await dbClient
        .from('memory')
        .insert({
          user_id: memory.user_id,
          message_id: memory.message_id,
          vector: vector,
          content: memory.content,
          memory_data: memory.memory_data
        })
        .select('id');
      
      if (error) {
        console.error('Error storing memory:', error);
        continue;
      }
      
      if (data && data[0]) {
        memoryIds.push(data[0].id);
      }
    } catch (error) {
      console.error('Error processing memory for storage:', error);
    }
  }
  
  return memoryIds;
}

/**
 * Check if a query is asking about location information
 */
function isLocationQuery(query: string): boolean {
  const locationKeywords = ['where', 'location', 'city', 'live', 'from', 'country', 'address', 'place'];
  const lowerQuery = query.toLowerCase();
  
  return locationKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Check if a query is asking about preferences or personal information
 */
function isPreferenceOrPersonalQuery(query: string): boolean {
  const preferenceKeywords = ['preference', 'like', 'enjoy', 'favorite', 'prefer', 'want', 'wish', 'choice', 'me', 'about me', 'my', 'myself', 'i am', 'personal'];
  const lowerQuery = query.toLowerCase();
  
  return preferenceKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Retrieve relevant memories for a user and query
 * @param userId User ID to retrieve memories for
 * @param query Query text to match against memories
 * @param limit Maximum number of memories to retrieve
 * @param requestHeaders Optional request headers for retrieving the correct Supabase client
 * @returns Promise with matching memories
 */
export async function retrieveMemories(
  userId: string,
  query: string,
  limit: number = 5,
  requestHeaders?: Headers
): Promise<MemoryQueryResult> {
  try {
    const dbClient = await getSupabaseClientForMemory(requestHeaders);
    
    // Generate embedding for query using Gemini embeddings
    const vector = await generateGeminiEmbedding(query);
    
    console.log(`Looking for memories for query: "${query}" for user: ${userId}`);
    
    // Query database for similar memories with vector search
    let { data, error } = await dbClient
      .rpc('match_memory', {
        query_embedding: vector,
        match_threshold: 0.3, // Threshold for good matches
        match_count: limit
      });
    
    if (error) {
      console.error('Error retrieving memories:', error);
      // Log the specific error for diagnosis
      if (error.message && error.message.includes('match_memories')) {
        console.warn('Function name mismatch detected. Using match_memory instead of match_memories.');
      }
      // Continue with fallback search
      data = [];
    }
    
    console.log(`Found ${data?.length || 0} memories through vector matching`);
    
    // If no results from vector matching and query contains keywords about preferences or personal info
    if ((!data || data.length === 0) && isPreferenceOrPersonalQuery(query)) {
      console.log('Preference or personal info query detected, performing fallback search');
      
      // Perform a fallback text-based search for preference/personal information
      const { data: fallbackData, error: fallbackError } = await dbClient
        .from('memory')
        .select('*')
        .eq('user_id', userId)
        .limit(limit);
      
      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        console.log(`Found ${fallbackData.length} memories through fallback preference search`);
        data = fallbackData;
      }
    }
    // If still no results and query contains location keywords
    else if ((!data || data.length === 0) && isLocationQuery(query)) {
      console.log('Location query detected, performing fallback search');
      
      // Perform a fallback text-based search for location information
      const { data: fallbackData, error: fallbackError } = await dbClient
        .from('memory')
        .select('*')
        .eq('user_id', userId)
        .textSearch('content', 'location OR city OR live OR from OR country OR address', {
          config: 'english'
        })
        .limit(limit);
      
      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        console.log(`Found ${fallbackData.length} memories through fallback location search`);
        data = fallbackData;
      }
    }
    
    // Format results
    const memories = (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      message_id: item.message_id,
      content: item.content,
      memory_data: item.memory_data,
      created_at: item.created_at,
      updated_at: item.updated_at,
      similarity: item.similarity
    }));
    
    // Get user details if available
    let userName, contactInfo;
    if (userId && memories.length > 0) {
      const { data: userData, error: userError } = await dbClient
        .from('contacts')
        .select('name, contact_info')
        .eq('id', userId)
        .single();
      
      if (!userError && userData) {
        userName = userData.name;
        contactInfo = userData.contact_info;
      }
    }
    
    return {
      memories,
      user_name: userName,
      contact_info: contactInfo
    };
  } catch (error) {
    console.error('Error in memory retrieval:', error);
    return { memories: [] };
  }
}

/**
 * Format memory data as a text context for LLM prompting
 * @param result Memory query result
 * @returns Formatted text context
 */
export function formatMemoryContext(result: MemoryQueryResult): string {
  if (!result.memories || result.memories.length === 0) {
    return '';
  }
  
  let context = 'User information based on previous conversations:\n\n';
  
  // Format memories as a simple list
  result.memories.forEach((memory, index) => {
    context += `${index + 1}. ${memory.content}\n`;
    
    // Add structured data if available and not empty
    const dataStr = JSON.stringify(memory.memory_data);
    if (dataStr && dataStr !== '{}') {
      context += `   Details: ${dataStr}\n`;
    }
    
    context += '\n';
  });
  
  return context;
}

/**
 * Format memory type for display
 * @param type Memory type
 * @returns Formatted type string
 */
function formatMemoryType(type: string): string {
  switch (type) {
    case MemoryType.PERSONAL_INFO:
      return 'Personal Information';
    case MemoryType.PREFERENCE:
      return 'Preferences';
    case MemoryType.CONTEXT:
      return 'Conversation Context';
    case MemoryType.FACT:
      return 'Facts';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  }
}

/**
 * Get user name from memory data or directly from contacts table
 * @param userId User ID to get name for
 * @param requestHeaders Optional request headers for retrieving the correct Supabase client
 * @returns Promise with user name or null if not found
 */
export async function getUserNameFromMemory(userId: string, requestHeaders?: Headers): Promise<string | null> {
  try {
    const dbClient = await getSupabaseClientForMemory(requestHeaders);
    
    // First check if there are any memories containing the user's name
    const { data: nameMemories, error: nameError } = await dbClient
      .from('memory')
      .select('memory_data, content')
      .eq('user_id', userId)
      .textSearch('content', 'name', {
        config: 'english'
      })
      .limit(5);
    
    if (!nameError && nameMemories && nameMemories.length > 0) {
      // Try to extract name from memory data
      for (const memory of nameMemories) {
        // Check if memory_data has a name field
        if (memory.memory_data && 
            (memory.memory_data.name || 
             memory.memory_data.user_name || 
             memory.memory_data.first_name ||
             memory.memory_data.fullName)) {
          return memory.memory_data.name || 
                 memory.memory_data.user_name || 
                 memory.memory_data.first_name ||
                 memory.memory_data.fullName;
        }
        
        // Try to extract name from content if it contains phrases like "My name is"
        const nameMatch = memory.content.match(/(?:my name is|i am|i'm|call me) (\w+)/i);
        if (nameMatch && nameMatch[1]) {
          return nameMatch[1];
        }
      }
    }
    
    // If no name found in memories, get it from contacts table
    const { data: userData, error: userError } = await dbClient
      .from('contacts')
      .select('name')
      .eq('id', userId)
      .single();
    
    if (!userError && userData && userData.name) {
      return userData.name.split(' ')[0]; // Get first name
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user name from memory:', error);
    return null;
  }
}

/**
 * Delete memories associated with specific messages
 * @param messageIds Array of message IDs to delete memories for
 * @param requestHeaders Optional request headers for retrieving the correct Supabase client
 * @returns Promise with success status
 */
export async function deleteMemoriesByMessageIds(messageIds: string[], requestHeaders?: Headers): Promise<boolean> {
  try {
    if (!messageIds.length) return true;
    
    console.log(`Deleting memories for ${messageIds.length} messages...`);
    
    const dbClient = await getSupabaseClientForMemory(requestHeaders);
    
    const { error } = await dbClient
      .from('memory')
      .delete()
      .in('message_id', messageIds);
    
    if (error) {
      console.error('Error deleting memories:', error);
      return false;
    }
    
    console.log(`Successfully deleted memories for messages`);
    return true;
  } catch (error) {
    console.error('Error in deleteMemoriesByMessageIds:', error);
    return false;
  }
}

async function getSupabaseClientForMemory(requestHeaders?: Headers) {
  let dbClient = supabase;
  const isUserMode = requestHeaders?.get('x-bladex-user-mode') === 'true';
  const userEmail = requestHeaders?.get('x-user-email');
  
  console.log(`Memory service operation in ${isUserMode ? 'User Mode' : 'Admin Mode'}`);
  
  if (requestHeaders) {
    try {
      console.log(`Getting server-specific Supabase client for user: ${userEmail || 'Unknown'}`);
      dbClient = await getServerSupabaseClient(requestHeaders);
      console.log(`Successfully got server Supabase client`);
    } catch (clientError) {
      console.error('Error getting server-specific Supabase client:', clientError);
      console.log('Falling back to default Supabase client');
    }
  }
  
  return dbClient;
} 