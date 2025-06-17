

import {
    BedrockRuntimeClient,
    InvokeModelWithResponseStreamCommand,
  } from "@aws-sdk/client-bedrock-runtime";
  
 
  const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION ;
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN ;
  // --- Validation ---
  // Ensure all required environment variables are set.
  if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_SESSION_TOKEN) {
    throw new Error(
      "Missing required AWS environment variables: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN"
    );
  }
  
  // --- SDK Client Initialization ---
  // The AWS SDK needs to be explicitly configured with the session token.
  const credentials = {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN,
  };
  
  const client = new BedrockRuntimeClient({
    region: AWS_REGION,
    credentials, // Pass the temporary credentials here
  });
  
  // --- Model and Prompt Configuration ---
  const modelId = "anthropic.claude-3-sonnet-20240229-v1:0"; // Using Sonnet as an example
  const userPrompt = "How are u ?";
  const systemPrompt = "You are a helpful coding assistant who provides clean, simple, and correct code examples.";
  
  /**
   * Main function to invoke the Claude model and process the streaming response.
   */
  const main = async () => {
    console.log("=======================================");
    console.log("Model:      ", modelId);
    console.log("User Prompt:", userPrompt);
    console.log("=======================================");
  
    try {
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: [{ type: "text", text: userPrompt }] }],
      };
  
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });
  
      const response = await client.send(command);
  
      console.log("Claude's Response:");
      for await (const event of response.body) {
        const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
        if (chunk.type === "content_block_delta") {
          process.stdout.write(chunk.delta.text);
        }
      }
      console.log("\n=======================================");
  
    } catch (error) {
      console.error("\n\n[ERROR]", error);
    }
  };
  
  main();
