/**
 * Test script for the process-unviewed API endpoint
 * Tests the complete flow from unviewed messages to processed responses
 * Run with: node src/lib/ai/tests/test-process-unviewed.js
 */

// Import required modules
const dotenv = require('dotenv');
const path = require('path');
const fetch = require('node-fetch');
const { Orchestrator } = require('../orchestration/orchestrator');
const config = require('../utils/env-config');
const { v4: uuidv4 } = require('uuid');

// Check environment variables
console.log('Environment file path:', config.envPath);
config.checkRequiredVars();

/**
 * Dummy test data - unviewed messages
 * Structure aligns with the schema.sql get_unseen_messages() function:
 * - contact_id UUID
 * - contact_name TEXT
 * - contact_info TEXT
 * - message_id UUID
 * - message_content TEXT
 * - message_timestamp TIMESTAMPTZ
 * - is_from_customer BOOLEAN
 */
const dummyMessages = [
  {
    message_id: `test-msg-${uuidv4()}`,
    message_content: 'I need help with my technical issue, my computer won\'t start',
    contact_id: `test-contact-${uuidv4()}`,
    contact_name: 'Test Customer 1',
    contact_info: 'customer1@example.com',
    message_timestamp: new Date().toISOString(),
    is_from_customer: true,
    expected_agent: 'Support Agent'
  },
  {
    message_id: `test-msg-${uuidv4()}`,
    message_content: 'What is the price of your premium plan? Do you offer any discounts?',
    contact_id: `test-contact-${uuidv4()}`,
    contact_name: 'Test Customer 2',
    contact_info: 'customer2@example.com',
    message_timestamp: new Date().toISOString(),
    is_from_customer: true,
    expected_agent: 'Sales Agent'
  },
  {
    message_id: `test-msg-${uuidv4()}`,
    message_content: 'Can you tell me about your company and what services you offer?',
    contact_id: `test-contact-${uuidv4()}`,
    contact_name: 'Test Customer 3',
    contact_info: 'customer3@example.com',
    message_timestamp: new Date().toISOString(),
    is_from_customer: true,
    expected_agent: 'General Agent'
  }
];

/**
 * Test the process-unviewed functionality directly with the Orchestrator
 */
