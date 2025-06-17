import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

/**
 * Generate embeddings for text using Anthropic's Claude model
 * Uses the latest Claude model to extract embeddings
 * 
 * @param text - The text to generate embeddings for
 * @returns A vector of numbers representing the embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use Claude 3 Haiku for better efficiency
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: `You are an embedding extraction system. 
      Extract a numerical embedding vector (1536 dimensions) that captures the semantic meaning of the input text.
      Output ONLY a JSON array of 1536 floating point numbers between -1 and 1.`,
      messages: [{ role: 'user', content: `Generate embedding for: "${text}"` }],
    });

    const content = response.content[0].text;
    
    // Extract the JSON array from the response - modify regex to avoid using 's' flag
    const jsonMatch = content.match(/\[([\s\S]*)\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract embedding vector from response');
    }
    
    try {
      // Parse the extracted JSON
      const vector = JSON.parse(jsonMatch[0]);
      
      // Validate the vector format
      if (!Array.isArray(vector) || vector.length !== 1536 || vector.some(v => typeof v !== 'number')) {
        throw new Error('Invalid embedding vector format or dimension');
      }
      
      return vector;
    } catch (parseError) {
      console.error('Error parsing embedding vector:', parseError);
      throw new Error('Failed to parse embedding vector');
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    // Fallback to a simpler approach if the embedding generation fails
    return generateSimpleEmbedding(text);
  }
}

/**
 * Generate a simple embedding for text as a fallback
 * This is less accurate but can be used when the main embedding generation fails
 * 
 * @param text - The text to generate a simple embedding for
 * @returns A vector of numbers representing a simple embedding
 */
function generateSimpleEmbedding(text: string): number[] {
  console.log('Using fallback simple embedding generation');
  
  // Initialize a vector of the right dimension
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
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
} 