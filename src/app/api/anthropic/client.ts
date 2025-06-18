import { Anthropic } from "@anthropic-ai/sdk";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// BedrockClient implementation for AWS Bedrock Claude models
class BedrockClient {
  client: BedrockRuntimeClient;
  defaultModelId: string;

  constructor(config: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
    modelId?: string;
  }) {
    if (!config.region) {
      throw new Error("AWS region is required.");
    }
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: config.credentials,
    });
    this.defaultModelId = config.modelId || "anthropic.claude-3-haiku-20240307-v1:0";
  }

  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      system_prompt?: string;
    } = {}
  ): Promise<string> {
    const modelId = options.model || this.defaultModelId;
    const system_prompt = options.system_prompt || "You are a helpful assistant.";

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature ?? 0.7,
      system: system_prompt,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    };

    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
    });

    try {
      const response = await this.client.send(command);
      const decodedResponseBody = new TextDecoder().decode(response.body);
      const parsedResponse = JSON.parse(decodedResponseBody);
      
      return parsedResponse.content[0].text || "";
    } catch (error) {
      console.error("Error generating completion with Bedrock:", error);
      throw error;
    }
  }
}

// Initialize Bedrock client with environment variables
const createBedrockClient = () => {
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
  const region = process.env.AWS_REGION || "us-west-2";

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    throw new Error("AWS credentials not found in environment variables.");
  }

  return new BedrockClient({
    region: region,
    credentials: credentials,
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
  });
};

// Export the Bedrock client
export const bedrockClient = createBedrockClient();

export async function parseNaturalLanguageQuery(input: string) {
  // Use the Bedrock client instead of Anthropic direct API
  // Comment out this if you want to use the Bedrock implementation
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

// New function using Bedrock client
export async function parseNaturalLanguageQueryWithBedrock(input: string) {
  console.log(`[BEDROCK-PARSER] Parsing query: ${input}`);
  
  try {
    const systemPrompt = `You are an expert at parsing natural language queries into structured database operations. 
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

Only parse the user's query - do not include any explanations. Just return the JSON.`;

    const response = await bedrockClient.generateCompletion(input, {
      system_prompt: systemPrompt,
      max_tokens: 1000,
      temperature: 0.2,
    });

    try {
      console.log(`[BEDROCK-PARSER] Raw response: ${response}`);
      const parsedResponse = JSON.parse(response);
      console.log(`[BEDROCK-PARSER] Parsed result:`, parsedResponse);
      
      return parsedResponse;
    } catch (parseError) {
      console.error(`[BEDROCK-PARSER] Error parsing response:`, parseError);
      console.error(`[BEDROCK-PARSER] Raw response was:`, response);
      return {
        error: "Failed to parse the response. Please try again."
      };
    }
  } catch (error) {
    console.error(`[BEDROCK-PARSER] API error:`, error);
    return {
      error: "Error connecting to AWS Bedrock service. Please try again."
    };
  }
} 