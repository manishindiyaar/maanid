/**
 * Document service for retrieving and managing agent documents
 */
import { supabase } from '../../supabase/client';
import generateGeminiEmbedding, { cosineSimilarity } from './gemini-embeddings';

// Define document types
export interface AgentDocument {
  id: string;
  agent_id: string;
  filename: string;
  tag: string;
  content: string;
  vector?: number[];
  created_at: string;
  updated_at: string;
  similarity?: number;
  context?: string;
}

/**
 * Retrieve document content by tag
 * This can be used in agent prompts to reference specific knowledge
 * 
 * @param agentId - Agent ID to retrieve documents for
 * @param tag - Tag to search for
 * @returns Document content or empty string if not found
 */
export async function getDocumentByTag(agentId: string, tag: string): Promise<string> {
  try {
    console.log(`Retrieving document with tag '${tag}' for agent ${agentId}`);
    
    // Search for the document with the exact tag
    const { data, error } = await supabase
      .from('agent_documents')
      .select('content')
      .eq('agent_id', agentId)
      .eq('tag', tag)
      .limit(1);
    
    if (error) {
      console.error('Error retrieving document by tag:', error);
      return '';
    }
    
    if (data && data.length > 0 && data[0].content) {
      return data[0].content;
    }
    
    return '';
  } catch (error) {
    console.error('Error in getDocumentByTag:', error);
    return '';
  }
}

/**
 * Query documents using semantic search
 * 
 * @param agentId - Agent ID to query documents for
 * @param query - Query text to search for
 * @param limit - Maximum number of results to return
 * @returns Array of matching documents with similarity scores
 */
export async function queryDocuments(
  agentId: string,
  query: string,
  limit: number = 3
): Promise<AgentDocument[]> {
  try {
    console.log(`[Document Service] Querying documents for agent ${agentId} with query: "${query}"`);
    
    // Generate embedding for the query
    console.log('[Document Service] Generating query embedding using Gemini text-embedding-004');
    const queryVector = await generateGeminiEmbedding(query);
    console.log(`[Document Service] Generated query vector with ${queryVector.length} dimensions`);
    
    // Use supabase's vector similarity search function
    const { data, error } = await supabase.rpc(
      'match_agent_documents',
      {
        query_vector: queryVector,
        agent_id_filter: agentId,
        match_threshold: 0.3,
        match_limit: limit
      }
    );
    
    if (error) {
      console.error('[Document Service] Error performing vector search:', error);
      
      // Fall back to client-side similarity search if RPC fails
      return fallbackQueryDocuments(agentId, query, queryVector, limit);
    }
    
    if (!data || data.length === 0) {
      console.log('[Document Service] No documents found with similarity search');
      return [];
    }
    
    console.log(`[Document Service] Found ${data.length} documents with similarity search`);
    
    // Process results to add context
    const results = data.map((doc: any) => {
      // Get relevant context from the document content
      const content = doc.content || '';
      const context = extractRelevantContext(content, query);
      
      return {
        ...doc,
        context
      };
    });
    
    return results;
  } catch (error) {
    console.error('[Document Service] Error in queryDocuments:', error);
    return [];
  }
}

/**
 * Fallback query method for when the RPC call fails
 * Uses client-side vector similarity calculation
 */
