/**
 * Type definitions for the AI orchestration system
 */

// Agent types
export type AgentType = 'llm' | 'rules' | 'router' | 'classifier' | 'qa' | 'custom';

// Agent priority level
export type PriorityLevel = 'high' | 'medium' | 'low';

// Agent definition
export interface Agent {
  id: string;
  name: string;
  description?: string;
  type: AgentType;
  model?: string;
  priority: PriorityLevel;
  enabled: boolean;
  config?: any;
  created_at?: string;
  updated_at?: string;
}

// Message direction
export type MessageDirection = 'incoming' | 'outgoing';

// Message status
export type MessageStatus = 'pending' | 'processed' | 'sent' | 'delivered' | 'failed';

// Message interface
export interface Message {
  id: string;
  content: string;
  contact_id: string;
  contact_name?: string;
  contact_info?: string;
  timestamp: string;
  direction?: 'incoming' | 'outgoing';
  is_ai_response?: boolean;
  is_from_customer?: boolean;
  is_sent?: boolean;
  is_viewed?: boolean;
  status?: string;
  agent_name?: string;
  agent_description?: string;
  response?: string;
  error_details?: string;
  sent_timestamp?: string;
  original_message_id?: string;
  confidence?: number;
  processing_details?: string;
  metadata?: any;
}

// Contact interface
export interface Contact {
  id: string;
  name: string;
  contact_info: string;
  last_contact?: string;
  created_at: string;
  updated_at: string;
  organization_id?: string;
  metadata?: any;
}

// Process result from agent
export interface ProcessResult {
  success: boolean;
  message: string;
  data: any;
  next_action: string | null | undefined;
  agent_id: string;
  confidence: number;
}

// Orchestration context
export interface OrchestrationContext {
  message: Message;
  contact: Contact;
  history?: Message[];
  metadata?: any;
  agents?: Agent[];
  memory?: {
    context: string;
    memories: Memory[];
  };
}

// Memory interface
export interface Memory {
  id?: string;
  user_id: string;
  message_id?: string;
  vector?: number[];
  content: string;
  memory_type: string;
  memory_data: Record<string, any>;
  importance: number;
  created_at?: string;
  updated_at?: string;
}

// Agent execution result
export interface AgentResult {
  success: boolean;
  response: string;
  confidence: number;
  metadata?: any;
  next_agent_id: string | null | undefined;
} 