/**
 * Shared utilities for message status management across orchestration endpoints
 */

// Message status interface
export interface MessageStatus {
  id: string;
  status: string;
  processingStage: {
    stage: string;
    details: string;
  };
  agentName?: string;
  agentDescription?: string;
  response?: string;
  processingDetails?: any;
  isCompleted?: boolean;
}

// Message status cache to track processing status
export const messageStatusCache = new Map<string, MessageStatus>();

// Keep track of messages that are currently being processed
export const processingMessages = new Set<string>();

// Keep track of messages that have been processed (persistent across requests)
export const processedMessages = new Set<string>();

/**
 * Update message status in cache
 * @param messageId The message ID
 * @param status The new status
 * @param details Additional details
 * @returns The updated status object
 */
export function updateMessageStatus(
  messageId: string, 
  status: 'analyzing' | 'delegating' | 'replying' | 'completed' | 'error',
  details: {
    stage?: 'analyzing' | 'delegating' | 'replying' | 'completed',
    details?: string,
    agentName?: string,
    agentDescription?: string,
    response?: string,
    processingDetails?: any
  }
): MessageStatus {
  console.log(`Updating status for message ${messageId} to ${status}:`, details);
  
  const currentStatus = messageStatusCache.get(messageId) || {
    id: messageId,
    status: 'new',
    processingStage: {
      stage: 'analyzing',
      details: 'Waiting to process message...'
    }
  };
  
  const updatedStatus = {
    ...currentStatus,
    status,
    processingStage: {
      stage: details.stage || status,
      details: details.details || `Message is being ${status}...`
    },
    agentName: details.agentName || currentStatus.agentName,
    agentDescription: details.agentDescription || currentStatus.agentDescription,
    response: details.response || currentStatus.response,
    processingDetails: details.processingDetails || currentStatus.processingDetails
  };
  
  messageStatusCache.set(messageId, updatedStatus);
  console.log(`Updated message status for ${messageId}: ${status}`);
  
  // Don't set a cleanup timeout here - we'll handle cleanup in markMessageAsProcessed
  // This avoids race conditions where status is deleted before client can read it
  
  return updatedStatus;
}

/**
 * Check if a message is being processed
 * @param messageId The message ID
 * @returns True if the message is being processed
 */
export function isMessageBeingProcessed(messageId: string): boolean {
  return processingMessages.has(messageId);
}

/**
 * Add a message to the processing state
 * @param messageId The message ID
 */
export function addMessageToProcessing(messageId: string): void {
  processingMessages.add(messageId);
  console.log(`Added message ${messageId} to processing`);
}

/**
 * Mark a message as processed
 * @param messageId The message ID
 */
export function markMessageAsProcessed(messageId: string): void {
  console.log(`Marking message ${messageId} as processed`);
  
  // Only remove from processing set if it's actually there
  if (processingMessages.has(messageId)) {
    // Keep the message in the processing set for a short time (5 seconds) before removing
    // This helps clients that are polling to get the final status
    setTimeout(() => {
      if (processingMessages.has(messageId)) {
        processingMessages.delete(messageId);
        console.log(`Removed message ${messageId} from processing set after completion delay`);
      }
    }, 5000);
  } else {
    console.log(`Message ${messageId} was not in processing set when marked as processed`);
  }
  
  // Mark as processed immediately in the processed set
  processedMessages.add(messageId);
  console.log(`Marked message ${messageId} as processed`);
  
  // Update the message status cache with a note that processing is complete
  // but don't remove it from the cache yet
  const currentStatus = messageStatusCache.get(messageId);
  if (currentStatus) {
    messageStatusCache.set(messageId, {
      ...currentStatus,
      isCompleted: true,
      status: 'completed',
      processingStage: {
        ...currentStatus.processingStage,
        stage: 'completed',
        details: currentStatus.processingStage?.details || 'Processing completed'
      }
    });
  } else {
    // Create a basic completed status if none exists
    messageStatusCache.set(messageId, {
      id: messageId,
      status: 'completed',
      isCompleted: true,
      processingStage: {
        stage: 'completed',
        details: 'Processing completed'
      }
    });
  }
  
  // Set a longer timeout for status cache cleanup (15 minutes instead of 5)
  setTimeout(() => {
    messageStatusCache.delete(messageId);
    console.log(`Removed message ${messageId} from status cache`);
  }, 15 * 60 * 1000);
} 