// Types for main components
export interface Customer {
  id: string;
  name: string;
  contact_info: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  messages?: Array<{
    id: string;
    content: string;
    timestamp: string;
    is_viewed?: boolean;
    is_from_customer: boolean;
  }>;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  created_at?: string; // ISO timestamp string
  rawTimestamp?: string; // Raw timestamp for sorting
  date?: string; // For grouping by date
  isAI?: boolean;
  isSent: boolean;
  direction?: string;
  is_from_customer?: boolean;
  is_viewed?: boolean;
}

export interface ActionData {
  action: string;
  message: string;
  recipients: {
    id: string;
    name: string;
    contact_info: string;
  }[];
  summaryData?: {
    contact: {
      id: string;
      name: string;
      contact_info: string;
    };
    memories: Array<{
      id: string;
      content: string;
      memory_data: any;
      created_at: string;
    }>;
  };
}

export interface CustomerListProps {
  customers: Customer[];
  onSelectCustomer: (id: string | null) => void;
  selectedCustomerId: string | null;
  loading: boolean;
}

// Define QueryResult type to match QueryResults component
export interface QueryResult {
  type: 'query_result' | 'summary_result' | 'action_result';
  contact?: {
    id: string;
    name: string;
    contact_info: string;
  };
  memories?: Array<{
    id: string;
    content: string;
    memory_data: any;
    created_at: string;
    user_id: string;
  }>;
  actionMessage?: string;
  actionType?: string;
} 