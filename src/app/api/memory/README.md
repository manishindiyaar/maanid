# Memory System

This module provides a memory layer for conversational AI, allowing the system to remember important information about users across conversations.

## Key Features

- **Vector-based memory storage** using pgvector in PostgreSQL/Supabase
- **Gemini embedding model** for high-quality semantic memory retrieval
- **Claude language model** for memory extraction
- **Automatic memory extraction** from messages
- **Semantic similarity search** for relevant memories
- **Simplified memory storage** for better performance
- **Seamless integration** with the orchestration layer

## Setup Instructions

### 1. Enable pgvector in Supabase

First, enable the pgvector extension in your Supabase project:

1. Log in to your Supabase dashboard
2. Select your project
3. Navigate to the "Database" section
4. Go to "Extensions"
5. Find "pgvector" in the list and click "Enable"

### 2. Create Database Tables and Functions

Run the SQL setup script in your Supabase SQL editor:

1. Copy the contents of `rebuild-memory.sql`
2. Open the SQL Editor in Supabase
3. Paste the SQL and execute it

This script:
- Drops any existing memory tables and functions (to avoid conflicts)
- Creates a new `memory` table with a 768-dimensional vector column for Gemini embeddings
- Creates the `match_memories` function for semantic similarity search
- Sets up indexes and views for efficient querying

### 3. Configure Environment Variables

Add the following environment variables to your project:

```
# Anthropic Claude for LLM and memory extraction
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Gemini API for embeddings
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Test the Memory System

Run the test script to verify the memory system is working correctly:

```bash
npx ts-node src/app/api/memory/interactive-test.ts
```

Make sure to set a valid user ID in the test or enter it when prompted.

## Fixing Common Issues

If you see dimension mismatch errors:
- Run the `rebuild-memory.sql` script to recreate the tables with the correct dimensions (768 for Gemini embeddings)
- Make sure both the memory table and match_memories function use the same dimensions (768)

## Architecture

- `memoryService.ts` - Core memory service for extracting, storing, and retrieving memories
- `gemini-embeddings.ts` - Gemini embedding model integration
- `route.ts` - API endpoints for memory operations
- `rebuild-memory.sql` - Script to recreate the memory database schema
- `match_memories.sql` - Vector similarity search function

## Usage

The memory system is automatically integrated with the orchestration layer, enhancing responses with relevant user memories. When a message is processed:

1. Relevant memories are retrieved and added to the system prompt
2. The message is analyzed for important information
3. New memories are extracted and stored for future use

The memory system uses Gemini's state-of-the-art embedding models to provide accurate semantic matching, ensuring that relevant memories are retrieved even with different phrasing. 