// bedrock.js

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

/**
 * A client for interacting with Anthropic's Claude models on Amazon Bedrock.
 */
class BedrockClient {
  /**
   * @type {BedrockRuntimeClient}
   * @private
   */
  client;
  /**
   * @type {string}
   * @private
   */
  defaultModelId;

  /**
   * Initializes the BedrockClaude client.
   * @param {object} config
   * @param {string} config.region The AWS region for the Bedrock client.
   * @param {object} [config.credentials] AWS credentials. If not provided, the SDK will look for them in the environment.
   * @param {string} config.credentials.accessKeyId
   * @param {string} config.credentials.secretAccessKey
   * @param {string} [config.credentials.sessionToken]
   * @param {string} [config.modelId] The default model ID to use for completions (e.g., "anthropic.claude-3-sonnet...").
   */
  constructor(config) {
    if (!config.region) {
      throw new Error("AWS region is required.");
    }
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: config.credentials,
    });
    this.defaultModelId = config.modelId || "anthropic.claude-3-haiku-20240307-v1:0";
  }

  /**
   * Generates a single, non-streaming completion from a prompt.
   * @param {string} prompt The user prompt to send to the model.
   * @param {object} [options] Optional parameters for the generation.
   * @param {string} [options.model] The model to use, overriding the default.
   * @param {number} [options.temperature=0.7] The sampling temperature.
   * @param {number} [options.max_tokens=1000] The maximum number of tokens to generate.
   * @param {string} [options.system_prompt="You are a helpful assistant."] A system prompt to guide the model.
   * @returns {Promise<string>} The generated text completion.
   */
  async generateCompletion(prompt, options = {}) {
    const modelId = options.model || this.defaultModelId;
    const system_prompt = options.system_prompt || "You are a helpful assistant.";

    // Construct the payload according to the Bedrock Claude 3 Messages API.
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature ?? 0.7,
      system: system_prompt,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    };

    // Create the command for a non-streaming invocation.
    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
    });

    try {
      const response = await this.client.send(command);
      // The response body is a Uint8Array. Decode it to a string.
      const decodedResponseBody = new TextDecoder().decode(response.body);
      const parsedResponse = JSON.parse(decodedResponseBody);
      
      // Extract the text from the first content block.
      return parsedResponse.content[0].text || "";
    } catch (error) {
      console.error("Error generating completion with Bedrock:", error);
      throw error;
    }
  }
}

// Export the class for use in other files.
export { BedrockClient };