/**
 * Base Agent class that all specific agent implementations will extend
 */

import { Agent, AgentResult, Message, OrchestrationContext, ProcessResult } from '../models/types';

export abstract class BaseAgent {
  protected agent: Agent;
  
  /**
   * Create a new agent instance
   * @param agent The agent configuration
   */
  constructor(agent: Agent) {
    this.agent = agent;
  }
  
  /**
   * Get the agent's configuration
   * @returns The agent configuration
   */
  getConfig(): Agent {
    return this.agent;
  }
  
  /**
   * Get the agent's ID
   * @returns The agent ID
   */
  getId(): string {
    return this.agent.id;
  }
  
  /**
   * Get the agent's name
   * @returns The agent name
   */
  getName(): string {
    return this.agent.name;
  }
  
  /**
   * Get the agent's type
   * @returns The agent type
   */
  getType(): string {
    return this.agent.type;
  }
  
  /**
   * Get the agent's priority
   * @returns The agent priority
   */
  getPriority(): string {
    return this.agent.priority;
  }
  
  /**
   * Check if the agent is enabled
   * @returns True if the agent is enabled
   */
  isEnabled(): boolean {
    return this.agent.enabled;
  }
  
  /**
   * Process a message through this agent
   * This is the main method that must be implemented by all agents
   * @param context The orchestration context containing message and other data
   * @returns Processing result including next actions
   */
  abstract process(context: OrchestrationContext): Promise<ProcessResult>;
  
  /**
   * Check if this agent should handle the message
   * @param context The orchestration context 
   * @returns True if this agent should handle the message
   */
  abstract shouldProcess(context: OrchestrationContext): Promise<boolean>;
  
  /**
   * Initialize the agent with any necessary setup
   * @returns A promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // By default, no initialization is needed
    // Subclasses can override this method if they need initialization
    return Promise.resolve();
  }
  
  /**
   * Generate a response to a user message
   * @param message The user message to respond to
   * @param context Additional context data
   * @returns The agent's response
   */
  abstract generateResponse(
    message: Message, 
    context: OrchestrationContext
  ): Promise<AgentResult>;
  
  /**
   * Validate the agent's configuration
   * @returns True if the configuration is valid
   */
  validate(): boolean {
    // Basic validation that all agents should have
    if (!this.agent.id) return false;
    if (!this.agent.name) return false;
    if (!this.agent.type) return false;
    
    return true;
  }
  
  /**
   * Extract relevant data from a message for processing
   * @param message The message to extract data from
   * @returns Extracted data
   */
  protected extractDataFromMessage(message: Message): any {
    // Basic implementation - subclasses can extend this
    return {
      content: message.content,
      metadata: message.metadata,
      timestamp: message.timestamp,
      isFromCustomer: message.is_from_customer,
    };
  }
  
  /**
   * Format the response for sending back to the user
   * @param content The content to format
   * @returns Formatted response
   */
  protected formatResponse(content: string): string {
    // Basic implementation - subclasses can extend this
    return content.trim();
  }
  
  /**
   * Log agent activity
   * @param level Log level
   * @param message Log message
   * @param data Additional data to log
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      agent_id: this.agent.id,
      agent_name: this.agent.name,
      agent_type: this.agent.type,
      timestamp: new Date().toISOString(),
      message,
      ...data
    };
    
    switch (level) {
      case 'info':
        console.log(`[AGENT:${this.agent.name}]`, message, data ? JSON.stringify(data) : '');
        break;
      case 'warn':
        console.warn(`[AGENT:${this.agent.name}]`, message, data ? JSON.stringify(data) : '');
        break;
      case 'error':
        console.error(`[AGENT:${this.agent.name}]`, message, data ? JSON.stringify(data) : '');
        break;
    }
    
    // In a real implementation, you might want to store logs in a database
  }
} 