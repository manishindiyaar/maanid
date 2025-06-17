/**
 * Helper function to get a completion message based on query result type
 * 
 * @param type - The type of query result
 * @param resultCount - The number of results found
 * @returns A formatted message string
 */
export function getCompletionMessage(type: string, resultCount: number): string {
  switch (type) {
    case 'action_result':
      return `Message ready for ${resultCount || 'all'} recipient${resultCount === 1 ? '' : 's'}`;
    case 'summary_result':
      return 'Customer profile generated successfully';
    case 'query_result':
      return resultCount > 0 ? `Found ${resultCount} result${resultCount === 1 ? '' : 's'}` : 'Results processed';
    default:
      return 'Processing complete';
  }
}

/**
 * Helper function to get current phase message during processing
 * 
 * @param phase - The current processing phase
 * @param stepName - The name of the current step
 * @returns A formatted message string
 */
export function getCurrentPhaseMessage(phase: string, stepName: string): string {
  switch (phase) {
    case 'search':
      return 'Searching...';
    case 'process':
      return 'Processing data...';
    case 'action':
      return 'Preparing action...';
    case 'summary':
      return 'Building profile...';
    default:
      return stepName;
  }
}

/**
 * Interface for a processing step
 */
export interface ProcessingStep {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
  phase?: 'search' | 'process' | 'action' | 'summary';
}

/**
 * Interface for contact objects
 */
export interface Contact {
  id: string;
  name: string;
  contact_info: string;
}

/**
 * Interface for memory objects
 */
export interface Memory {
  id: string;
  content: string;
  memory_data: any;
  created_at: string;
  user_id: string;
  name?: string;
  contact_info?: string;
}

/**
 * Interface for query result objects
 */
export interface QueryResult {
  type: string;
  contact?: Contact;
  memories?: Memory[];
  actionMessage?: string;
  actionType?: string;
  recipients?: Array<{
    id: string;
    name: string;
    contact_info: string;
  }>;
  message?: string;
  action?: string;
  error?: string;
} 