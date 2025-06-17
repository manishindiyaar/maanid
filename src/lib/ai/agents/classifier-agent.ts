/**
 * Classifier Agent implementation that categorizes messages and routes them
 */

import { classifyMessage } from '../utils/ai-client';
import { BaseAgent } from './base-agent';
import { 
  Agent, 
  AgentResult, 
  Message, 
  OrchestrationContext, 
  ProcessResult 
} from '../models/types';

interface Category {
  id: string;
  name: string;
  description: string;
  nextAgentId?: string;
}

interface ClassifierAgentConfig {
  categories?: Category[];
  default_category_id?: string;
  confidence_threshold?: number;
}

export class ClassifierAgent extends BaseAgent {
  private config: ClassifierAgentConfig;
  private categories: Category[];
  
  constructor(agent: Agent) {
    super(agent);
    
    // Set default configuration
    this.config = {
      confidence_threshold: 0.7,
      ...(agent.config as ClassifierAgentConfig || {})
    };
    
    // Initialize categories
    this.categories = this.config.categories || [];
    
    // Validate that we have categories
    if (this.categories.length === 0) {
      throw new Error('Classifier agent requires at least one category');
    }
  }
  
  /**
   * Check if this agent should process the message
   * @param context The orchestration context
   * @returns True if the agent should process the message
   */
  async shouldProcess(context: OrchestrationContext): Promise<boolean> {
    // Classifier agents are usually at the beginning of a chain
    // and should process all messages if they're enabled
    return this.isEnabled();
  }
  
  /**
   * Process a message through this agent
   * @param context The orchestration context
   * @returns Processing result
   */
  async process(context: OrchestrationContext): Promise<ProcessResult> {
    try {
      this.log('info', 'Classifying message', { 
        message_id: context.message.id,
        categories_count: this.categories.length
      });
      
      // Classify the message to determine next action
      const result = await this.generateResponse(context.message, context);
      
      if (!result.success) {
        return {
          success: false,
          message: 'Failed to classify message',
          data: result,
          next_action: undefined,
          agent_id: this.getId(),
          confidence: 0
        };
      }
      
      // If we have a next agent, set it as the next action
      const nextAgentId = result.next_agent_id;
      
      return {
        success: true,
        message: `Message classified as ${result.metadata?.category_name || 'unknown'}`,
        data: result,
        next_action: nextAgentId || undefined,
        agent_id: this.getId(),
        confidence: result.confidence
      };
    } catch (error) {
      this.log('error', 'Error classifying message', { error });
      
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
   * Generate a classification response
   * @param message The user message
   * @param context Additional context
   * @returns The classification result
   */
  async generateResponse(
    message: Message, 
    context: OrchestrationContext
  ): Promise<AgentResult> {
    try {
      // Get all category names for classification
      const categoryNames = this.categories.map(c => c.name);
      
      // Classify the message
      const classificationResult = await classifyMessage(message.content, categoryNames);
      
      // Find the matching category
      const matchedCategory = this.categories.find(
        c => c.name.toLowerCase() === classificationResult.category.toLowerCase()
      );
      
      // If no matching category or confidence is too low, use default category
      if (!matchedCategory || classificationResult.confidence < (this.config.confidence_threshold || 0.7)) {
        const defaultCategory = this.getDefaultCategory();
        
        this.log('info', 'Using default category due to low confidence', {
          confidence: classificationResult.confidence,
          threshold: this.config.confidence_threshold,
          default_category: defaultCategory.name
        });
        
        return {
          success: true,
          response: `I've classified this as ${defaultCategory.name}.`,
          confidence: 0.5, // Medium confidence for default category
          metadata: {
            category_id: defaultCategory.id,
            category_name: defaultCategory.name,
            is_default: true
          },
          next_agent_id: defaultCategory.nextAgentId || undefined
        };
      }
      
      this.log('info', 'Message classified', {
        category: matchedCategory.name,
        confidence: classificationResult.confidence
      });
      
      return {
        success: true,
        response: `I've classified this as ${matchedCategory.name}.`,
        confidence: classificationResult.confidence,
        metadata: {
          category_id: matchedCategory.id,
          category_name: matchedCategory.name,
          is_default: false
        },
        next_agent_id: matchedCategory.nextAgentId || undefined
      };
    } catch (error) {
      this.log('error', 'Error generating classification', { error });
      
      // On error, use default category
      const defaultCategory = this.getDefaultCategory();
      
      return {
        success: false,
        response: `I encountered an error while classifying your message.`,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          category_id: defaultCategory.id,
          category_name: defaultCategory.name,
          is_default: true
        },
        next_agent_id: defaultCategory.nextAgentId || undefined
      };
    }
  }
  
  /**
   * Get the default category for fallback
   * @returns The default category
   */
  private getDefaultCategory(): Category {
    // If a default category is specified, use it
    if (this.config.default_category_id) {
      const defaultCategory = this.categories.find(c => c.id === this.config.default_category_id);
      if (defaultCategory) {
        return defaultCategory;
      }
    }
    
    // Otherwise, use the first category
    return this.categories[0];
  }
  
  /**
   * Add a new category to the classifier
   * @param category The category to add
   */
  public addCategory(category: Category): void {
    this.categories.push(category);
  }
  
  /**
   * Remove a category by its ID
   * @param categoryId The ID of the category to remove
   * @returns True if the category was removed
   */
  public removeCategory(categoryId: string): boolean {
    const initialLength = this.categories.length;
    this.categories = this.categories.filter(c => c.id !== categoryId);
    return this.categories.length < initialLength;
  }
  
  /**
   * Get all categories defined for this classifier
   * @returns Array of categories
   */
  public getCategories(): Category[] {
    return [...this.categories];
  }
  
  /**
   * Set the default category by ID
   * @param categoryId The ID of the category to set as default
   * @returns True if successful
   */
  public setDefaultCategory(categoryId: string): boolean {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      this.config.default_category_id = categoryId;
      return true;
    }
    return false;
  }
} 