/**
 * Test script for response generation
 * Tests the ability to generate responses using AI agents
 * Run with: node src/lib/ai/tests/test-response-generation.js
 */

// Import required modules
const config = require('../utils/env-config');
const supabaseUtils = require('../utils/supabase-client');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');

// Check environment variables
console.log('Environment file path:', config.envPath);
console.log('Checking environment variables:');
if (!config.checkRequiredVars()) {
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

// Test agent data
const testAgent = {
  name: 'Test_ResponseAgent',
  description: 'A test agent for response generation that specializes in customer support and technical assistance.',
  type: 'llm',
  priority: 'medium',
  enabled: true,
  model: 'claude-3-haiku-20240307'
};

// Test messages
const testMessages = [
  {
    id: `test-message-id-1-${uuidv4()}`,
    content: 'Can you help me reset my password?',
    contact_id: 'test-contact-id',
    contact_name: 'Test User 1'
  },
  {
    id: `test-message-id-2-${uuidv4()}`,
    content: 'I\'m having trouble with your mobile app. It keeps crashing when I open it.',
    contact_id: 'test-contact-id',
    contact_name: 'Test User 2'
  },
  {
    id: `test-message-id-3-${uuidv4()}`,
    content: 'What are your business hours?',
    contact_id: 'test-contact-id',
    contact_name: 'Test User 3'
  }
];

// Create test agent
async function createTestAgent() {
  console.log('\nCreating test agent for response generation...');
  
  try {
    // First, delete existing test response agent
    const { data: existingAgents } = await supabaseUtils.supabaseAdmin
      .from('agents')
      .select('id, name')
      .eq('name', 'Test_ResponseAgent');
    
    if (existingAgents && existingAgents.length > 0) {
      console.log(`Found ${existingAgents.length} existing test agents to delete`);
      
      for (const agent of existingAgents) {
        await supabaseUtils.deleteAgent(agent.id);
        console.log(`✅ Deleted existing test agent: ${agent.name}`);
      }
    }
    
    // Create new test agent
    const agent = await supabaseUtils.createAgent(testAgent);
    if (agent) {
      console.log(`✅ Created test agent: ${agent.name}`);
      return agent;
    } else {
      console.error(`❌ Failed to create test agent ${testAgent.name}`);
      return null;
    }
  } catch (error) {
    console.error('Error creating test agent:', error);
    return null;
  }
}

// Generate response using Claude API
async function generateResponse(message, agent) {
  console.log(`Generating response for message: "${message.content}"`);
  
  try {
    // Create system prompt using agent information
    const systemPrompt = `You are ${agent.name}. ${agent.description || ''}
    
    Respond in 5 words.
    Do not use buzzwords.
    Response should be in whatsapp writing style.
    (Do not become smart)
    `;
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: agent.model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message.content }
      ]
    });
    
    // Extract response text
    const responseText = response.content[0].text;
    console.log(`Generated response: "${responseText}"`);
    
    return responseText;
  } catch (error) {
    console.error('Error generating response:', error);
    return `Error: ${error.message}`;
  }
}

// Test response generation
async function testResponseGeneration(agent) {
  console.log('\nTesting response generation...');
  
  if (!agent) {
    console.error('❌ No test agent available for response generation test');
    return false;
  }
  
  console.log(`Using test agent: ${agent.name}`);
  let successCount = 0;
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\nTest message ${i + 1}: "${message.content}"`);
    
    try {
      // Generate response
      const response = await generateResponse(message, agent);
      
      // Validate response
      if (response && response.length > 0 && !response.startsWith('Error:')) {
        console.log('✅ Response generated successfully');
        successCount++;
      } else {
        console.error('❌ Failed to generate a valid response');
      }
    } catch (error) {
      console.error('❌ Error in response generation test:', error);
    }
  }
  
  console.log(`\nResponse generation test results: ${successCount}/${testMessages.length} passed`);
  return successCount === testMessages.length;
}

// Test the full message flow
async function testFullMessageFlow(agent) {
  console.log('\nTesting full message flow...');
  
  if (!agent) {
    console.error('❌ No test agent available for full message flow test');
    return false;
  }
  
  // Create a test message
  const testMessage = {
    id: `test-flow-message-id-${uuidv4()}`,
    content: 'I need help with my recent purchase. The product arrived damaged.',
    contact_id: 'test-contact-id',
    contact_name: 'Test Flow User'
  };
  
  console.log(`Test message: "${testMessage.content}"`);
  
  try {
    // Generate a response
    const response = await generateResponse(testMessage, agent);
    
    // Validate that we have both an agent name and a response
    if (agent.name && response && response.length > 0 && !response.startsWith('Error:')) {
      console.log('✅ Full message flow passed');
      
      // Build the expected response object that would be sent to the client
      const result = {
        message_id: testMessage.id,
        contact_id: testMessage.contact_id,
        contact_name: testMessage.contact_name,
        original_message: testMessage.content,
        agent_id: agent.id,
        agent_name: agent.name,
        response: response,
        processed_at: new Date().toISOString()
      };
      
      console.log('Response object structure:', JSON.stringify(result, null, 2));
      return true;
    } else {
      console.error('❌ Missing agent name or valid response');
      return false;
    }
  } catch (error) {
    console.error('❌ Error in full message flow test:', error);
    return false;
  }
}

// Clean up test agent
async function cleanUpTestAgent() {
  console.log('\nCleaning up test agent...');
  
  try {
    const { data: testAgents } = await supabaseUtils.supabaseAdmin
      .from('agents')
      .select('id, name')
      .eq('name', 'Test_ResponseAgent');
    
    if (testAgents && testAgents.length > 0) {
      for (const agent of testAgents) {
        await supabaseUtils.deleteAgent(agent.id);
        console.log(`✅ Deleted test agent: ${agent.name}`);
      }
    } else {
      console.log('No test agent found to clean up');
    }
  } catch (error) {
    console.error('Error cleaning up test agent:', error);
  }
}

// Run all tests
async function runTests() {
  try {
    // Create test agent
    const agent = await createTestAgent();
    
    if (agent) {
      // Test response generation
      const responseSuccess = await testResponseGeneration(agent);
      
      // Test full message flow
      const flowSuccess = await testFullMessageFlow(agent);
      
      // Clean up
      await cleanUpTestAgent();
      
      // Report results
      if (responseSuccess && flowSuccess) {
        console.log('\n✅ All response generation tests passed!');
      } else {
        console.log('\n❌ Some response generation tests failed');
      }
    } else {
      console.error('\n❌ Failed to create test agent, cannot run tests');
    }
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the test suite
runTests().catch(error => {
  console.error('Tests failed with error:', error);
  cleanUpTestAgent().finally(() => process.exit(1));
}); 