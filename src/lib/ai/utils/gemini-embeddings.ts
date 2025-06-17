/**
 * Gemini Embeddings Provider
 * Uses Google's Generative AI for text embeddings
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google AI client with API key
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);


const embeddingModel = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });

/**
 * Generate embeddings using Google's Gemini API
 * @param text - The text to generate embeddings for
 * @returns A vector of numbers representing the embedding
 */
export async function generateGeminiEmbedding(text: string): Promise<number[]> {
  try {
    console.log('[Gemini Embeddings] Generating embedding using gemini-embedding-exp-03-07 model');
    console.log(`[Gemini Embeddings] Input text length: ${text.length} characters`);
    
    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding.values;
    
    console.log(`[Gemini Embeddings] Generated embedding with ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error('[Gemini Embeddings] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate a simple embedding for text as a fallback
 * This is less accurate but can be used when the main embedding generation fails
 * 
 * @param text - The text to generate a simple embedding for
 * @returns A vector of numbers representing a simple embedding
 */
export function generateSimpleEmbedding(text: string): number[] {
  console.log('Using fallback simple embedding generation');
  
  // Initialize a vector of the right dimension (1536 for text-embedding-004-large)
  const vector = new Array(1536).fill(0);
  
  // Extract important words and phrases
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  
  // Fill the vector with hashed values based on words
  words.forEach((word, index) => {
    const hash = hashString(word);
    const position = Math.abs(hash) % 1536;
    const value = (index + 1) / (words.length + 1); // Normalize to 0-1 range
    vector[position] = value;
  });
  
  return vector;
}

/**
 * Calculate a hash for a string (helper function)
 * @param str - The string to hash
 * @returns A number hash
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
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  console.log('[Cosine Similarity] Starting similarity calculation');
  
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b)) {
    console.warn('[Cosine Similarity] Invalid vectors provided');
    return 0;
  }

  if (a.length !== b.length) {
    console.warn(`[Cosine Similarity] Vector dimension mismatch: a=${a.length}, b=${b.length}`);
    return 0;
  }

  if (a.length === 0 || b.length === 0) {
    console.warn('[Cosine Similarity] Empty vectors provided');
    return 0;
  }

  // Calculate dot product
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  console.log(`[Cosine Similarity] Dot product: ${dotProduct}`);
  
  // Calculate magnitudes
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  console.log(`[Cosine Similarity] Magnitudes: a=${magnitudeA}, b=${magnitudeB}`);
  
  // Handle division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    console.warn('[Cosine Similarity] Zero magnitude vector detected');
    return 0;
  }
  
  // Calculate cosine similarity
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  console.log(`[Cosine Similarity] Raw similarity score: ${similarity}`);
  
  // Ensure the result is between -1 and 1
  const normalizedSimilarity = Math.max(-1, Math.min(1, similarity));
  console.log(`[Cosine Similarity] Final normalized score: ${normalizedSimilarity}`);
  
  return normalizedSimilarity;
}

// Default export for use as main embedding provider
export default generateGeminiEmbedding; 