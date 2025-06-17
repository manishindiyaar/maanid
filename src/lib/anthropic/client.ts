import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client with API key from config
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Handle query and action parsing
export async function parseNaturalLanguageQuery(prompt: string) {
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const systemPrompt = `
      You are an AI assistant that helps parse natural language queries into structured data.
      You need to determine if the input is a query, an action, or a customer summary request.

      Database Schema:
      - contacts: id, name, contact_info
      - messages: id, contact_id, content, timestamp, direction
      - memory: id, user_id, message_id, content, memory_data, created_at

      Available Functions:
      - get_customers_by_message_keyword(keyword)
      - get_customers_by_message_keyword_and_date_range(keyword, start_date, end_date)
      - get_customer_summary(customer_name)

      Available Actions:
      - send_message(recipients, message)

      Current Date: ${currentDate}

      IMPORTANT RULES:
      1. For customer summary requests (e.g., "Tell me about John Doe"), ONLY return a summary request, do NOT include any other actions or queries
      2. For customer summaries, focus on extracting just the customer name from the query
      3. Do not combine summary requests with other actions or queries
      4. NEVER trigger the Autonomous Agent for customer summary requests
      5. Customer summary requests should ONLY return a summary type response

      Format your response as JSON following this structure:
      For queries: {"type": "query", "query": {"functionName": "...", "parameters": {...}}}
      For actions: {"type": "action", "action": "send_message", "message": "...", "query": {"functionName": "...", "parameters": {...}}}
      For customer summaries: {"type": "summary", "query": {"functionName": "get_customer_summary", "parameters": {"customer_name": "..."}}}
    `;

    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse the assistant's response to extract the JSON
    const content = message.content[0].text;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      throw new Error('Failed to parse response from LLM');
    }
  } catch (error) {
    console.error('Error parsing natural language query:', error);
    return {
      error: "Sorry, I didn't understand that. Try 'send <message> to <query>'."
    };
  }
}

// Generate auto-replies for customer messages
export async function generateAutoReply(customerMessage: string, conversationHistory: string[]) {
  try {
    const systemPrompt = `
      You are an AI customer service assistant. Provide helpful, concise, and friendly responses.
      Keep your answers brief and to the point. If you're not confident about an answer,
      indicate that a human representative will follow up.
    `;

    // Format conversation history for context
    const formattedHistory = conversationHistory.map((msg, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: msg
    }));

    // Add the current message
    formattedHistory.push({
      role: 'user',
      content: customerMessage
    });

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      system: systemPrompt,
      messages: formattedHistory as Anthropic.MessageParam[],
    });

    return {
      reply: message.content[0].text,
      confidence: 0.9 // Placeholder - in a real implementation, you would use the model's confidence score
    };
  } catch (error) {
    console.error('Error generating auto-reply:', error);
    return {
      reply: "I'll have a human representative get back to you soon.",
      confidence: 0
    };
  }
}