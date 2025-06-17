/**
 * Interactive test for memory system
 * 
 * Run this script to test the memory system without a web server
 * Usage: npx ts-node src/app/api/memory/interactive-test.ts
 */

import readline from 'readline';
import { 
  processMemory, 
  retrieveMemories, 
  formatMemoryContext,
  extractMemories,
  Memory
} from './memoryService.js';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test user ID - if not specified, will prompt
let TEST_USER_ID = '';

/**
 * Main interactive test
 */
async function runInteractiveTest() {
  if (!TEST_USER_ID) {
    TEST_USER_ID = await prompt('Enter a test user ID (UUID format): ');
  }
  
  console.log(`\n=== Memory System Interactive Test ===`);
  console.log(`Using User ID: ${TEST_USER_ID}`);
  
  // Menu loop
  while (true) {
    console.log('\nOptions:');
    console.log('1. Add a test memory from text');
    console.log('2. Query memories');
    console.log('3. Extract memories from text (without saving)');
    console.log('0. Exit');
    
    const option = await prompt('\nSelect an option: ');
    
    switch (option) {
      case '1':
        await addTestMemory();
        break;
      case '2':
        await queryMemories();
        break;
      case '3':
        await testMemoryExtraction();
        break;
      case '0':
        rl.close();
        console.log('Exiting...');
        return;
      default:
        console.log('Invalid option, please try again.');
    }
  }
}

/**
 * Add a test memory
 */
async function addTestMemory() {
  const message = await prompt('\nEnter message to store: ');
  
  console.log('\nProcessing message...');
  const result = await processMemory(message, TEST_USER_ID);
  
  console.log(`\nMemory processing complete. Stored ${result.length} memories.`);
  if (result.length > 0) {
    console.log(`Memory IDs: ${result.join(', ')}`);
  } else {
    console.log('No memories were extracted from this message.');
  }
}

/**
 * Query memories
 */
async function queryMemories() {
  const query = await prompt('\nEnter search query: ');
  
  console.log('\nRetrieving memories...');
  const result = await retrieveMemories(TEST_USER_ID, query);
  
  console.log(`\nFound ${result.memories.length} memories.`);
  
  if (result.memories.length > 0) {
    console.log('\n=== Memory Results ===');
    result.memories.forEach((memory, index) => {
      const mem = memory as Memory;
      console.log(`\n[${index + 1}] ${mem.content}`);
      console.log(`Memory data: ${JSON.stringify(mem.memory_data)}`);
      console.log(`Similarity: ${mem.similarity !== undefined ? mem.similarity.toFixed(4) : 'N/A'}`);
      console.log(`Created: ${mem.created_at}`);
    });
    
    console.log('\n=== Formatted Context ===');
    console.log(formatMemoryContext(result));
  }
}

/**
 * Test memory extraction without saving
 */
async function testMemoryExtraction() {
  const message = await prompt('\nEnter message to analyze: ');
  
  console.log('\nExtracting memories...');
  const memories = await extractMemories(message, TEST_USER_ID);
  
  console.log(`\nExtracted ${memories.length} memories.`);
  
  if (memories.length > 0) {
    console.log('\n=== Extracted Memories ===');
    memories.forEach((memory, index) => {
      console.log(`\n[${index + 1}] ${memory.content}`);
      console.log(`Memory data: ${JSON.stringify(memory.memory_data)}`);
    });
  }
}

/**
 * Helper function to prompt the user
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Start the test
runInteractiveTest().catch(error => {
  console.error('Error in test:', error);
  rl.close();
}); 