# AI Orchestration System for NextJS Frontend

This directory contains the AI orchestration system for the frontend, which matches incoming messages to the most appropriate agent and generates responses.

## Directory Structure

- **agents/** - Agent implementations (base, LLM, rules, classifier)
- **models/** - Type definitions and interfaces
- **orchestration/** - Core orchestration logic
- **tests/** - Test scripts for various components
- **utils/** - Utility functions and clients

## Components

### 1. Orchestration (`orchestration/orchestrator.ts`)
- Core orchestration logic
- Agent selection and messaging processing
- Response generation and handling

### 2. Agent Management (`agents/`)
- `base-agent.ts`: Base agent interface
- `llm-agent.ts`: LLM-based agent implementation
- `rules-agent.ts`: Rule-based agent implementation
- `classifier-agent.ts`: Message classification agent

### 3. Supabase Integration (`utils/supabase-bridge.ts`)
- Fetch unviewed messages
- Mark messages as viewed
- Create and manage agents
- Save responses

### 4. Test Scripts (`tests/`)
- `test-orchestration.js`: Tests agent scoring and message routing
- `test-response-generation.js`: Tests response generation
- `test-supabase-integration.js`: Tests fetching and updating messages
- `run-tests.js`: Test runner to execute all tests

## How It Works

### Message Routing Process
1. When a new message arrives, it's saved to Supabase with `is_viewed` set to `false`
2. The orchestrator fetches unviewed messages
3. Messages are processed by:
   - Finding the most relevant agent based on a scoring system
   - Generating a response using the selected agent
   - Marking the message as viewed
   - Returning the agent name and generated response

### Agent Scoring Algorithm
Similar to the backend implementation, agents are scored based on:
- Name matching: +3 points if the agent name appears in the message content
- Description matching: +1 point for each word in the agent description that appears in the message
- The agent with the highest score is selected (if score > 0)
- If no good match is found, a default agent is used

## Testing

### Running Tests
To run the tests, use the test runner script:

```bash
node src/lib/ai/tests/run-tests.js
```

This will display a menu of available tests, allowing you to:
1. Run individual tests
2. Run all tests at once
3. View test results

### Test Coverage
The test suite covers:

1. **Agent Scoring and Selection**
   - Tests the scoring algorithm with different messages
   - Verifies that the expected agent is selected for each message

2. **Response Generation**
   - Tests generating responses with a test agent
   - Verifies integration with Claude API
   - Tests the full message flow

3. **Supabase Integration**
   - Tests fetching unviewed messages
   - Tests marking messages as viewed
   - Tests the full process flow from message to response

### Adding New Tests
To add a new test script:
1. Create a new file in the `tests/` directory
2. Add it to the `testScripts` array in `run-tests.js`

## Usage Example

Here's an example of how to use the orchestration system:

```typescript
import { Orchestrator } from '../lib/ai/orchestration/orchestrator';

// Initialize the orchestrator
const orchestrator = new Orchestrator();
await orchestrator.initialize();

// Process an unviewed message
const message = {
  id: 'message-id',
  contact_id: 'contact-id',
  content: 'I need help with your product',
  // ... other message properties
};

const result = await orchestrator.processMessage(message);
console.log(`Agent: ${result.agent_id}`);
console.log(`Response: ${result.message}`);
```

## Environment Setup

The system requires the following environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

These should be set in your `.env.local` file. 