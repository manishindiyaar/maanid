// @/app/dashboard/SupaSetup.tsx
"use client"
import { useEffect, useState, useRef } from 'react';
import { Button } from "./../components/ui/button";
import { Database, Server, CheckCircle, Copy, Check, ExternalLink, Terminal, ArrowRight, ArrowDown, LogOut, Hand } from 'lucide-react';
import { motion, AnimatePresence, Variant } from 'framer-motion';
import { toast } from 'sonner';

// SQL schema to display and apply (keeping the original SQL, just showing a portion of it in the UI)
const SCHEMA_SQL = `

CREATE EXTENSION IF NOT EXISTS vector;
-- Create enum types for message fields if they don't exist yet
DO $$
BEGIN
    -- Check and create message_direction type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_direction') THEN
        CREATE TYPE message_direction AS ENUM ('incoming', 'outgoing');
    END IF;

    -- Check and create message_status type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
    END IF;

    -- Check and create delivery_status type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE delivery_status AS ENUM ('sent', 'pending');
    END IF;
END$$;

-- Create contacts table first
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    last_contact TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID
);

-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    token TEXT NOT NULL,
    username TEXT,
    telegram_id TEXT,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID
);

-- Create messages table with proper foreign key
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL,
    agent_id UUID,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_from_customer BOOLEAN DEFAULT TRUE,
    is_viewed BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT TRUE,
    is_processed BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    is_ai_response BOOLEAN DEFAULT FALSE,
    message_status message_status DEFAULT 'delivered',
    status delivery_status DEFAULT 'pending',
    direction message_direction DEFAULT 'incoming',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Create memory table after messages and contacts
CREATE TABLE IF NOT EXISTS memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES contacts(id),
    message_id UUID NOT NULL REFERENCES messages(id),
    vector vector(768), -- Using 768 dimensions for Gemini text-embedding-004 embeddings
    content TEXT NOT NULL,
    memory_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now drop existing policies using a safe approach that checks if tables exist
DO $$
BEGIN
    -- Drop policies for messages table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON messages;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON messages;
    END IF;

    -- Drop policies for contacts table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts') THEN
        DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON contacts;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON contacts;
    END IF;

    -- Drop policies for agents table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agents') THEN
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON agents;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON agents;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON agents;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON agents;
    END IF;

    -- Drop policies for bots table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bots') THEN
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bots;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON bots;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON bots;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON bots;
    END IF;

    -- Drop policies for memory table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memory') THEN
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON memory;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON memory;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON memory;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON memory;
    END IF;
END
$$;

-- Drop existing views if they exist
DROP VIEW IF EXISTS memory_with_contacts CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS match_memory(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS check_extension_exists(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_vector_columns(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_table_info(TEXT) CASCADE;
DROP FUNCTION IF EXISTS list_views() CASCADE;
DROP FUNCTION IF EXISTS get_table_definition(text) CASCADE;

-- Drop existing indexes if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        DROP INDEX IF EXISTS idx_messages_contact_id;
        DROP INDEX IF EXISTS idx_messages_created_at;
        DROP INDEX IF EXISTS idx_messages_status;
        DROP INDEX IF EXISTS idx_messages_direction;
        DROP INDEX IF EXISTS idx_messages_message_status;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts') THEN
        DROP INDEX IF EXISTS idx_contacts_contact_info;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agents') THEN
        DROP INDEX IF EXISTS idx_agents_name;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bots') THEN
        DROP INDEX IF EXISTS idx_bots_platform;
        DROP INDEX IF EXISTS idx_bots_is_active;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memory') THEN
        DROP INDEX IF EXISTS idx_memory_user_id;
        DROP INDEX IF EXISTS idx_memory_message_id;
        DROP INDEX IF EXISTS idx_memory_vector;
    END IF;
END
$$;

-- Create memory_with_contacts view
CREATE OR REPLACE VIEW memory_with_contacts AS
SELECT
    m.id,
    m.user_id,
    m.message_id,
    m.vector,
    m.content,
    m.memory_data,
    m.created_at,
    m.updated_at,
    c.name AS user_name,
    c.contact_info
FROM
    memory m
JOIN
    contacts c ON m.user_id = c.id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_message_status ON messages(message_status);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_info ON contacts(contact_info);
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_bots_platform ON bots(platform);
CREATE INDEX IF NOT EXISTS idx_bots_is_active ON bots(is_active);
CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_message_id ON memory(message_id);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS idx_memory_vector ON memory USING ivfflat (vector vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON messages
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON messages
    FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON contacts
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON contacts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON contacts
    FOR UPDATE USING (true);

-- Create RLS policies for agents table
CREATE POLICY "Enable read access for authenticated users" ON agents
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON agents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON agents
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON agents
    FOR DELETE USING (true);

-- Create RLS policies for bots table
CREATE POLICY "Enable read access for authenticated users" ON bots
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON bots
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON bots
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON bots
    FOR DELETE USING (true);

-- Create RLS policies for memory table
CREATE POLICY "Enable read access for authenticated users" ON memory
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON memory
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON memory
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON memory
    FOR DELETE USING (true);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at
    BEFORE UPDATE ON bots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_updated_at
    BEFORE UPDATE ON memory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_memory(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        memory.id,
        memory.content,
        1 - (memory.vector <=> query_embedding) as similarity
    FROM memory
    WHERE 1 - (memory.vector <=> query_embedding) > match_threshold
    ORDER BY memory.vector <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create utility functions for schema checking and maintenance
CREATE OR REPLACE FUNCTION check_extension_exists(ext_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_val BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = ext_name
  ) INTO exists_val;

  RETURN exists_val;
END;
$$;

CREATE OR REPLACE FUNCTION get_vector_columns(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  dimensions INTEGER,
  data_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.attname::TEXT AS column_name,
    CASE
      WHEN t.typname = 'vector' THEN
        -- Extract dimensions from vector type
        CASE
          WHEN t.typelem <> 0 AND t.typlen = -1 THEN
            (regexp_match(
              (SELECT atttypmod FROM pg_attribute WHERE attrelid = (table_name::regclass) AND attname = a.attname)::TEXT,
              '(\d+)'))[1]::INTEGER
          ELSE 0
        END
      ELSE 0
    END AS dimensions,
    t.typname::TEXT AS data_type
  FROM
    pg_attribute a
  JOIN
    pg_class c ON a.attrelid = c.oid
  JOIN
    pg_type t ON a.atttypid = t.oid
  WHERE
    c.relname = table_name
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND (t.typname = 'vector' OR t.typname LIKE '%vector%');
END;
$$;

CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    columns.column_name::TEXT,
    columns.data_type::TEXT,
    columns.is_nullable::TEXT
  FROM
    information_schema.columns
  WHERE
    table_name = get_table_info.table_name
  ORDER BY
    ordinal_position;
END;
$$;

CREATE OR REPLACE FUNCTION list_views()
RETURNS TABLE (
  view_name TEXT,
  view_definition TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    views.table_name::TEXT,
    views.view_definition::TEXT
  FROM
    information_schema.views
  WHERE
    views.table_schema = 'public';
END;
$$;

-- Create RPC function to check table definitions
CREATE OR REPLACE FUNCTION get_table_definition(table_name text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'table_name', c.relname,
    'columns', jsonb_agg(
      jsonb_build_object(
        'column_name', a.attname,
        'data_type', format_type(a.atttypid, a.atttypmod),
        'is_nullable', NOT a.attnotnull,
        'column_default', pg_get_expr(d.adbin, d.adrelid)
      )
    ),
    'constraints', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'constraint_name', con.conname,
          'constraint_type', CASE
                                WHEN con.contype = 'p' THEN 'PRIMARY KEY'
                                WHEN con.contype = 'f' THEN 'FOREIGN KEY'
                                WHEN con.contype = 'u' THEN 'UNIQUE'
                                WHEN con.contype = 'c' THEN 'CHECK'
                                ELSE con.contype::text
                              END,
          'foreign_table', CASE
                              WHEN con.contype = 'f' THEN tbl.relname
                              ELSE NULL
                           END
        )
      )
      FROM pg_constraint con
      LEFT JOIN pg_class tbl ON tbl.oid = con.confrelid
      WHERE con.conrelid = c.oid
    )
  ) INTO result
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE c.relname = table_name
    AND n.nspname = 'public'
    AND a.attnum > 0
    AND NOT a.attisdropped
  GROUP BY c.relname, c.oid;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Ensure message-contact relationship
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_contact_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Ensure memory-message relationship
ALTER TABLE memory DROP CONSTRAINT IF EXISTS memory_message_id_fkey;
ALTER TABLE memory ADD CONSTRAINT memory_message_id_fkey
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Ensure memory-user (contact) relationship
ALTER TABLE memory DROP CONSTRAINT IF EXISTS memory_user_id_fkey;
ALTER TABLE memory ADD CONSTRAINT memory_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Create a function to handle temporary IDs conversion
CREATE OR REPLACE FUNCTION handle_temp_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the ID is a temporary ID (starts with 'temp-')
  IF NEW.id::text LIKE 'temp-%' THEN
    -- Generate a new proper UUID
    NEW.id = gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically handle temporary IDs
DROP TRIGGER IF EXISTS messages_handle_temp_id ON messages;
CREATE TRIGGER messages_handle_temp_id
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION handle_temp_id();
`;

