/**
 * Test script for message orchestration
 * Tests agent scoring and message routing functionality
 * Run with: node src/lib/ai/tests/test-orchestration.js
 */

// Import required modules
const config = require('../utils/env-config');
const supabaseUtils = require('../utils/supabase-client');
const { v4: uuidv4 } = require('uuid');

// Check environment variables
console.log('Environment file path:', config.envPath);
console.log('Checking environment variables:');
if (!config.checkRequiredVars()) {
  process.exit(1);
}

// Test agents data
const testAgents = [
  {
    name: 'Test_SupportAgent',
    description: 'Provides support for technical issues and product assistance. Helps with troubleshooting, setup, and configuration.',
    type: 'llm',
    priority: 'medium',
    enabled: true,
    model: 'claude-3-haiku-20240307'
  },
  {
    name: 'Test_SalesAgent',
    description: 'Handles sales inquiries, pricing questions, and product availability. Provides information about discounts and promotions.',
    type: 'llm',
    priority: 'medium',
    enabled: true,
    model: 'claude-3-haiku-20240307'
  },
  {
    name: 'Test_GeneralAgent',
    description: 'A general-purpose agent that can handle a wide variety of requests and questions.',
    type: 'llm',
    priority: 'low',
    enabled: true,
    model: 'claude-3-haiku-20240307'
  }
];

// Test messages for agent scoring
const testMessages = [
  {
    content: 'I need help with my computer not turning on. Can you help me troubleshoot?',
    expectedAgent: 'Test_SupportAgent'
  },
  {
    content: 'How much does your product cost? Are there any discounts available?',
    expectedAgent: 'Test_SalesAgent'
  },
  {
    content: 'Can you tell me about the weather today?',
    expectedAgent: 'Test_GeneralAgent'
  }
];

// Function to score agent relevance (similar to the Python implementation)
function scoreAgentRelevance(message, agent) {
  const messageContent = message.toLowerCase();
  const agentName = agent.name.toLowerCase();
  const agentDescription = agent.description ? agent.description.toLowerCase() : '';
  
  let score = 0;
  
  // Name matching (higher weight)
  if (messageContent.includes(agentName)) {
    score += 3;
  }
  
  // Description matching
  if (agentDescription) {
    const descWords = agentDescription.split(/\s+/);
    for (const word of descWords) {
      if (word && word.length > 3 && messageContent.includes(word)) {
        score += 1;
      }
    }
  }
  
  return score;
}

// Function to find the best agent for a message
function findBestAgent(message, agents) {
  if (!agents || agents.length === 0) {
    return null;
  }
  
  // Calculate scores for all agents
  const scoredAgents = agents.map(agent => ({
    agent,
    score: scoreAgentRelevance(message, agent)
  }));
  
  // Sort by score in descending order
  scoredAgents.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring agent if score > 0
  if (scoredAgents.length > 0 && scoredAgents[0].score > 0) {
    return scoredAgents[0].agent;
  }
  
  // If no good match, return the first agent as default
  return agents[0];
}

// Create test agents in the database
async function createTestAgents() {
  console.log('\nCreating test agents...');
  
  const createdAgents = [];
  
  try {
    // First, delete any existing test agents
    const { data: existingAgents } = await supabaseUtils.supabaseAdmin
      .from('agents')
      .select('id, name')
      .like('name', 'Test_%');
    
    if (existingAgents && existingAgents.length > 0) {
      console.log(`Found ${existingAgents.length} existing test agents to delete`);
      
      for (const agent of existingAgents) {
        await supabaseUtils.deleteAgent(agent.id);
        console.log(`✅ Deleted existing test agent: ${agent.name}`);
      }
    }
    
    // Create new test agents
    for (const agentData of testAgents) {
      const agent = await supabaseUtils.createAgent(agentData);
      if (agent) {
        console.log(`✅ Created test agent: ${agent.name}`);
        createdAgents.push(agent);
      }
    }
    
    return createdAgents;
  } catch (error) {
    console.error('Error creating test agents:', error);
    return [];
  }
}

// Test the agent scoring system
async function testAgentScoring(agents) {
  console.log('\nTesting agent scoring system...');
  
  if (!agents || agents.length === 0) {
    console.error('❌ No test agents available for scoring test');
    return false;
  }
  
  console.log(`Found ${agents.length} agents for testing`);
  
  let successCount = 0;
  
  for (let i = 0; i < testMessages.length; i++) {
    const testCase = testMessages[i];
    console.log(`\nTest case ${i + 1}: "${testCase.content}"`);
    console.log(`Expected agent: ${testCase.expectedAgent}`);
    
    // Find best agent
    const bestAgent = findBestAgent(testCase.content, agents);
    
    if (bestAgent) {
      console.log(`Selected agent: ${bestAgent.name}`);
      
      if (bestAgent.name === testCase.expectedAgent) {
        console.log('✅ Test passed: Correct agent selected');
        successCount++;
      } else {
        console.log('❌ Test failed: Wrong agent selected');
      }
    } else {
      console.error('❌ Test failed: No agent selected');
    }
  }
  
  console.log(`\nScoring test results: ${successCount}/${testMessages.length} passed`);
  return successCount === testMessages.length;
}

// Clean up test agents
async function cleanUpTestAgents() {
  console.log('\nCleaning up test agents...');
  
  try {
    const { data: testAgents } = await supabaseUtils.supabaseAdmin
      .from('agents')
      .select('id, name')
      .like('name', 'Test_%');
    
    if (testAgents && testAgents.length > 0) {
      for (const agent of testAgents) {
        await supabaseUtils.deleteAgent(agent.id);
        console.log(`✅ Deleted test agent: ${agent.name}`);
      }
    } else {
      console.log('No test agents found to clean up');
    }
  } catch (error) {
    console.error('Error cleaning up test agents:', error);
  }
}

// Run tests
async function runTests() {
  try {
    // Create test agents
    const agents = await createTestAgents();
    
    // Test agent scoring
    const scoringSuccess = await testAgentScoring(agents);
    
    // Clean up test agents
    await cleanUpTestAgents();
    
    // Report results
    if (scoringSuccess) {
      console.log('\n✅ All orchestration tests passed!');
    } else {
      console.log('\n❌ Some orchestration tests failed');
    }
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the test suite
runTests().catch(error => {
  console.error('Tests failed with error:', error);
  process.exit(1);
}); 