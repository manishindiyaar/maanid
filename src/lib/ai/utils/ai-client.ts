/**
 * AI client utilities for interacting with language models using Anthropic Claude
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
}

/**
 * Generate a completion using Anthropic Claude API
 * @param prompt The prompt to send to the model
 * @param options Configuration options for the request
 * @returns The generated text
 */
export async function generateCompletion(
  prompt: string,
  options: CompletionOptions = {}
): Promise<string> {
  const {
    model = 'claude-3-opus-20240229',
    temperature = 0.7,
    max_tokens = 1000,
    system_prompt = 'You are a helpful assistant.'
  } = options;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      system: system_prompt,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text || '';
  } catch (error) {
    console.error('Error generating completion:', error);
    throw error;
  }
}

/**
 * Generate embeddings for a text
 * @param text The text to generate embeddings for
 * @returns Vector representation of the text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Note: As of my knowledge, Anthropic doesn't have a dedicated embeddings API
    // This is a placeholder - in a production app, you could:
    // 1. Use a different provider for embeddings (e.g., OpenAI)
    // 2. Use a local embeddings model
    // 3. Extract embeddings from Claude responses if that becomes available
    
    // For now, let's use a simplified approach to extract semantic information
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: 'You are a system that extracts semantic meaning from text. For the input text, output a comma-separated list of 20 relevant keywords and concepts that best represent the semantic meaning, ordered by importance.',
      messages: [{ role: 'user', content: text }],
    });
    
    // Convert the response to a simple vector based on words
    const keywords = response.content[0].text.split(',').map(k => k.trim().toLowerCase());
    
    // Create a simple numerical representation (not a true embedding)
    // This is just a placeholder - not suitable for production use
    const simpleVector = new Array(100).fill(0);
    keywords.forEach((word, i) => {
      const hash = hashString(word);
      const idx = hash % 100;
      simpleVector[idx] = (i + 1) / keywords.length; // Higher for more important words
    });
    
    return simpleVector;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Simple string hash function (helper for the placeholder embedding)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculate cosine similarity between two vectors
 * @param vec1 First vector
 * @param vec2 Second vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  return dotProduct / (mag1 * mag2);
}

/**
 * Analyze sentiment of a text
 * @param text The text to analyze
 * @returns Sentiment score between -1 (negative) and 1 (positive)
 */
export async function analyzeSentiment(text: string): Promise<number> {
  try {
    const prompt = `
      Analyze the sentiment of the following text and respond with a single number between -1 and 1:
      -1 means very negative sentiment
      0 means neutral sentiment
      1 means very positive sentiment
      
      Text: "${text}"
      
      Score:`;

    const response = await generateCompletion(prompt, {
      temperature: 0.3,
      system_prompt: 'You are a sentiment analysis tool. Respond only with a number between -1 and 1.',
      model: 'claude-3-haiku-20240307' // Using a smaller model for efficiency
    });

    const score = parseFloat(response.trim());
    return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 0; // Default to neutral on error
  }
}

/**
 * Classify a message into categories
 * @param text The message to classify
 * @param categories List of possible categories
 * @returns The most likely category and confidence score
 */
export async function classifyMessage(
  text: string,
  categories: string[]
): Promise<{ category: string; confidence: number }> {
  try {
    const categoriesStr = categories.join(', ');
    const prompt = `
      Classify the following message into one of these categories: ${categoriesStr}
      
      Message: "${text}"
      
      Respond with only the category name, followed by the confidence score (0-1) separated by a pipe. 
      For example: "category|0.95"`;

    const response = await generateCompletion(prompt, {
      temperature: 0.3,
      system_prompt: 'You are a text classification tool. Respond only with the category and confidence score as requested.',
      model: 'claude-3-haiku-20240307' // Using a smaller model for efficiency
    });

    const [category, confidenceStr] = response.trim().split('|');
    const confidence = parseFloat(confidenceStr);

    return {
      category: category || categories[0],
      confidence: isNaN(confidence) ? 0.5 : confidence
    };
  } catch (error) {
    console.error('Error classifying message:', error);
    return {
      category: categories[0],
      confidence: 0.5
    };
  }
}