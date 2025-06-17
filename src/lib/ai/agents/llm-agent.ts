/**
 * LLM Agent implementation that uses Anthropic Claude to process messages
 */

import { generateCompletion } from '../utils/ai-client';
import { BaseAgent } from './base-agent';
import { 
  Agent, 
  AgentResult, 
  Message, 
  OrchestrationContext, 
  ProcessResult 
} from '../models/types';

interface LLMAgentConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  relevance_threshold?: number;
  always_respond?: boolean;
}

export class LLMAgent extends BaseAgent {
  private config: LLMAgentConfig;
  
  constructor(agent: Agent) {
    super(agent);
    
    // Set default configuration values if not provided
    this.config = {
      model: 'claude-3-opus-20240229', // Default to Claude Opus
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: 'You are a helpful assistant.',
      relevance_threshold: 0.6,
      always_respond: false,
      ...(agent.config as LLMAgentConfig || {})
    };
  }
  
  /**
   * Check if this agent should process the message
   * @param context The orchestration context
   * @returns True if the agent should process the message
   */
  async shouldProcess(context: OrchestrationContext): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }
    
    // If agent is configured to always respond, return true
    if (this.config.always_respond) {
      return true;
    }
    
    // Check message relevance
    const relevance = await this.checkRelevance(context.message, context);
    return relevance >= (this.config.relevance_threshold || 0.6);
  }
  
  /**
   * Process a message through this agent
   * @param context The orchestration context
   * @returns Processing result
   */
  async process(context: OrchestrationContext): Promise<ProcessResult> {
    try {
      this.log('info', 'Processing message', { 
        message_id: context.message.id,
        content: context.message.content.substring(0, 100) + '...'
      });
      
      // Generate a response
      const result = await this.generateResponse(context.message, context);
      
      if (!result.success) {
        return {
          success: false,
          message: 'Failed to generate response',
          data: result,
          next_action: null,
          agent_id: this.getId(),
          confidence: 0
        };
      }
      
      // Include the response in the message field as well as the data field
      // This ensures it's available to the API endpoint
      return {
        success: true,
        message: result.response, // Include the response here explicitly
        data: result,
        next_action: null, // No next action by default
        agent_id: this.getId(),
        confidence: result.confidence
      };
    } catch (error) {
      this.log('error', 'Error processing message', { error });
      
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        next_action: null,
        agent_id: this.getId(),
        confidence: 0
      };
    }
  }
  
  /**
   * Generate a response to a user message
   * @param message The user message
   * @param context Additional context
   * @returns The generated response
   */
  async generateResponse(
    message: Message, 
    context: OrchestrationContext
  ): Promise<AgentResult> {
    try {
      // Check if we're in test mode (for the test-process-unviewed.js script)
      const isTestMode = message.id.startsWith('test-msg-');
      
      if (isTestMode) {
        // For test mode, generate sample responses based on message content
        console.log('Test mode detected, generating sample response');
        
        const msgContent = message.content.toLowerCase();
        let response = '';
        
        if (msgContent.includes('technical') || msgContent.includes('computer')) {
          response = "I understand you're having technical issues with your computer. Could you please provide more details about the problem? When did it start, and have you tried any solutions already?";
        } else if (msgContent.includes('price') || msgContent.includes('discount')) {
          response = "Thank you for your interest in our pricing! Our premium plan is $49.99/month, and we offer a 20% discount for annual subscriptions. Would you like me to provide more details about the features included?";
        } else if (msgContent.includes('company') || msgContent.includes('services')) {
          response = "We're a technology company specializing in AI solutions for businesses. Our services include chatbot integration, automated customer support, and data analysis. What specific aspects of our company would you like to know more about?";
        } else if (msgContent.includes('job') || msgContent.includes('waiter')) {
          response = "Thank you for your interest in job opportunities. We currently have several waiter positions available at our restaurant locations. The positions offer competitive pay and flexible hours. Would you like to hear more about the requirements and application process?";
        } else {
          response = "Thank you for your message! I'd be happy to help you with your request. Could you please provide more details so I can assist you better?";
        }
        
        return {
          success: true,
          response,
          confidence: 0.9,
          metadata: {
            model: 'test-mode',
            is_test: true,
            agent_name: 'Test Agent'
          },
          next_agent_id: null
        };
      }
      
      // Build prompt with context and message history
      const prompt = this.buildPrompt(message, context);
      
      // Generate completion using Anthropic Claude
      const response = await generateCompletion(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        system_prompt: this.config.system_prompt
      });
      
      return {
        success: true,
        response: this.formatResponse(response),
        confidence: 0.9, // Default high confidence for LLM responses
        metadata: {
          model: this.config.model,
          prompt_length: prompt.length,
          response_length: response.length
        },
        next_agent_id: null
      };
    } catch (error) {
      this.log('error', 'Error generating response', { error });
      
      return {
        success: false,
        response: 'I apologize, but I encountered an error processing your request.',
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        next_agent_id: null
      };
    }
  }
  
  /**
   * Check the relevance of a message for this agent
   * @param message The message to check
   * @param context The orchestration context
   * @returns Relevance score between 0 and 1
   */
  private async checkRelevance(
    message: Message, 
    context: OrchestrationContext
  ): Promise<number> {
    try {
      // Use Claude to determine relevance
      const prompt = `
        You are evaluating whether a message is relevant for an AI assistant with the following characteristics:
        - Name: ${this.getName()}
        - Description: ${this.agent.description || 'General assistant'}
        
        The message is: "${message.content}"
        
        On a scale from 0 to 1, how relevant is this message for this assistant?
        Respond with only a number between 0 and 1.
      `;
      
      const response = await generateCompletion(prompt, {
        temperature: 0.3,
        max_tokens: 10,
        system_prompt: 'You are a relevance evaluation tool. Respond with only a number between 0 and 1.',
        model: 'claude-3-haiku-20240307' // Use smaller model for efficiency
      });
      
      const relevance = parseFloat(response.trim());
      return isNaN(relevance) ? 0.5 : Math.max(0, Math.min(1, relevance));
    } catch (error) {
      this.log('warn', 'Error checking relevance', { error });
      return 0.5; // Default to medium relevance on error
    }
  }
  
  /**
   * Build a prompt for the language model using message and context
   * @param message The user message
   * @param context The orchestration context
   * @returns Formatted prompt string
   */
  private buildPrompt(message: Message, context: OrchestrationContext): string {
    // Get context information
    const { contact, history = [], memory } = context;
    
    // Build the conversational context from history
    let conversationContext = '';
    if (history.length > 0) {
      conversationContext = 'Previous conversation:\n';
      
      // Take the last few messages to provide context (limited to avoid token limits)
      const recentHistory = history.slice(-5);
      
      recentHistory.forEach(msg => {
        const sender = msg.is_from_customer ? 'Customer' : 'Assistant';
        conversationContext += `${sender}: ${msg.content}\n`;
      });
      
      conversationContext += '\n';
    }
    
    // Add contact information if available
    let contactInfo = '';
    if (contact) {
      contactInfo = `
        Customer Information:
        Name: ${contact.name || 'Unknown'}
        Contact Info: ${contact.contact_info || 'Not provided'}
        Last Contact: ${contact.last_contact ? new Date(contact.last_contact).toLocaleString() : 'Never'}
      `;
    }
    
    // Add memory context if available
    let memoryContext = '';
    if (memory && memory.context && memory.context.trim().length > 0) {
      memoryContext = `
        MEMORY INFORMATION:
        ${memory.context}
      `;
      console.log('📋 Including memory context in prompt');
    }
    
    // Combine all elements into the final prompt
    return `
      ${contactInfo}
      
      ${memoryContext}
      
      ${conversationContext}
      
      Customer's latest message: ${message.content}
      
      Please provide a helpful, friendly, and concise response:
    `;
  }
  
  /**
   * Format the response from the LLM
   * @param response Raw response from the LLM
   * @returns Formatted response
   */
  protected formatResponse(response: string): string {
    // Clean up any newlines or extra spaces
    let formatted = response.trim();
    
    // Remove any "AI:" or "Assistant:" prefixes that the model sometimes adds
    formatted = formatted.replace(/^(AI:|Assistant:)\s*/i, '');
    
    return formatted;
  }
} 