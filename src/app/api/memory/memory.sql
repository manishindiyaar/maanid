-- Rebuild Memory Schema Script
-- This script drops and recreates the memory tables and functions with simplified structure

-- First, drop existing function if it exists
DROP FUNCTION IF EXISTS match_memories(vector(1536), uuid, float, integer);
DROP FUNCTION IF EXISTS match_memories(vector(768), uuid, float, integer);

-- Drop the trigger
DROP TRIGGER IF EXISTS memory_updated_at ON memory;

-- Drop the function for the trigger
DROP FUNCTION IF EXISTS update_updated_at();

-- Drop the view
DROP VIEW IF EXISTS memory_with_contacts;

-- Drop the table itself
DROP TABLE IF EXISTS memory;

-- Now rebuild everything with 768 dimensions for Gemini embeddings

-- Create memory table with simplified structure
CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES contacts(id),
  message_id UUID REFERENCES messages(id),
  vector vector(768),  -- Using 768-dimensional vectors for Gemini embeddings
  content TEXT NOT NULL,
  memory_data JSONB NOT NULL, -- Structured memory data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS memory_vector_idx ON memory USING ivfflat (vector vector_l2_ops)
  WITH (lists = 100);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER memory_updated_at
BEFORE UPDATE ON memory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create a view to join memories with contacts for easier querying
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
  c.name as user_name,
  c.contact_info
FROM memory m
JOIN contacts c ON m.user_id = c.id;

-- Function to match memories based on vector similarity
CREATE OR REPLACE FUNCTION match_memories(
  query_vector vector(768),
  user_id_filter UUID,
  match_threshold FLOAT DEFAULT 0.3,  -- Threshold for good matches
  match_limit INT DEFAULT 10          -- Number of results to return
) 
RETURNS TABLE (
  id UUID,
  user_id UUID,
  message_id UUID,
  content TEXT,
  memory_data JSONB,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.message_id,
    m.content,
    m.memory_data,
    1 - (m.vector <-> query_vector) AS similarity,
    m.created_at,
    m.updated_at
  FROM
    memory m
  WHERE
    m.user_id = user_id_filter
    AND 1 - (m.vector <-> query_vector) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT match_limit;
END;
$$; 