async function testDirectOrchestration() {
  console.log('\n=== Testing Direct Orchestration ===');
  
  try {
    // Create and initialize orchestrator
    const orchestrator = new Orchestrator();
    await orchestrator.initialize();
    
    console.log('Orchestrator initialized successfully');
    
    // Process each dummy message
    for (const message of dummyMessages) {
      console.log(`\nProcessing message: "${message.message_content}"`);
      
      // Format message for orchestrator according to the messages table schema
      const messageData = {
        id: message.message_id,
        content: message.message_content,
        contact_id: message.contact_id,
        timestamp: message.message_timestamp,
        is_viewed: false,
        direction: 'incoming',
        is_ai_response: false,
        is_from_customer: true,
        is_sent: true,
        status: 'pending',
        metadata: {
          contact_name: message.contact_name,
          contact_info: message.contact_info
        }
      };
      
      // Process message
      const result = await orchestrator.processMessage(messageData);
      
      // Log result
      console.log('Processing result:');
      console.log(`- Success: ${result.success}`);
      console.log(`- Agent: ${result.agent_id ? (typeof result.agent_id === 'object' ? result.agent_id.name : result.agent_id) : 'Unknown'}`);
      console.log(`- Message: ${result.message || ''}`);
      
      // Validate result
      if (result.success) {
        console.log('✅ Message processed successfully');
      } else {
        console.log('❌ Failed to process message');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in direct orchestration test:', error);
    return false;
  }
}

/**
 * Mock function to simulate the behavior of the process-unviewed API
 * Aligns with the schema of agents, messages, and contacts tables
 */
async function testMockProcessUnviewedAPI(testData) {
  console.log('\n=== Testing Mock Process-Unviewed API ===');
  const orchestrator = await setupTestOrchestration();

  const results = [];
  
  for (const test of testData) {
    console.log(`\nProcessing message: "${test.content}"`);
    
    // Process the message with the orchestrator
    const result = await orchestrator.processMessage({
      id: test.id,
      contact_id: test.contact_id,
      content: test.content,
      timestamp: new Date().toISOString(),
      direction: 'incoming',
      is_ai_response: false,
      is_from_customer: true,
      is_sent: true,
      is_viewed: false,
      status: 'pending'
    });
    
    // Mock the API response by formatting it like the real API
    const apiResponse = {
      message_id: test.id,
      contact_id: test.contact_id,
      contact_name: test.contact_name,
      contact_info: test.contact_info,
      original_message: test.content,
      agent_name: result.data?.agent_name || (typeof result.agent_id === 'string' ? 
                    result.agent_id.substring(0, 4) + ' Agent' : 'AI Assistant'),
      agent_id: typeof result.agent_id === 'string' ? result.agent_id : '',
      agent_description: '',
      response: result.message || result.data?.response || '',
      success: result.success,
      confidence: result.confidence || 0,
      processed_at: new Date().toISOString()
    };
    
    console.log('API response for message:');
    console.log(apiResponse);
    
    // Determine expected agent type based on message content
    let expectedAgentType = 'General Agent';
    if (test.content.toLowerCase().includes('technical') || test.content.toLowerCase().includes('computer')) {
      expectedAgentType = 'Support Agent';
    } else if (test.content.toLowerCase().includes('price') || test.content.toLowerCase().includes('discount')) {
      expectedAgentType = 'Sales Agent';
    } else if (test.content.toLowerCase().includes('job') || test.content.toLowerCase().includes('waiter')) {
      expectedAgentType = 'Job Agent';
    }
    
    // Log the agent type
    console.log(`${apiResponse.agent_name === expectedAgentType ? '✅' : '❓'} Message routed to ${apiResponse.agent_name}, expected ${expectedAgentType}`);
    
    // Check if we got a response
    if (!apiResponse.response) {
      console.warn('⚠️ No response generated for message');
    } else {
      console.log(`✅ Response generated: "${apiResponse.response.substring(0, 50)}${apiResponse.response.length > 50 ? '...' : ''}"`);
    }
    
    results.push(apiResponse);
  }
  
  return results;
}

/**
 * Test the messaging-panel's handling of API responses
 */
function testMessagingPanelHandling(processedResults) {
  console.log('\n=== Testing Messaging Panel Handling ===');
  
  if (!processedResults.length) {
    console.error('❌ No processed results to test');
    return false;
  }
  
  console.log(`Found ${processedResults.length} processed messages`);
  
  // Mock the transformation that would happen in the messaging panel
  const transformedMessages = processedResults.map(result => ({
    id: result.message_id,
    customerName: result.contact_name,
    avatar: '',
    message: result.original_message,
    timestamp: new Date(),
    status: 'completed',
    contactId: result.contact_id,
    contactInfo: result.contact_info,
    agentName: result.agent_name,
    agentDescription: result.agent_description,
    response: result.response,
    processingStage: {
      stage: 'completed',
      details: `Response sent by ${result.agent_name}`
    }
  }));
  
  console.log('Sample message as it would appear in UI:');
  console.log(transformedMessages[0]);
  
  // Log if responses are missing
  const missingResponses = transformedMessages.filter(m => !m.response);
  if (missingResponses.length > 0) {
    console.warn(`⚠️ ${missingResponses.length} messages are missing responses`);
  }
  
  return true;
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('Starting process-unviewed API tests with dummy data...');
    
    // Test direct orchestration
    const directResult = await testDirectOrchestration();
    
    // Test mock API
    const mockApiResult = await testMockProcessUnviewedAPI(dummyMessages);
    
    // Test messaging panel handling
    const panelResult = testMessagingPanelHandling(mockApiResult);
    
    // Report results
    console.log('\n=== Test Results ===');
    console.log(`Direct Orchestration: ${directResult ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Mock API: ${mockApiResult.success ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Messaging Panel Handling: ${panelResult ? '✅ Passed' : '❌ Failed'}`);
    
    if (directResult && mockApiResult.success && panelResult) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n❌ Some tests failed');
    }
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Tests failed with error:', error);
  process.exit(1);
}); 