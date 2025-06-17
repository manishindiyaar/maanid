/**
 * Test script for Supabase integration
 * Tests fetching unviewed messages and updating message status
 * Run with: node src/lib/ai/tests/test-supabase-integration.js
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

// Test data storage
const testData = {
  contactId: null,
  messageIds: []
};

// Create test data in Supabase
async function createTestData() {
  console.log('\nCreating test data in Supabase...');
  
  try {
    // Generate unique identifiers for this test run
    const testId = uuidv4().substring(0, 8);
    const contactName = `Test_Contact_${testId}`;
    const contactInfo = `test_contact_${testId}`;
    
    // Create a test contact
    console.log(`Creating test contact: ${contactName}`);
    const contact = await supabaseUtils.createContact({
      name: contactName,
      contact_info: contactInfo,
      last_contact: new Date().toISOString()
    });
    
    if (!contact) {
      console.error('❌ Failed to create test contact');
      return false;
    }
    
    testData.contactId = contact.id;
    console.log(`✅ Created test contact: ${contactName} (ID: ${contact.id})`);
    
    // Create test messages (unviewed)
    console.log('Creating test messages...');
    
    const testMessages = [
      {
        contact_id: contact.id,
        content: 'Hello, I need help with your product',
        is_viewed: false,
        is_from_customer: true,
        direction: 'incoming',
        timestamp: new Date().toISOString(),
        is_sent: true,
        is_ai_response: false,
        
      },
      {
        contact_id: contact.id,
        content: 'Can someone assist me with a technical issue?',
        is_viewed: false,
        is_from_customer: true,
        direction: 'incoming',
        timestamp: new Date().toISOString(),
        is_sent: true,
        is_ai_response: false,
       
      }
    ];
    
    for (const messageData of testMessages) {
      const message = await supabaseUtils.createMessage(messageData);
      if (message) {
        testData.messageIds.push(message.id);
        console.log(`✅ Created test message: ${message.id}`);
      } else {
        console.error('❌ Failed to create test message');
      }
    }
    
    return testData.contactId && testData.messageIds.length > 0;
  } catch (error) {
    console.error('Error creating test data:', error);
    return false;
  }
}

// Fetch unviewed messages from Supabase
async function fetchUnviewedMessages() {
  console.log('\nFetching unviewed messages...');
  
  try {
    // Fetch unviewed messages using the utility function
    const messages = await supabaseUtils.getUnviewedMessages();
    
    console.log(`✅ Fetched ${messages.length} unviewed messages`);
    
    // Display some information about the messages
    if (messages.length > 0) {
      for (let i = 0; i < Math.min(messages.length, 5); i++) {
        console.log(`Message ${i + 1}:`);
        console.log(`  Content: ${messages[i].message_content}`);
        console.log(`  Contact: ${messages[i].contact_name}`);
        console.log(`  Message ID: ${messages[i].message_id}`);
      }
    }
    
    return messages;
  } catch (error) {
    console.error('Error fetching unviewed messages:', error);
    return [];
  }
}

// Mark a message as viewed
async function markMessageAsViewed(messageId) {
  console.log(`\nMarking message ${messageId} as viewed...`);
  
  try {
    // First check the current status
    const { data: messageData, error: getError } = await supabaseUtils.supabaseAdmin
      .from('messages')
      .select('is_viewed')
      .eq('id', messageId)
      .single();
    
    if (getError) {
      console.error(`❌ Error fetching message ${messageId}:`, getError);
      return false;
    }
    
    const initialStatus = messageData.is_viewed;
    console.log(`Current is_viewed status: ${initialStatus}`);
    
    // Update the message to mark as viewed
    const success = await supabaseUtils.markMessageAsViewed(messageId);
    
    if (success) {
      console.log('✅ Message successfully marked as viewed');
      return true;
    } else {
      console.error('❌ Failed to mark message as viewed');
      return false;
    }
  } catch (error) {
    console.error(`Error marking message ${messageId} as viewed:`, error);
    return false;
  }
}

// Test processing a message from Supabase
async function processMessageFromSupabase(messageId) {
  console.log(`\nProcessing message from Supabase: ${messageId}`);
  
  try {
    // Fetch the message with contact information
    const message = await supabaseUtils.getMessageWithContact(messageId);
    
    if (!message) {
      console.error(`❌ Error fetching message ${messageId}`);
      return false;
    }
    
    // Extract contact info
    const contact = message.contacts;
    delete message.contacts;
    
    console.log('Message:', message);
    console.log('Contact:', contact);
    
    // Simulate processing by marking as viewed
    const updateSuccess = await markMessageAsViewed(messageId);
    
    if (updateSuccess) {
      console.log(`✅ Successfully processed message ${messageId}`);
      
      // Create a mock response
      const responseObj = {
        message_id: message.id,
        contact_id: message.contact_id,
        contact_name: contact.name,
        original_message: message.content,
        agent_id: 'test-agent-id',
        agent_name: 'Test Agent',
        response: 'This is a mock response',
        processed_at: new Date().toISOString()
      };
      
      console.log('Response object:', responseObj);
      return true;
    } else {
      console.error(`❌ Failed to process message ${messageId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error processing message ${messageId}:`, error);
    return false;
  }
}

// Clean up test data
async function cleanUpTestData() {
  console.log('\nCleaning up test data...');
  
  try {
    // Delete test messages
    for (const messageId of testData.messageIds) {
      const { error } = await supabaseUtils.supabaseAdmin
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) {
        console.error(`❌ Failed to delete test message ${messageId}:`, error);
      } else {
        console.log(`✅ Deleted test message: ${messageId}`);
      }
    }
    
    // Delete test contact
    if (testData.contactId) {
      const success = await supabaseUtils.deleteContact(testData.contactId);
      if (success) {
        console.log(`✅ Deleted test contact: ${testData.contactId}`);
      } else {
        console.error(`❌ Failed to delete test contact ${testData.contactId}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return false;
  }
}

// Run a full integration test
async function runFullIntegrationTest() {
  console.log('\nRunning full integration test...');
  
  try {
    // Create test data
    const dataCreated = await createTestData();
    if (!dataCreated) {
      console.error('❌ Failed to create test data, aborting test');
      return false;
    }
    
    // Test fetch unviewed messages
    const messages = await fetchUnviewedMessages();
    
    // Test marking message as viewed
    let viewSuccess = false;
    if (testData.messageIds.length > 0) {
      viewSuccess = await markMessageAsViewed(testData.messageIds[0]);
    }
    
    // Test processing a message
    let processSuccess = false;
    if (testData.messageIds.length > 1) {
      processSuccess = await processMessageFromSupabase(testData.messageIds[1]);
    }
    
    // Report results
    console.log('\nTest Results:');
    console.log(`  Create Test Data: ${dataCreated ? '✅ Passed' : '❌ Failed'}`);
    console.log(`  Fetch Unviewed Messages: ${messages.length > 0 ? '✅ Passed' : '❌ Failed'}`);
    console.log(`  Mark as Viewed: ${viewSuccess ? '✅ Passed' : '❌ Failed'}`);
    console.log(`  Process Message: ${processSuccess ? '✅ Passed' : '❌ Failed'}`);
    
    // Clean up
    await cleanUpTestData();
    
    // Overall result
    return dataCreated && messages.length > 0 && viewSuccess && processSuccess;
  } catch (error) {
    console.error('Error running full integration test:', error);
    return false;
  }
}

// Menu-driven test runner
async function runTests() {
  console.log('\nSupabase Integration Tests');
  console.log('------------------------');
  console.log('1. Create Test Data');
  console.log('2. Fetch Unviewed Messages');
  console.log('3. Mark Message as Viewed');
  console.log('4. Process Message');
  console.log('5. Clean Up Test Data');
  console.log('6. Run Full Integration Test');
  console.log('0. Exit');
  
  const readlineModule = require('readline');
  const readline = readlineModule.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\nEnter your choice: ', async (choice) => {
    try {
      switch (choice) {
        case '1':
          await createTestData();
          break;
        case '2':
          await fetchUnviewedMessages();
          break;
        case '3':
          if (testData.messageIds.length > 0) {
            await markMessageAsViewed(testData.messageIds[0]);
          } else {
            console.log('No test messages available. Please create test data first.');
          }
          break;
        case '4':
          if (testData.messageIds.length > 0) {
            await processMessageFromSupabase(testData.messageIds[0]);
          } else {
            console.log('No test messages available. Please create test data first.');
          }
          break;
        case '5':
          await cleanUpTestData();
          break;
        case '6':
          const success = await runFullIntegrationTest();
          console.log(success ? '\n✅ Full integration test passed!' : '\n❌ Full integration test failed!');
          break;
        case '0':
          console.log('Exiting...');
          break;
        default:
          console.log('Invalid choice');
      }
      
      readline.close();
      
      if (choice !== '0' && choice !== '5' && choice !== '6') {
        // Ask if user wants to clean up test data
        const cleanupReadline = readlineModule.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        cleanupReadline.question('\nDo you want to clean up test data? (y/n): ', async (answer) => {
          if (answer.toLowerCase() === 'y') {
            await cleanUpTestData();
          }
          cleanupReadline.close();
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    } catch (error) {
      console.error('Error running tests:', error);
      readline.close();
      process.exit(1);
    }
  });
}

// Run the test suite
runTests().catch(error => {
  console.error('Tests failed with error:', error);
  cleanUpTestData().finally(() => process.exit(1));
}); 