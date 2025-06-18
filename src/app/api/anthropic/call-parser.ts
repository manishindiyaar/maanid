import { Anthropic } from "@anthropic-ai/sdk";
import { bedrockClient } from "./client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedCallQuery {
  type: "call";
  contacts: string[];
  message: string;
  error?: string;
}

export async function parseCallQuery(input: string): Promise<ParsedCallQuery> {
  console.log(`[CALL-PARSER] Parsing call query: ${input}`);
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: `You are an expert at parsing natural language queries for making phone calls. 
You should:
1. Extract the names of people to call
2. Extract the message to deliver
3. Handle various phrasings like:
   - "call X and Y and say..."
   - "call X and tell them..."
   - "make a call to X and say..."
   - "make a phone call to X and tell them..."
   - "phone X and say..."
   - "dial X and tell them..."

Respond with JSON with this structure:
{ 
  "type": "call",
  "contacts": ["name1", "name2"],
  "message": "message to deliver",
  "error": null | "error message if input can't be processed"
}

Examples:

Input: "call Manish and Aadidev and say we have job vacancy available for you now"
Output: {
  "type": "call",
  "contacts": ["Manish", "Aadidev"],
  "message": "we have job vacancy available for you now",
  "error": null
}

Input: "make a phone call to Aadidev and say we have job vacancy available for you"
Output: {
  "type": "call",
  "contacts": ["Aadidev"],
  "message": "we have job vacancy available for you",
  "error": null
}

Input: "phone John and tell him the meeting is tomorrow"
Output: {
  "type": "call",
  "contacts": ["John"],
  "message": "the meeting is tomorrow",
  "error": null
}

Input: "call Sarah, Mike and David and say the project is complete"
Output: {
  "type": "call",
  "contacts": ["Sarah", "Mike", "David"],
  "message": "the project is complete",
  "error": null
}

Handle various separators: "and", ",", "," + "and"
Handle various message starters: "say", "tell them", "tell him", "tell her", "inform them"

IMPORTANT: Always interpret queries that start with "make a call", "make a phone call", "phone", or "dial" as call requests.

If the input is not a call request or cannot be parsed, set error field.

Only return the JSON, no explanations.`,
      messages: [
        { role: "user", content: input }
      ],
    });

    try {
      const content = response.content[0].text;
      console.log(`[CALL-PARSER] Raw Claude response: ${content}`);
      
      const parsedResponse = JSON.parse(content);
      console.log(`[CALL-PARSER] Parsed result:`, parsedResponse);
      
      return parsedResponse;
    } catch (parseError) {
      console.error(`[CALL-PARSER] Error parsing response from Claude:`, parseError);
      console.error(`[CALL-PARSER] Raw response was:`, response.content[0].text);
      
      // Fallback parsing using regex
      return fallbackParseCallQuery(input);
    }
  } catch (error) {
    console.error(`[CALL-PARSER] API error:`, error);
    
    // Fallback parsing using regex
    return fallbackParseCallQuery(input);
  }
}