// Define the types for steps internal to this component
type SetupStep = 'loading' | 'connected' | 'schema-setup' | 'verification' | 'verified' | 'complete';

interface SupaSetupProps {
  onSetupComplete: () => void;
  initialProjectRef: string | null;
  initialStep: SetupStep;
  initialFlowState?: {
    verificationStatus: 'idle' | 'checking' | 'success' | 'failed';
    showConnectionSuccess: boolean;
    showSchemaInstructions: boolean;
    showSuccessAnimation: boolean;
    showFinalSuccess: boolean;
  } | null;
}

export default function SupaSetup({ onSetupComplete, initialProjectRef, initialStep, initialFlowState }: SupaSetupProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [currentLocalStep, setCurrentLocalStep] = useState<SetupStep>(initialStep);
  const [showFullSQL, setShowFullSQL] = useState(false);
  const [showGuideAnimation, setShowGuideAnimation] = useState(false);

  // Animation controls - Initialize from restored state or defaults
  const [showConnectionSuccess, setShowConnectionSuccess] = useState(initialFlowState?.showConnectionSuccess ?? (initialStep === 'connected'));
  const [showSchemaInstructions, setShowSchemaInstructions] = useState(initialFlowState?.showSchemaInstructions ?? false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(initialFlowState?.showSuccessAnimation ?? false);
  const [showFinalSuccess, setShowFinalSuccess] = useState(initialFlowState?.showFinalSuccess ?? false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>(initialFlowState?.verificationStatus ?? 'idle');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handAnimationRef = useRef<HTMLDivElement>(null);

  // Save flow state specific to this component
  const saveFlowState = () => {
    // Only save if we are *not* in the 'complete' or 'loading' step (as page.tsx handles the final transition)
    if (currentLocalStep !== 'complete' && currentLocalStep !== 'loading') {
        // Only save if the setup is not already marked as completed in localStorage
        const isCompleted = localStorage.getItem('schema_setup_completed') === 'true';
        if (!isCompleted) {
            localStorage.setItem('dashboard_flow_state', JSON.stringify({
              currentStep: currentLocalStep,
              verificationStatus,
              showConnectionSuccess,
              showSchemaInstructions,
              showSuccessAnimation,
              showFinalSuccess
            }));
        } else {
             // If setup is completed externally, ensure local state reflects this and clear saved state
             localStorage.removeItem('dashboard_flow_state');
             setCurrentLocalStep('complete');
        }
    } else {
      // If setup is considered complete locally, clear the saved state
      localStorage.removeItem('dashboard_flow_state');
    }
  };

  // Save state when flow changes
  useEffect(() => {
    saveFlowState();
  }, [currentLocalStep, verificationStatus, showConnectionSuccess,
      showSchemaInstructions, showSuccessAnimation, showFinalSuccess]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle flow transitions
  useEffect(() => {
    if (currentLocalStep === 'connected' && showConnectionSuccess) {
      timeoutRef.current = setTimeout(() => {
        setShowConnectionSuccess(false);
        timeoutRef.current = setTimeout(() => {
          setCurrentLocalStep('schema-setup');
          setShowSchemaInstructions(true);
        }, 400);
      }, 2500);
    }

    if (currentLocalStep === 'verified' && showSuccessAnimation) {
      timeoutRef.current = setTimeout(() => {
        setShowSuccessAnimation(false);
        timeoutRef.current = setTimeout(() => {
          setShowFinalSuccess(true);
          // Stay in 'verified' step until user clicks button
        }, 400);
      }, 2500);
    }
  }, [currentLocalStep, showConnectionSuccess, showSuccessAnimation]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA_SQL);
      setCopiedToClipboard(true);
      timeoutRef.current = setTimeout(() => {
        setCopiedToClipboard(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openSqlEditor = () => {
    if (initialProjectRef) {
      window.open(`https://app.supabase.com/project/${initialProjectRef}/sql`, '_blank');
    } else {
      console.error("Project Ref is missing, cannot open SQL editor.");
    }
  };

  const handleSchemaApplied = () => {
    // Mark schema as applied in localStorage (and clear progress flags)
    localStorage.setItem('schema_setup_completed', 'true');
    localStorage.removeItem('schema_setup_in_progress');
    document.cookie = `schema_setup_completed=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    document.cookie = `schema_setup_in_progress=false; path=/; max-age=0; SameSite=Lax`;

    // Trigger success animation
    setVerificationStatus('success');
    setCurrentLocalStep('verified');
    setShowSuccessAnimation(true);
    saveFlowState(); // Save state before potentially transitioning out
  };

  const verifySchema = async () => {
    setVerificationStatus('checking');
    saveFlowState();

    try {
      // Try to verify schema by making a test query to the database
      const response = await fetch('/api/verify-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectRef: initialProjectRef
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Schema verification successful
        // Mark schema as applied in localStorage and cookies
        localStorage.setItem('schema_setup_completed', 'true');
        localStorage.setItem('schema_setup_in_progress', 'false');
        document.cookie = `schema_setup_completed=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        document.cookie = `schema_setup_in_progress=false; path=/; max-age=0; SameSite=Lax`;

        // Clear any saved flow state
        localStorage.removeItem('dashboard_flow_state');

        // Show success animation and then proceed to dashboard
        onSetupComplete();
      } else {
        // Schema verification failed but don't block the user
        // Just show a warning and allow them to proceed
        console.warn('Schema verification failed:', data.error);
        toast.warning('Schema verification could not be completed automatically. You can still proceed.');
        setVerificationStatus('failed');
        saveFlowState();
      }
    } catch (error) {
      console.error('Error verifying schema:', error);
      // Allow user to proceed anyway
      toast.warning('Could not verify schema automatically. You can still proceed.');
      setVerificationStatus('failed');
      saveFlowState();
    }
  };

  const forceVerifySuccess = () => {
    // Mark schema as applied in localStorage and cookies
    localStorage.setItem('schema_setup_completed', 'true');
    localStorage.setItem('schema_setup_in_progress', 'false');
    document.cookie = `schema_setup_completed=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    document.cookie = `schema_setup_in_progress=false; path=/; max-age=0; SameSite=Lax`;

    // Clear any saved flow state
    localStorage.removeItem('dashboard_flow_state');

    // Directly call the onSetupComplete callback to show the final success animation
    onSetupComplete();
  };

  const skipToSchemaVerification = () => {
    setCurrentLocalStep('verification');
    setShowSchemaInstructions(false); // Ensure instructions are hidden
    setShowGuideAnimation(false);
    saveFlowState();
  };

  const startGuideAnimation = () => {
    setShowGuideAnimation(true);

    // After 7 seconds, hide the guide animation
    setTimeout(() => {
      setShowGuideAnimation(false);
    }, 7000);
  };

  // Truncated SQL for display with "Read More" option
  const truncatedSQL = SCHEMA_SQL.split('\n').slice(0, 30).join('\n') + '...';

  // --- JSX ---
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 min-h-screen">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOC0xOCIgc3Ryb2tlPSIjMmJjOWNmIiBvcGFjaXR5PSIuMTUiLz48cGF0aCBkPSJNMi41IDI0YzAtNS4xOTkgNC4yLTkuNCAxNi41LTkuNCIgc3Ryb2tlPSIjMmJjOWNmIiBvcGFjaXR5PSIuMDciLz48L2c+PC9zdmc+')] opacity-20"></div>

      {/* Spotlight Effect */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-radial from-teal-400/10 to-transparent pointer-events-none"></div>

      {/* Connection Success Animation */}
      <AnimatePresence>
        {showConnectionSuccess && currentLocalStep === 'connected' && (
           <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-xl w-full mx-4 p-10 bg-gradient-to-r from-teal-700 via-cyan-800 to-teal-900 rounded-2xl shadow-2xl text-center border border-teal-400/20"
              style={{ boxShadow: '0 0 40px rgba(20, 184, 166, 0.3)' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="mx-auto w-28 h-28 bg-gradient-to-br from-teal-100 to-cyan-50 rounded-full flex items-center justify-center mb-8 shadow-xl"
                style={{ boxShadow: '0 0 30px rgba(20, 184, 166, 0.4)' }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Server className="h-14 w-14 text-teal-600" />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-cyan-100"
              >
                Supabase Connected Successfully!
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xl text-teal-100 mb-6"
              >
                We have successfully connected to your Supabase project.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col items-center mt-8"
              >
                <p className="text-white mb-3 font-medium">You're just one step away from completion</p>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="bg-teal-500/30 p-2 rounded-full"
                  style={{ boxShadow: '0 5px 15px rgba(20, 184, 166, 0.3)' }}
                >
                  <ArrowDown className="h-8 w-8 text-white" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schema Setup Instructions Animation */}
      <AnimatePresence>
        {showSchemaInstructions && currentLocalStep === 'schema-setup' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-xl w-full mx-4 p-10 bg-gradient-to-br from-teal-800 via-cyan-900 to-teal-900 rounded-2xl shadow-2xl border border-teal-400/20"
              style={{ boxShadow: '0 0 40px rgba(20, 184, 166, 0.3)' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto w-24 h-24 bg-gradient-to-br from-teal-100 to-cyan-50 rounded-full flex items-center justify-center mb-8 shadow-xl"
                style={{ boxShadow: '0 0 30px rgba(20, 184, 166, 0.4)' }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotateY: [0, 180, 360]
                  }}
                  transition={{
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    rotateY: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <Database className="h-12 w-12 text-teal-700" />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-cyan-100"
              >
                Let's Set Up Your Database Schema
              </motion.h2>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white space-y-5 bg-teal-900/30 p-6 rounded-xl border border-teal-500/20"
                style={{ boxShadow: '0 4px 12px rgba(20, 184, 166, 0.2)' }}
              >
                <p className="font-medium text-lg">Follow these simple steps:</p>
                <ol className="list-decimal list-inside space-y-3 text-gray-200">
                  <li className="py-1">Copy the schema SQL we provide</li>
                  <li className="py-1">Paste it into your Supabase SQL Editor</li>
                  <li className="py-1">Run the query to create your tables</li>
                  <li className="py-1">Return here to verify your setup</li>
                </ol>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 flex justify-between"
              >
                <Button
                  onClick={() => {
                    setShowSchemaInstructions(false);
                    startGuideAnimation();
                    timeoutRef.current = setTimeout(() => {
                      setCurrentLocalStep('verification');
                    }, 400);
                  }}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-medium px-8 py-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                  style={{ boxShadow: '0 4px 14px rgba(20, 184, 166, 0.5)' }}
                >
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Continue with Guide
                </Button>

                <Button
                  onClick={skipToSchemaVerification}
                  variant="outline"
                  className="bg-transparent border border-teal-400/30 text-teal-200 hover:bg-teal-800/30 font-medium px-5 py-2 rounded-lg shadow-md"
                >
                  Skip to Verification
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guide Animation */}
      <AnimatePresence>
        {showGuideAnimation && currentLocalStep === 'verification' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none"
          >
            <div className="relative w-full max-w-4xl">
              {/* Step Indicator */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-4 top-4 bg-teal-900/80 px-4 py-2 rounded-full border border-teal-500/30"
              >
                <span className="text-teal-200 font-medium">Step 1: Copy SQL</span>
              </motion.div>

              {/* Pulsing Highlight for Copy Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.95, 1.05, 0.95]
                }}
                transition={{
                  duration: 1.5,
                  times: [0, 0.5, 1],
                  repeat: 2,
                  repeatDelay: 0.2
                }}
                className="absolute top-[25%] right-[10%] w-32 h-32 rounded-full bg-gradient-to-r from-teal-400/30 to-cyan-400/30"
                style={{
                  boxShadow: '0 0 30px rgba(20, 184, 166, 0.4)',
                  filter: 'blur(4px)'
                }}
              />

              {/* Animated Hand */}
              <motion.div
                ref={handAnimationRef}
                initial={{ x: "100%", y: "25%", opacity: 0, rotate: 0 }}
                variants={{
                  enter: { x: "70%", y: "25%", opacity: 1, rotate: 0, transition: { duration: 0.8, ease: "easeOut" } },
                  hover1: { scale: 1.1, transition: { duration: 0.2 } },
                  click1: { y: "27%", scale: 0.95, transition: { duration: 0.1 } },
                  release1: { y: "25%", scale: 1, transition: { duration: 0.1 } },
                  moveToButton: {
                    x: "60%",
                    y: "60%",
                    rotate: -20,
                    transition: {
                      duration: 1.2,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  },
                  hover2: { scale: 1.1, transition: { duration: 0.2 } },
                  click2: { y: "62%", scale: 0.95, transition: { duration: 0.1 } },
                  release2: { y: "60%", scale: 1, transition: { duration: 0.1 } },
                  exit: { opacity: 0, transition: { duration: 0.5 } }
                }}
                animate={[
                  "enter",
                  "hover1",
                  "click1",
                  "release1",
                  "moveToButton",
                  "hover2",
                  "click2",
                  "release2",
                  "exit"
                ]}
                className="absolute w-16 h-16 z-50 pointer-events-none"
              >
                <Hand className="w-full h-full text-teal-200 drop-shadow-lg filter" />
                {/* Click Effect */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, times: [0, 0.5, 1], repeat: 2, repeatDelay: 2 }}
                  className="absolute inset-0 bg-teal-400/30 rounded-full"
                  style={{ filter: 'blur(8px)' }}
                />
              </motion.div>

              {/* Step 2 Indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0, 1, 1, 0],
                }}
                transition={{
                  duration: 5,
                  times: [0, 0.4, 0.5, 0.9, 1],
                }}
                className="absolute left-4 top-4 bg-teal-900/80 px-4 py-2 rounded-full border border-teal-500/30"
              >
                <span className="text-teal-200 font-medium">Step 2: Open SQL Editor</span>
              </motion.div>

              {/* SQL Editor Button Highlight */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0, 0, 0.8, 0],
                  scale: [1, 1, 1, 1.05, 1]
                }}
                transition={{
                  duration: 5,
                  times: [0, 0.4, 0.5, 0.7, 1],
                }}
                className="absolute top-[60%] left-[60%] right-[10%] h-16 rounded-lg bg-gradient-to-r from-teal-400/30 to-cyan-400/30"
                style={{
                  boxShadow: '0 0 30px rgba(20, 184, 166, 0.4)',
                  filter: 'blur(2px)'
                }}
              />

              {/* Skip button with improved styling */}
              <div className="absolute bottom-10 right-8 pointer-events-auto">
                <Button
                  onClick={() => setShowGuideAnimation(false)}
                  variant="outline"
                  size="sm"
                  className="bg-black/50 border border-teal-400/30 text-teal-200 hover:bg-teal-900/50 transition-all duration-300 hover:scale-105"
                  style={{ boxShadow: '0 0 15px rgba(20, 184, 166, 0.2)' }}
                >
                  Skip Guide
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schema Setup and Verification UI */}
      {currentLocalStep === 'verification' && (
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-teal-900/10 backdrop-blur-lg rounded-xl border border-teal-500/15 overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 10px 30px rgba(20, 184, 166, 0.15)' }}
            >
              <div className="px-6 py-6 border-b border-teal-500/10 flex justify-between items-center bg-gradient-to-r from-teal-900/50 to-cyan-900/50">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Terminal className="mr-2 h-5 w-5 text-teal-300" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-cyan-200">
                    Database Schema Setup
                  </span>
                </h2>
                <div className="flex items-center space-x-2 bg-teal-600/40 px-3 py-1.5 rounded-full text-teal-50 text-sm border border-teal-500/30">
                  <span className="h-2 w-2 bg-teal-300 rounded-full animate-pulse"></span>
                  <span>Final Step</span>
                </div>
              </div>

              <div className="p-8 space-y-10">
                {/* Step 1: Copy SQL Schema */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">1</span>
                    <h3 className="text-xl font-medium text-teal-50">Copy SQL Schema</h3>
                  </div>
                  <div className="relative mt-4">
                    <div className="relative bg-gray-900/80 rounded-lg overflow-hidden border border-teal-500/20">
                      <pre className={`p-5 overflow-y-auto text-teal-100 text-sm ${!showFullSQL ? 'max-h-64' : ''}`}>
                        {showFullSQL ? SCHEMA_SQL.trim() : truncatedSQL}
                      </pre>

                      {!showFullSQL && (
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900 to-transparent flex items-end justify-center pb-4">
                          <Button
                            size="sm"
                            onClick={() => setShowFullSQL(true)}
                            className="bg-teal-600/70 hover:bg-teal-600 text-white border border-teal-500/40"
                            style={{ boxShadow: '0 0 15px rgba(20, 184, 166, 0.3)' }}
                          >
                            Show Full SQL
                          </Button>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={copyToClipboard}
                      className={`absolute top-3 right-3 ${copiedToClipboard
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-teal-600 hover:bg-teal-700'} shadow-md transform transition-transform hover:scale-105 text-white`}
                      style={{ boxShadow: '0 0 15px rgba(20, 184, 166, 0.3)' }}
                    >
                      {copiedToClipboard ? (
                        <>
                          <Check className="mr-1 h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Step 2: Open SQL Editor */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">2</span>
                    <h3 className="text-xl font-medium text-teal-50">Open SQL Editor</h3>
                  </div>
                  <Button
                    onClick={openSqlEditor}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                    style={{ boxShadow: '0 4px 14px rgba(20, 184, 166, 0.4)' }}
                  >
                    <div className="flex items-center justify-center">
                      <img
                        src="https://supabase.com/favicon/favicon-196x196.png"
                        alt="Supabase Logo"
                        className="w-5 h-5 mr-2"
                      />
                      Open Supabase SQL Editor
                    </div>
                  </Button>
                </div>

                {/* Step 3: Verify Schema */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">3</span>
                    <h3 className="text-xl font-medium text-teal-50">Verify Your Schema</h3>
                  </div>
                  <div className="bg-teal-900/30 p-6 rounded-lg border border-teal-500/20">
                    <p className="text-teal-100 mb-5 font-medium">
                      Have you created the schema by running the SQL in your Supabase project?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={verifySchema}
                        disabled={verificationStatus === 'checking'}
                        className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg transform transition-transform hover:scale-105 font-medium py-6"
                        style={{ boxShadow: '0 4px 14px rgba(20, 184, 166, 0.4)' }}
                      >
                        {verificationStatus === 'checking' ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Yes, Verify My Schema
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={forceVerifySuccess}
                        variant="outline"
                        className="flex-1 bg-teal-900/30 hover:bg-teal-900/50 text-teal-200 border-teal-500/30 shadow-lg transform transition-transform hover:scale-105 font-medium py-6"
                      >
                        I've Created It Manually
                      </Button>
                    </div>

                    {verificationStatus === 'failed' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-5 bg-red-500/20 p-4 rounded-lg border border-red-500/30 text-white"
                      >
                        <p className="text-sm">
                          We couldn't verify your schema. Please make sure you've run the SQL commands in your Supabase project.
                          If you're certain the schema is created, click "I've Created It Manually".
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}