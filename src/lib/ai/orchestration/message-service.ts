/**
 * Message Service for handling incoming messages and responses
 */

import { Message, ProcessResult } from '../models/types';
import { 
  getMessageById,
  saveMessage, 
  updateMessageStatus
} from '../utils/supabase-bridge';
import { Orchestrator } from './orchestrator';

let orchestratorInstance: Orchestrator | null = null;

/**
 * Initialize the message service by creating the orchestrator
 * @returns Promise that resolves when initialization is complete
 */
export async function initMessageService(): Promise<void> {
  console.log('Initializing message service...');
  
  try {
    // Create orchestrator with default settings
    orchestratorInstance = new Orchestrator({
      max_agent_iterations: 5,
      save_responses: true,
      update_contact_timestamp: true
    });
    
    // Initialize the orchestrator (loads agents from database)
    await orchestratorInstance.initialize();
    
    console.log('Message service initialized');
  } catch (error) {
    console.error('Failed to initialize message service:', error);
    throw error;
  }
}

/**
 * Get the singleton orchestrator instance
 * @returns The orchestrator instance
 */
export function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    throw new Error('Message service not initialized. Call initMessageService() first.');
  }
  
  return orchestratorInstance;
}

/**
 * Process an incoming message
 * @param message The message to process
 * @returns Processing result
 */
export async function processIncomingMessage(message: Message): Promise<ProcessResult> {
  console.log(`Processing incoming message: ${message.id}`);
  
  try {
    // Ensure message service is initialized
    if (!orchestratorInstance) {
      await initMessageService();
    }
    
    // Process the message through the orchestrator
    return await getOrchestrator().processMessage(message);
  } catch (error) {
    console.error('Error processing incoming message:', error);
    
    // Update message status to failed
    try {
      await updateMessageStatus(message.id, 'failed');
    } catch (updateError) {
      console.error('Error updating message status:', updateError);
    }
    
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null,
      next_action: undefined,
      agent_id: '',
      confidence: 0
    };
  }
}

/**
 * Create and save a new incoming message
 * @param contactId The contact ID
 * @param content The message content
 * @param metadata Optional metadata
 * @returns The created message
 */
export async function createIncomingMessage(
  contactId: string, 
  content: string,
  metadata?: any
): Promise<Message> {
  console.log(`Creating incoming message for contact: ${contactId}`);
  
  // Create message object
  const message = {
    contact_id: contactId,
    content,
    direction: 'incoming' as const,
    is_ai_response: false,
    is_from_customer: true,
    is_sent: true,
    is_viewed: true,
    status: 'pending' as const,
    timestamp: new Date().toISOString(),
    metadata
  };
  
  // Save message to database
  const savedMessage = await saveMessage(message);
  
  // Process the message asynchronously but with better error handling
  // and using an IIFE to properly scope async/await
  (async () => {
    try {
      // Import the function from messageStatusUtils to avoid circular dependencies
      // This is a dynamic import to avoid requiring the module at the top level
      const { isMessageBeingProcessed, processedMessages } = await import('../../../app/api/orchestration/messageStatusUtils');
      
      // Skip processing if message is already being processed or has been processed
      if (isMessageBeingProcessed(savedMessage.id) || processedMessages.has(savedMessage.id)) {
        console.log(`Message ${savedMessage.id} is already being processed or has been processed, skipping`);
        return;
      }
      
      await processIncomingMessage(savedMessage);
    } catch (error) {
      console.error('Async message processing error:', error);
    }
  })();
  
  return savedMessage;
}

/**
 * Reset the message service
 * This is useful for testing or when needing to re-initialize
 */
export function resetMessageService(): void {
  orchestratorInstance = null;
}

/**
 * Process a specific message from the database
 * This is useful for re-processing messages that failed
 * @param messageId The ID of the message to process
 * @returns Processing result
 */
export async function reprocessMessage(messageId: string): Promise<ProcessResult> {
  // Ensure message service is initialized
  if (!orchestratorInstance) {
    await initMessageService();
  }
  
  try {
    // Mark the message as pending
    await updateMessageStatus(messageId, 'pending');
    
    // Get the message from the database
    const message = await getMessageById(messageId);
    
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }
    
    // Process the message
    return await getOrchestrator().processMessage(message);
  } catch (error) {
    console.error(`Error reprocessing message ${messageId}:`, error);
    
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null,
      next_action: undefined,
      agent_id: '',
      confidence: 0
    };
  }
} 


