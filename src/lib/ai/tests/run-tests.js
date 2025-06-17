/**
 * Test runner for the AI orchestration system
 * Runs all the test scripts in the tests directory
 * Run with: node src/lib/ai/tests/run-tests.js
 */

// Import required modules
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');
const config = require('../utils/env-config');

// Check environment variables using the config utility
console.log('Environment file path:', config.envPath);
console.log('Checking environment variables:');
if (!config.checkRequiredVars()) {
  process.exit(1);
}

// Available test scripts
const testScripts = [
  {
    name: 'Orchestration Test',
    file: 'test-orchestration.js',
    description: 'Tests agent scoring and message routing functionality'
  },
  {
    name: 'Response Generation Test',
    file: 'test-response-generation.js',
    description: 'Tests generating responses using AI agents'
  },
  {
    name: 'Supabase Integration Test',
    file: 'test-supabase-integration.js',
    description: 'Tests fetching unviewed messages and updating message status'
  },
  {
    name: 'Process Unviewed API Test',
    file: 'test-process-unviewed.js',
    description: 'Tests the process-unviewed API endpoint with dummy data'
  }
];

// Run a single test script
function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning test: ${testFile}`);
    
    const testPath = path.join(__dirname, testFile);
    
    // Check if the test file exists
    if (!fs.existsSync(testPath)) {
      console.error(`❌ Test file not found: ${testPath}`);
      return resolve(false);
    }
    
    // Spawn the test process
    const testProcess = spawn('node', [testPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env } // Pass the environment variables to child process
    });
    
    // Pipe output
    testProcess.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    testProcess.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    
    // Handle input if needed
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    testProcess.stdin.on('data', (data) => {
      rl.question(data.toString(), (answer) => {
        testProcess.stdin.write(answer + '\n');
      });
    });
    
    // Handle process exit
    testProcess.on('exit', (code) => {
      rl.close();
      if (code === 0) {
        console.log(`✅ Test passed: ${testFile}`);
        resolve(true);
      } else {
        console.error(`❌ Test failed with code ${code}: ${testFile}`);
        resolve(false);
      }
    });
    
    testProcess.on('error', (error) => {
      rl.close();
      console.error(`❌ Error running test ${testFile}:`, error);
      resolve(false);
    });
  });
}

// Run all tests in sequence
async function runAllTests() {
  console.log('\nRunning all tests...');
  
  const results = [];
  
  for (const test of testScripts) {
    const result = await runTest(test.file);
    results.push({ name: test.name, success: result });
  }
  
  // Display results
  console.log('\nTest Results:');
  console.log('=============');
  
  for (const result of results) {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  }
  
  // Overall result
  const allPassed = results.every(result => result.success);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n❌ Some tests failed.');
    
    // List failed tests
    const failedTests = results.filter(result => !result.success);
    console.log('Failed tests:');
    for (const test of failedTests) {
      console.log(`- ${test.name}`);
    }
  }
  
  return allPassed;
}

// Display menu and handle user choice
function showMenu() {
  console.log('\nAI Orchestration Test Runner');
  console.log('===========================');
  
  // Display available tests
  for (let i = 0; i < testScripts.length; i++) {
    console.log(`${i + 1}. ${testScripts[i].name} - ${testScripts[i].description}`);
  }
  
  console.log(`${testScripts.length + 1}. Run all tests`);
  console.log('0. Exit');
  
  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Get user choice
  rl.question('\nEnter your choice: ', async (choice) => {
    const choiceIndex = parseInt(choice) - 1;
    
    try {
      if (choice === '0') {
        console.log('Exiting...');
        rl.close();
        return;
      } else if (choiceIndex >= 0 && choiceIndex < testScripts.length) {
        // Run a specific test
        rl.close();
        await runTest(testScripts[choiceIndex].file);
      } else if (parseInt(choice) === testScripts.length + 1) {
        // Run all tests
        rl.close();
        await runAllTests();
      } else {
        console.log('Invalid choice. Please try again.');
        rl.close();
        showMenu();
      }
    } catch (error) {
      console.error('Error running test:', error);
      rl.close();
      process.exit(1);
    }
  });
}

// Main function
async function main() {
  try {
    showMenu();
  } catch (error) {
    console.error('Error in test runner:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 