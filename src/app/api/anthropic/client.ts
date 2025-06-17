import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function parseNaturalLanguageQuery(input: string) {


  console.log(`[PARSER] Parsing query: ${input}`);
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `You are an expert at parsing natural language queries into structured database operations. 
You should:
1. Analyze the user's natural language query
2. Determine if they are asking for information (query) or want to take action (action)
3. For queries, extract parameters and translate to our database structure
4. For actions, identify what they want to do and extract necessary parameters

Respond with JSON with this structure:
{ 
  "type": "query" | "action",
  "query": { 
    "functionName": "get_customers_by_message_keyword" | "get_customers_by_message_keyword_and_date_range" | "get_all_customers", 
    "parameters": { ... }
  },
  "action": null | "send_message",
  "message": null | "message to send",
  "error": null | "error message if input can't be processed"
}

Available query functions:
- get_customers_by_message_keyword: Find customers who sent messages containing a keyword
  Parameters: keyword (string)
- get_customers_by_message_keyword_and_date_range: Find customers who sent messages containing a keyword within a date range
  Parameters: keyword (string), start_date (ISO date), end_date (ISO date)
- get_all_customers: Get all customers (no parameters)

When the user wants to perform an action like sending a message, set "action" to "send_message" and "message" to the text they want to send.

Example for "Show me customers who mentioned subscription":
{
  "type": "query",
  "query": {
    "functionName": "get_customers_by_message_keyword",
    "parameters": { "keyword": "subscription" }
  },
  "action": null,
  "message": null,
  "error": null
}

Example for "Find users who talked about pricing last week":
{
  "type": "query",
  "query": {
    "functionName": "get_customers_by_message_keyword_and_date_range",
    "parameters": { 
      "keyword": "pricing", 
      "start_date": "2023-05-01", 
      "end_date": "2023-05-07" 
    }
  },
  "action": null,
  "message": null,
  "error": null
}

Example for "Send a message to users who asked about the API saying 'Our API docs are now available'":
{
  "type": "action",
  "query": {
    "functionName": "get_customers_by_message_keyword",
    "parameters": { "keyword": "API" }
  },
  "action": "send_message",
  "message": "Our API docs are now available",
  "error": null
}

Only parse the user's query - do not include any explanations. Just return the JSON.`,
      messages: [
        { role: "user", content: input }
      ],
    });

    try {
      // Extract the JSON from the response
      const content = response.content[0].text;
      console.log(`[PARSER] Raw Claude response: ${content}`);
      
      const parsedResponse = JSON.parse(content);
      console.log(`[PARSER] Parsed result:`, parsedResponse);
      
      return parsedResponse;
    } catch (parseError) {
      console.error(`[PARSER] Error parsing response from Claude:`, parseError);
      console.error(`[PARSER] Raw response was:`, response.content[0].text);
      return {
        error: "Failed to parse the response. Please try again."
      };
    }
  } catch (error) {
    console.error(`[PARSER] API error:`, error);
    return {
      error: "Error connecting to AI service. Please try again."
    };
  }
} 