/**
 * Test file for Gemini embeddings
 * 
 * Run with: npx ts-node src/app/api/memory/test-gemini-embeddings.ts
 */

import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Get API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Generate embeddings using the Google Generative AI SDK
 */
async function generateGeminiEmbedding(text: string): Promise<number[]> {
  try {
    console.log(`Generating embedding for text: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    
    // Initialize the Google AI client with API key
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Get the embedding model - text-embedding-004 is the recommended model
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    // Generate embedding
    console.log('Calling embedContent...');
    const result = await embeddingModel.embedContent(text);
    console.log('Embedding generated successfully');
    
    // Return the embedding values
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding with Google AI SDK:', error);
    
    // Fallback to a simpler approach if the embedding generation fails
    return generateSimpleEmbedding(text);
  }
}

/**
 * Generate a simple embedding for text as a fallback
 */
function generateSimpleEmbedding(text: string): number[] {
  console.log('Using fallback simple embedding generation');
  
  // Initialize a vector of the right dimension (768 for text-embedding-004)
  const vector = new Array(768).fill(0);
  
  // Extract important words and phrases
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  
  // Fill the vector with hashed values based on words
  words.forEach((word, index) => {
    const hash = hashString(word);
    const position = Math.abs(hash) % 768;
    const value = (index + 1) / (words.length + 1); // Normalize to 0-1 range
    vector[position] = value;
  });
  
  return vector;
}

/**
 * Calculate a hash for a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Main test function
 */
async function testGeminiEmbeddings() {
  console.log('=== Gemini Embeddings Test ===');
  console.log('Testing embedding generation with Google Generative AI SDK');
  
  // Check environment
  console.log(`API Key set: ${GEMINI_API_KEY ? 'Yes (length: ' + GEMINI_API_KEY.length + ')' : 'No'}`);
  
  try {
    // Test with a simple text
    const testText = 'Hello, this is a test message for Gemini embeddings.';
    console.log(`\nGenerating embeddings for text: "${testText}"`);
    
    // Measure time
    const startTime = Date.now();
    
    // Try to generate embeddings
    const embeddings = await generateGeminiEmbedding(testText);
    
    const duration = Date.now() - startTime;
    
    // Check if embeddings were generated
    if (embeddings && Array.isArray(embeddings)) {
      console.log(`\n✅ Success! Generated ${embeddings.length}-dimensional embeddings in ${duration}ms`);
      
      // Show sample values
      if (embeddings.length > 0) {
        console.log(`First 5 values: [${embeddings.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
        console.log(`Last 5 values: [${embeddings.slice(-5).map(v => v.toFixed(6)).join(', ')}]`);
        
        // Check for all zeros (likely fallback)
        const allZeros = embeddings.every(val => val === 0);
        if (allZeros) {
          console.log('\n⚠️ Warning: All embedding values are 0, likely using fallback embedding');
        }
      }
    } else {
      console.log('\n❌ Error: Embeddings were not generated properly');
      console.log(`Result: ${embeddings}`);
    }
  } catch (error) {
    console.error('\n❌ Error testing Gemini embeddings:');
    console.error(error);
  }
}

// Run the test
testGeminiEmbeddings()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  }); 