// New function using Bedrock client
export async function parseCallQueryWithBedrock(input: string): Promise<ParsedCallQuery> {
  console.log(`[BEDROCK-CALL-PARSER] Parsing call query: ${input}`);
  
  try {
    const systemPrompt = `You are an expert at parsing natural language queries for making phone calls. 
You should:
1. Extract the names of people to call
2. Extract the message to deliver
3. Handle various phrasings like:
   - "call X and Y and say..."
   - "call X and tell them..."
   - "make a call to X and say..."
   - "make a phone call to X and tell them..."
   - "phone X and say..."
   - "dial X and tell them..."

Respond with JSON with this structure:
{ 
  "type": "call",
  "contacts": ["name1", "name2"],
  "message": "message to deliver",
  "error": null | "error message if input can't be processed"
}

Examples:

Input: "call Manish and Aadidev and say we have job vacancy available for you now"
Output: {
  "type": "call",
  "contacts": ["Manish", "Aadidev"],
  "message": "we have job vacancy available for you now",
  "error": null
}

Input: "make a phone call to Aadidev and say we have job vacancy available for you"
Output: {
  "type": "call",
  "contacts": ["Aadidev"],
  "message": "we have job vacancy available for you",
  "error": null
}

Handle various separators: "and", ",", "," + "and"
Handle various message starters: "say", "tell them", "tell him", "tell her", "inform them"

IMPORTANT: Always interpret queries that start with "make a call", "make a phone call", "phone", or "dial" as call requests.

If the input is not a call request or cannot be parsed, set error field.

Only return the JSON, no explanations.`;

    const response = await bedrockClient.generateCompletion(input, {
      system_prompt: systemPrompt,
      max_tokens: 1000,
      temperature: 0.2,
    });

    try {
      console.log(`[BEDROCK-CALL-PARSER] Raw response: ${response}`);
      const parsedResponse = JSON.parse(response);
      console.log(`[BEDROCK-CALL-PARSER] Parsed result:`, parsedResponse);
      
      return parsedResponse;
    } catch (parseError) {
      console.error(`[BEDROCK-CALL-PARSER] Error parsing response:`, parseError);
      console.error(`[BEDROCK-CALL-PARSER] Raw response was:`, response);
      
      // Fallback parsing using regex
      return fallbackParseCallQuery(input);
    }
  } catch (error) {
    console.error(`[BEDROCK-CALL-PARSER] API error:`, error);
    
    // Fallback parsing using regex
    return fallbackParseCallQuery(input);
  }
}

function fallbackParseCallQuery(input: string): ParsedCallQuery {
  console.log(`[CALL-PARSER] Using fallback parsing for: ${input}`);
  
  // Try to match various call patterns
  const patterns = [
    // Original patterns
    /call\s+(.+?)\s+and\s+say\s+(.+)/i,
    /call\s+(.+?)\s+and\s+tell\s+(?:them|him|her)\s+(.+)/i,
    /call\s+(.+?)\s+and\s+inform\s+(?:them|him|her)\s+(.+)/i,
    /call\s+(.+?)\s+(?:to\s+)?say\s+(.+)/i,
    /call\s+(.+?)\s+(?:to\s+)?tell\s+(?:them|him|her)\s+(.+)/i,
    
    // Additional patterns for "make a call" and similar variations
    /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+and\s+say\s+(.+)/i,
    /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+and\s+tell\s+(?:them|him|her)\s+(.+)/i,
    /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+(?:to\s+)?say\s+(.+)/i,
    /make\s+(?:a\s+)?(?:phone\s+)?call\s+(?:to\s+)?(.+?)\s+(?:to\s+)?tell\s+(?:them|him|her)\s+(.+)/i,
    /phone\s+(.+?)\s+(?:and|to)\s+(?:say|tell|inform)\s+(.+)/i,
    /dial\s+(.+?)\s+(?:and|to)\s+(?:say|tell|inform)\s+(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      console.log(`[CALL-PARSER] Matched pattern: ${pattern}`);
      const contactsStr = match[1].trim();
      const message = match[2].trim();
      
      // Extract contact names - handle "and", commas, and combinations
      const contacts = contactsStr
        .split(/\s+and\s+|\s*,\s*and\s*|\s*,\s*/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      if (contacts.length > 0 && message.length > 0) {
        console.log(`[CALL-PARSER] Extracted contacts: ${contacts.join(', ')}`);
        console.log(`[CALL-PARSER] Extracted message: ${message}`);
        return {
          type: "call",
          contacts,
          message
        };
      }
    }
  }
  
  console.log(`[CALL-PARSER] Could not parse call request: ${input}`);
  return {
    type: "call",
    contacts: [],
    message: "",
    error: "Could not parse call request. Please use format like: 'call [names] and say [message]'"
  };
}
