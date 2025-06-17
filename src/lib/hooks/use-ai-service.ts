/**
 * React hooks for interacting with the AI service
 */

import { useState } from 'react';
import { Message, ProcessResult } from '../ai/models/types';

export interface UseAiServiceOptions {
  pollInterval?: number;
  autoFetch?: boolean;
}

export interface SendMessageOptions {
  onSuccess?: (message: Message) => void;
  onError?: (error: Error) => void;
  metadata?: any;
}

/**
 * Hook for interacting with the AI service
 */
export function useAiService(options: UseAiServiceOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [lastResponse, setLastResponse] = useState<Message | null>(null);
  
  const { pollInterval = 2000, autoFetch = true } = options;
  
  /**
   * Send a message to the AI service
   * @param contactId The contact ID
   * @param content The message content
   * @param options Additional options
   * @returns The created message
   */
  const sendMessage = async (
    contactId: string, 
    content: string,
    options: SendMessageOptions = {}
  ): Promise<Message> => {
    setLoading(true);
    setError(null);
    
    try {
      // Send the message to the API
      const response = await fetch('/api/ai/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: contactId,
          content,
          metadata: options.metadata || {},
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      const data = await response.json();
      
      // If auto-fetch is enabled, start polling for the response
      if (autoFetch) {
        fetchResponse(data.message_id);
      }
      
      // Get the full message details
      const messageResponse = await fetch(`/api/ai/message?message_id=${data.message_id}`);
      
      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(errorData.error || 'Failed to fetch message details');
      }
      
      const messageData = await messageResponse.json();
      const message = messageData.message;
      
      setLastMessage(message);
      
      if (options.onSuccess) {
        options.onSuccess(message);
      }
      
      return message;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch the AI response for a message
   * @param messageId The message ID
   * @param retries Number of polling retries
   * @returns The AI response message, if available
   */
  const fetchResponse = async (
    messageId: string, 
    retries = 10
  ): Promise<Message | null> => {
    if (retries <= 0) {
      return null;
    }
    
    try {
      // Wait for the poll interval
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      // Check if there's a response
      const response = await fetch(`/api/ai/message?message_id=${messageId}`);
      
      if (!response.ok) {
        return await fetchResponse(messageId, retries - 1);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return await fetchResponse(messageId, retries - 1);
      }
      
      const message = data.message;
      
      // Check if there's a response message
      const responseMessages = await fetchResponseMessages(message.contact_id);
      
      // Find the AI response to this message, if any
      const aiResponse = responseMessages.find(msg => 
        msg.metadata?.original_message_id === message.id
      );
      
      if (aiResponse) {
        setLastResponse(aiResponse);
        return aiResponse;
      }
      
      // No response yet, continue polling
      return await fetchResponse(messageId, retries - 1);
    } catch (error) {
      console.error('Error fetching response:', error);
      return await fetchResponse(messageId, retries - 1);
    }
  };
  
  /**
   * Fetch all response messages for a contact
   * @param contactId The contact ID
   * @returns Array of messages
   */
  const fetchResponseMessages = async (contactId: string): Promise<Message[]> => {
    try {
      const response = await fetch(`/api/ai/messages?contact_id=${contactId}`);
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return [];
      }
      
      return data.messages;
    } catch (error) {
      console.error('Error fetching response messages:', error);
      return [];
    }
  };
  
  /**
   * Reprocess a message
   * @param messageId The message ID
   * @returns The processing result
   */
  const reprocessMessage = async (messageId: string): Promise<ProcessResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/message', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: messageId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reprocess message');
      }
      
      const data = await response.json();
      
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch AI agents
   * @param agentId Optional agent ID to fetch a specific agent
   * @returns The agent(s)
   */
  const fetchAgents = async (agentId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = agentId 
        ? `/api/ai/agents?agent_id=${agentId}`
        : '/api/ai/agents';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch agents');
      }
      
      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Create or update an agent
   * @param agent The agent data
   * @returns The created/updated agent
   */
  const saveAgent = async (agent: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agent),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save agent');
      }
      
      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Delete an agent
   * @param agentId The agent ID
   * @returns The deletion result
   */
  const deleteAgent = async (agentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai/agents?agent_id=${agentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete agent');
      }
      
      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    error,
    lastMessage,
    lastResponse,
    sendMessage,
    fetchResponse,
    reprocessMessage,
    fetchAgents,
    saveAgent,
    deleteAgent,
  };
} 