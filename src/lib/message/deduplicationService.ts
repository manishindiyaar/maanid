/**
 * Message Deduplication Service
 * 
 * A centralized service to prevent duplicate message sending across different API routes.
 * Uses a singleton Map in memory to track messages that have been sent recently.
 */

// Global singleton map to track recently sent messages across all API routes
const recentlySentMessages = new Map<string, number>();

// Set a longer deduplication window to prevent duplicates
const DEDUPLICATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create a stable deduplication key for a message
 * @param contactId The contact ID
 * @param message The message content 
 * @param additionalContext Optional context like messageId or batchId
 * @returns A string key for deduplication
 */
function createDedupeKey(contactId: string, message: string, additionalContext?: string): string {
  // Normalize message by trimming whitespace and truncating
  const normalizedMessage = message.trim().substring(0, 50);
  
  // Add context for more reliable deduplication
  const contextPart = additionalContext ? `:${additionalContext}` : '';
  
  return `${contactId}:${normalizedMessage}${contextPart}`;
}

/**
 * Check if a message has been recently sent and should be considered a duplicate
 * @param contactId The contact ID
 * @param message The message content
 * @param additionalContext Optional context like messageId
 * @returns True if this is a duplicate message that should be skipped
 */
export function isDuplicateMessage(contactId: string, message: string, additionalContext?: string): boolean {
  if (!contactId || !message) {
    console.log(`⚠️ [DEDUPE] Missing required parameters: contactId=${!!contactId}, message=${!!message}`);
    return false; // Can't deduplicate without required parameters
  }
  
  const dedupeKey = createDedupeKey(contactId, message, additionalContext);
  
  // If key exists and is within the deduplication window
  if (recentlySentMessages.has(dedupeKey)) {
    const lastSent = recentlySentMessages.get(dedupeKey)!;
    const now = Date.now();
    
    if (now - lastSent < DEDUPLICATION_WINDOW_MS) {
      console.log(`🔄 [DEDUPE] Duplicate message detected: ${dedupeKey}`);
      return true; // This is a duplicate
    } else {
      console.log(`⏰ [DEDUPE] Message found but outside window: ${dedupeKey}`);
    }
  }
  
  return false; // Not a duplicate
}

/**
 * Mark a message as sent to prevent duplicates
 * @param contactId The contact ID
 * @param message The message content
 * @param additionalContext Optional context like messageId
 */
export function markMessageAsSent(contactId: string, message: string, additionalContext?: string): void {
  if (!contactId || !message) {
    console.log(`⚠️ [DEDUPE] Cannot mark message: missing parameters`);
    return;
  }
  
  const dedupeKey = createDedupeKey(contactId, message, additionalContext);
  const now = Date.now();
  
  // Add to recently sent messages map
  recentlySentMessages.set(dedupeKey, now);
  console.log(`✅ [DEDUPE] Message marked as sent: ${dedupeKey}`);
  
  // Clean up old entries
  cleanupExpiredEntries();
}

/**
 * Clean up expired entries from the deduplication cache
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  // Find expired entries
  recentlySentMessages.forEach((timestamp, key) => {
    if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
      keysToDelete.push(key);
    }
  });
  
  // Delete expired entries
  if (keysToDelete.length > 0) {
    keysToDelete.forEach(key => recentlySentMessages.delete(key));
    console.log(`🧹 [DEDUPE] Cleaned up ${keysToDelete.length} expired entries`);
  }
}

/**
 * Get the current size of the deduplication cache (for debugging)
 */
export function getDedupeCacheSize(): number {
  cleanupExpiredEntries(); // Clean up first to get accurate size
  return recentlySentMessages.size;
}

/**
 * Reset the deduplication cache (for testing or emergencies)
 */
export function resetDedupeCache(): void {
  recentlySentMessages.clear();
  console.log(`🗑️ [DEDUPE] Cache cleared completely`);
} 