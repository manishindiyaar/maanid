/**
 * Rules-based Agent implementation that processes messages based on predefined rules
 */

import { BaseAgent } from './base-agent';
import { 
  Agent, 
  AgentResult, 
  Message, 
  OrchestrationContext, 
  ProcessResult 
} from '../models/types';

interface Rule {
  id: string;
  name: string;
  pattern: string | RegExp;
  response: string | ((matches: RegExpMatchArray | null, context: OrchestrationContext) => string);
  priority: number;
  enabled: boolean;
}

interface RulesAgentConfig {
  rules?: Rule[];
  fallback_message?: string;
  relevance_threshold?: number;
}

export class RulesAgent extends BaseAgent {
  private config: RulesAgentConfig;
  private rules: Rule[];
  
  constructor(agent: Agent) {
    super(agent);
    
    // Set default configuration
    this.config = {
      fallback_message: "I don't have a specific response for that.",
      relevance_threshold: 0.5,
      ...(agent.config as RulesAgentConfig || {})
    };
    
    // Initialize rules
    const configRules = this.config.rules || [];
    this.rules = configRules.map(rule => ({
      ...rule,
      pattern: typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'i') : rule.pattern
    }));
    
    // Sort rules by priority (higher number = higher priority)
    this.rules.sort((a, b) => b.priority - a.priority);
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
    
    // Check if any rules match the message
    const { message } = context;
    const matchingRule = this.findMatchingRule(message);
    
    return matchingRule !== null;
  }
  
  /**
   * Process a message through this agent
   * @param context The orchestration context
   * @returns Processing result
   */
  async process(context: OrchestrationContext): Promise<ProcessResult> {
    try {
      this.log('info', 'Processing message with rules agent', { 
        message_id: context.message.id,
        rules_count: this.rules.length
      });
      
      // Generate a response based on matching rules
      const result = await this.generateResponse(context.message, context);
      
      if (!result.success) {
        return {
          success: false,
          message: 'No matching rules found',
          data: result,
          next_action: undefined,
          agent_id: this.getId(),
          confidence: 0
        };
      }
      
      return {
        success: true,
        message: 'Successfully processed message with rule',
        data: result,
        next_action: undefined,
        agent_id: this.getId(),
        confidence: result.confidence
      };
    } catch (error) {
      this.log('error', 'Error processing message with rules agent', { error });
      
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        next_action: undefined,
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
    // Find a matching rule
    const matchingRule = this.findMatchingRule(message);
    
    if (!matchingRule) {
      return {
        success: false,
        response: this.config.fallback_message || "I don't have a response for that.",
        confidence: 0,
        metadata: { matched_rule: null },
        next_agent_id: undefined
      };
    }
    
    try {
      // Get matches from the pattern
      const matches = message.content.match(matchingRule.pattern);
      
      // Generate response based on the rule
      let response = '';
      if (typeof matchingRule.response === 'function') {
        // If response is a function, call it with matches and context
        response = matchingRule.response(matches, context);
      } else {
        // Otherwise use the static response
        response = matchingRule.response;
      }
      
      return {
        success: true,
        response: this.formatResponse(response),
        confidence: 1.0, // Rules have high confidence when they match
        metadata: { 
          matched_rule: matchingRule.id,
          rule_name: matchingRule.name
        },
        next_agent_id: undefined
      };
    } catch (error) {
      this.log('error', 'Error generating rule-based response', { error, rule_id: matchingRule.id });
      
      return {
        success: false,
        response: 'I encountered an error processing your request with my rule system.',
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          matched_rule: matchingRule.id
        },
        next_agent_id: undefined
      };
    }
  }
  
  /**
   * Find a rule that matches the message
   * @param message The message to match against rules
   * @returns The matching rule or null if no match
   */
  private findMatchingRule(message: Message): Rule | null {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      const pattern = rule.pattern;
      if (message.content.match(pattern)) {
        return rule;
      }
    }
    
    return null;
  }
  
  /**
   * Add a new rule to the agent
   * @param rule The rule to add
   */
  public addRule(rule: Rule): void {
    // Convert string patterns to RegExp
    const processedRule = {
      ...rule,
      pattern: typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'i') : rule.pattern
    };
    
    this.rules.push(processedRule);
    
    // Re-sort rules by priority
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Remove a rule by its ID
   * @param ruleId The ID of the rule to remove
   * @returns True if the rule was removed
   */
  public removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    return this.rules.length < initialLength;
  }
  
  /**
   * Get all rules defined for this agent
   * @returns Array of rules
   */
  public getRules(): Rule[] {
    return [...this.rules];
  }
  
  /**
   * Enable or disable a rule by its ID
   * @param ruleId The ID of the rule to update
   * @param enabled Whether the rule should be enabled
   * @returns True if the rule was updated
   */
  public setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }
} 