export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          organization_id: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          organization_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          organization_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          contact_info: string;
          last_contact: string;
          created_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          contact_info: string;
          last_contact?: string;
          created_at?: string;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          contact_info?: string;
          last_contact?: string;
          created_at?: string;
          organization_id?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          contact_id: string;
          content: string;
          timestamp: string;
          direction: 'incoming' | 'outgoing';
          is_ai_response: boolean;
          is_from_customer: boolean;
          is_sent: boolean;
          created_at: string;
          is_viewed: boolean;
        };
        Insert: {
          id?: string;
          contact_id: string;
          content: string;
          timestamp?: string;
          direction: 'incoming' | 'outgoing';
          is_ai_response?: boolean;
          is_from_customer: boolean;
          is_sent?: boolean;
          created_at?: string;
          is_viewed?: boolean;
        };
        Update: {
          id?: string;
          contact_id?: string;
          content?: string;
          timestamp?: string;
          direction?: 'incoming' | 'outgoing';
          is_ai_response?: boolean;
          is_from_customer?: boolean;
          is_sent?: boolean;
          created_at?: string;
          is_viewed?: boolean;
        };
      };
      bots: {
        Row: {
          id: string;
          name: string;
          platform: 'telegram' | 'whatsapp';
          token: string;
          username?: string;
          telegram_id?: string;
          webhook_url?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          platform: 'telegram' | 'whatsapp';
          token: string;
          username?: string;
          telegram_id?: string;
          webhook_url?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          platform?: 'telegram' | 'whatsapp';
          token?: string;
          username?: string;
          telegram_id?: string;
          webhook_url?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          organization_id?: string | null;
        };
      };
      agents: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          organization_id?: string | null;
        };
      };
      agent_documents: {
        Row: {
          id: string;
          agent_id: string;
          filename: string;
          tag: string;
          content: string;
          vector: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          filename: string;
          tag: string;
          content: string;
          vector: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          filename?: string;
          tag?: string;
          content?: string;
          vector?: number[];
          created_at?: string;
        };
      };
    };
    functions: {
      get_customers_by_message_keyword: {
        Args: { keyword: string };
        Returns: { id: string; name: string; contact_info: string }[];
      };
      get_customers_by_message_keyword_and_date_range: {
        Args: { keyword: string; start_date: string; end_date: string };
        Returns: { id: string; name: string; contact_info: string }[];
      };
    };
  }
} 