async function fallbackQueryDocuments(
  agentId: string,
  query: string,
  queryVector: number[],
  limit: number = 3
): Promise<AgentDocument[]> {
  console.log('[Document Service] Using fallback document query method');
  
  // Fetch all documents for the agent
  const { data, error } = await supabase
    .from('agent_documents')
    .select('*')
    .eq('agent_id', agentId);
  
  if (error) {
    console.error('[Document Service] Error fetching agent documents:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('[Document Service] No documents found for agent');
    return [];
  }
  
  console.log(`[Document Service] Found ${data.length} documents to compare against`);
  
  // Calculate similarity for each document
  const scoredDocuments = data.map((doc) => {
    if (!doc.vector) {
      console.log(`[Document Service] Document ${doc.id} has no vector, skipping similarity calculation`);
      return { ...doc, similarity: 0 };
    }
    
    try {
      // Validate vector dimensions
      if (doc.vector.length !== queryVector.length) {
        console.warn(`[Document Service] Vector dimension mismatch: query=${queryVector.length}, doc=${doc.vector.length}`);
        return { ...doc, similarity: 0 };
      }
      
      console.log(`[Document Service] Calculating cosine similarity for document ${doc.id}`);
      const similarity = cosineSimilarity(queryVector, doc.vector);
      console.log(`[Document Service] Document ${doc.id} similarity score: ${similarity}`);
      
      // Get relevant context from the document content
      const content = doc.content || '';
      const context = extractRelevantContext(content, query);
      
      return { 
        ...doc, 
        similarity,
        context
      };
    } catch (error) {
      console.error('[Document Service] Error calculating similarity:', error);
      return { ...doc, similarity: 0 };
    }
  });
  
  // Sort by similarity and take the top results
  const results = scoredDocuments
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, limit);
  
  console.log(`[Document Service] Returning top ${results.length} most similar documents`);
  return results;
}

// Helper function to extract relevant context from document content
function extractRelevantContext(content: string, query: string): string {
  // Split content into sentences
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  
  // Find sentences that contain query terms
  const queryTerms = query.toLowerCase().split(/\s+/);
  const relevantSentences = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return queryTerms.some(term => lowerSentence.includes(term));
  });
  
  // If no exact matches, find sentences with similar terms
  if (relevantSentences.length === 0) {
    const similarSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return queryTerms.some(term => 
        lowerSentence.includes(term.substring(0, term.length - 1)) || // Match without last character
        lowerSentence.includes(term + 's') || // Match plural
        lowerSentence.includes(term + 'ing') // Match gerund
      );
    });
    
    if (similarSentences.length > 0) {
      return similarSentences.join('. ') + '.';
    }
  }
  
  // Return the most relevant sentences or a portion of the content
  if (relevantSentences.length > 0) {
    return relevantSentences.join('. ') + '.';
  } else {
    // If no matches, return the first few sentences
    return sentences.slice(0, 3).join('. ') + '.';
  }
}

/**
 * Format document results into a text context for agent prompts
 * 
 * @param documents - Array of documents to format
 * @returns Formatted text context
 */
export function formatDocumentContext(documents: AgentDocument[]): string {
  if (!documents || documents.length === 0) {
    return '';
  }
  
  let context = 'Knowledge from uploaded documents:\n\n';
  
  documents.forEach((doc, index) => {
    context += `${index + 1}. [${doc.tag}] ${doc.filename}\n`;
    
    // Truncate content if it's too long
    const maxContentLength = 1000;
    let content = doc.content;
    
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + '... (truncated)';
    }
    
    context += `Content: ${content}\n\n`;
  });
  
  return context;
}

/**
 * Process document tags in an agent description
 * Replaces {tag} references with actual document content
 * 
 * @param agentId - Agent ID to process documents for
 * @param text - Text containing tag references
 * @returns Processed text with tag references replaced
 */
export async function processDocumentTags(agentId: string, text: string): Promise<string> {
  if (!text || !agentId) {
    return text;
  }
  
  // Find all {tag} references
  const tagPattern = /{([^}]+)}/g;
  const tags: string[] = [];
  let match;
  
  // Extract all tags using regex exec
  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1]);
  }
  
  if (tags.length === 0) {
    return text;
  }
  
  let processedText = text;
  
  // Replace each tag with document content
  for (const tag of tags) {
    const content = await getDocumentByTag(agentId, tag);
    
    if (content) {
      // Replace the tag with a summarized version if it's too long
      let replacement = content;
      const maxLength = 500;
      
      if (replacement.length > maxLength) {
        replacement = replacement.substring(0, maxLength) + '... (content truncated)';
      }
      
      processedText = processedText.replace(`{${tag}}`, replacement);
    } else {
      // Tag not found, replace with a note
      processedText = processedText.replace(`{${tag}}`, '[Document not found]');
    }
  }
  
  return processedText;
} 