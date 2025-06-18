//For Testing Purpose (there is no dependency on this file)

//Simplified Version
import { BedrockClient } from './bedrockClient.js';

async function main() {
  // --- 1. Load Credentials Securely (from environment variables) ---
  // Ensure you have set AWS_REGION, AWS_ACCESS_KEY_ID, etc. in your terminal.
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // The SDK handles this if it's undefined
  };
  const region = process.env.AWS_REGION || "us-west-2";

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error("AWS credentials not found in environment variables.");
  }

  // --- 2. Initialize the BedrockClaude client ---
  // This is the pattern you wanted: new BedrockClaude({})
  const bedrock = new BedrockClient({
    region: region,
    credentials: credentials,
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
  });

  // --- 3. Generate a completion ---
  const prompt = "Explain the concept of serverless computing in three simple sentences.";
  
  console.log(`Prompt: "${prompt}"`);
  console.log("-----------------------------------------");
  console.log("Generating response...");

  try {
    const completion = await bedrock.generateCompletion(
      prompt,
      { // Optional parameters for this specific call
        system_prompt: "You are a tech educator who makes complex topics easy to understand.",
        temperature: 0.5,
        max_tokens: 150,
        // model: 'anthropic.claude-3-sonnet-20240229-v1:0' // Example of overriding the default model
      }
    );

    console.log("\n--- Claude's Response ---");
    console.log(completion);

  } catch (error) {
    console.error("\nFailed to get completion:", error);
  }
}

main();