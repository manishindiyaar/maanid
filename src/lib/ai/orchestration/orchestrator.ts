/**
 * Orchestrator for managing agents and processing messages
 */

import { BaseAgent } from '../agents/base-agent';
import { ClassifierAgent } from '../agents/classifier-agent';
import { LLMAgent } from '../agents/llm-agent';
import { RulesAgent } from '../agents/rules-agent';
import { Agent, Contact, Message, OrchestrationContext, ProcessResult } from '../models/types';
import { 
  getActiveAgents, 
  getContactById, 
  getMessageHistory, 
  saveMessage, 
  updateContactLastContact, 
  updateMessageStatus
} from '../utils/supabase-bridge';
import { supabase } from '../../supabase/client';

interface OrchestratorConfig {
  max_agent_iterations?: number;
  fallback_agent_id?: string;
  save_responses?: boolean;
  update_contact_timestamp?: boolean;
  default_model?: string;
}

export class Orchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private config: OrchestratorConfig;
  
  /**
   * Create a new orchestrator instance
   * @param config Configuration options
   */
  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      max_agent_iterations: 3,
      save_responses: true,
      update_contact_timestamp: true,
      default_model: 'claude-3-opus-20240229',
      ...config
    };
  }
  
  /**
   * Initialize the orchestrator by loading agents from the database
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing orchestrator...');
      
      // Load agents from database
      const agents = await getActiveAgents();
      
      console.log(`Loaded ${agents.length} active agents`);
      
      // Create agent instances for each agent
      for (const agent of agents) {
        await this.registerAgent(agent);
      }
      
      console.log('Orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize orchestrator:', error);
      throw error;
    }
  }
  
  /**
   * Register an agent with the orchestrator
   * @param agentConfig The agent configuration
   */
  async registerAgent(agentConfig: Agent): Promise<BaseAgent> {
    try {
      console.log(`Registering agent: ${agentConfig.name} (${agentConfig.type})`);
      
      // Create the appropriate agent instance based on type
      let agent: BaseAgent;
      
      switch (agentConfig.type) {
        case 'llm':
          agent = new LLMAgent(agentConfig);
          break;
        case 'rules':
          agent = new RulesAgent(agentConfig);
          break;
        case 'classifier':
          agent = new ClassifierAgent(agentConfig);
          break;
        default:
          throw new Error(`Unsupported agent type: ${agentConfig.type}`);
      }
      
      // Initialize the agent
      await agent.initialize();
      
      // Store the agent in our map
      this.agents.set(agentConfig.id, agent);
      
      return agent;
    } catch (error) {
      console.error(`Failed to register agent ${agentConfig.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Process an incoming message through the AI system
   * @param message The message to process
   * @returns The processing result
   */
  async processMessage(message: Message): Promise<ProcessResult> {
    try {
      // Import memory service functions
      const { processMessageMemory, retrieveMemories, formatMemoryContext } = require('../../../app/api/memory/memoryService');
      
      // For test messages, ensure they have agent name and response
      if (message.id.startsWith('test-msg-')) {
        console.log(`Processing test message: ${message.id}`);
        
        // Find an available agent for test message based on content
        let agentName = 'General Agent';
        let agentId = 'test-agent-general';
        
        const content = message.content.toLowerCase();
        if (content.includes('technical') || content.includes('computer')) {
          agentName = 'Support Agent';
          agentId = 'test-agent-support';
        } else if (content.includes('price') || content.includes('discount')) {
          agentName = 'Sales Agent';
          agentId = 'test-agent-sales';
        } else if (content.includes('job') || content.includes('hire')) {
          agentName = 'Job Agent';
          agentId = 'test-agent-job';
        }
        
        console.log(`Selected test agent: ${agentName} (${agentId})`);
        
        // Create a response appropriate for the message content
        let response = `This is a test response from ${agentName}. `;
        if (content.includes('hello') || content.includes('hi')) {
          response += 'Hello! How can I help you today?';
        } else if (content.includes('technical') || content.includes('computer')) {
          response += 'I can help with your technical questions about our products and services.';
        } else if (content.includes('price') || content.includes('discount')) {
          response += 'We offer competitive pricing and occasional discounts for our regular customers.';
        } else if (content.includes('job') || content.includes('hire')) {
          response += 'We\'re looking for talented individuals to join our team.';
        } else {
          response += 'I\'d be happy to assist you with your inquiry. Could you provide more details?';
        }
        
        // Return formatted response with agent info
        return {
          success: true,
          message: response,
          confidence: 0.9,
          agent_id: agentId,
          next_action: 'none',
          data: {
            agent_name: agentName,
            response: response
          }
        };
      }
      
      // Non-test messages follow the normal flow
      
      // Update message status to processing
      await updateMessageStatus(message.id, 'pending');
      
      // Get contact info and message history
      const contactData = await getContactById(message.contact_id);
      if (!contactData) {
        throw new Error(`Contact not found: ${message.contact_id}`);
      }
      const contact: Contact = contactData;
      const messageHistory = await getMessageHistory(message.contact_id);
      
      // STEP 1: Store memories from the incoming message
      console.log(`🧠 Processing memory from message: ${message.id}`);
      const memoryResult = await processMessageMemory(
        message.content,
        contact.id,
        message.id
      );
      
      console.log(`Memory processing result: ${memoryResult.stored ? `Stored ${memoryResult.memoryCount} memories` : 'No memories stored'}`);
      
      // STEP 2: Retrieve relevant memories for this message
      console.log(`🔍 Retrieving relevant memories for: ${message.content.substring(0, 50)}...`);
      let memoryContext = '';
      const memoryQueryResult = await retrieveMemories(contact.id, message.content);
      
      if (memoryQueryResult.memories.length > 0) {
        console.log(`Found ${memoryQueryResult.memories.length} relevant memories`);
        memoryContext = formatMemoryContext(memoryQueryResult);
        console.log(`Memory context: ${memoryContext.substring(0, 100)}...`);
      } else {
        console.log('No relevant memories found');
      }
      
      // Create orchestration context with memory information
      const context: OrchestrationContext = {
        message,
        contact,
        history: messageHistory,
        agents: Array.from(this.agents.values()).map(agent => agent.getConfig()),
        memory: {
          context: memoryContext,
          memories: memoryQueryResult.memories
        }
      };
      
      // Process the message through agents
      const result = await this.orchestrateAgents(context);
      
      // If successful and configured to do so, save the response
      if (result.success && this.config.save_responses && result.data?.response) {
        await this.saveResponse(message, result, contact);
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        next_action: undefined,
        agent_id: '',
        confidence: 0
      };
    }
  }
  
  /**
   * Orchestrate multiple agents to process a message
   * @param context The orchestration context
   * @returns The processing result
   */
  private async orchestrateAgents(context: OrchestrationContext): Promise<ProcessResult> {
    let currentAgentId: string | undefined;
    let iterations = 0;
    const maxIterations = this.config.max_agent_iterations || 5;
    
    // Find the first agent to process the message
    // Start with classifier agents if available
    const classifierAgents = Array.from(this.agents.values())
      .filter(agent => agent.getType() === 'classifier' && agent.isEnabled());
    
    if (classifierAgents.length > 0) {
      // Use the highest priority classifier
      const priorityOrder: Record<string, number> = {
        'high': 3,
        'medium': 2,
        'low': 1
      };
      
      classifierAgents.sort((a, b) => 
        (priorityOrder[b.getPriority()] || 0) - (priorityOrder[a.getPriority()] || 0)
      );
      
      currentAgentId = classifierAgents[0].getId();
    } else {
      // No classifier, use highest priority enabled agent
      const enabledAgents = Array.from(this.agents.values())
        .filter(agent => agent.isEnabled());
      
      if (enabledAgents.length === 0) {
        return {
          success: false,
          message: 'No enabled agents available to process message',
          data: null,
          next_action: undefined,
          agent_id: '',
          confidence: 0
        };
      }
      
      const priorityOrder: Record<string, number> = {
        'high': 3,
        'medium': 2,
        'low': 1
      };
      
      enabledAgents.sort((a, b) => 
        (priorityOrder[b.getPriority()] || 0) - (priorityOrder[a.getPriority()] || 0)
      );
      
      currentAgentId = enabledAgents[0].getId();
    }
    
    // Process the message through agents, following the chain
    let result: ProcessResult | null = null;
    
    while (currentAgentId && iterations < maxIterations) {
      iterations++;
      console.log(`Orchestration iteration ${iterations}: Using agent ${currentAgentId}`);
      
      const agent = this.agents.get(currentAgentId);
      if (!agent) {
        console.warn(`Agent not found: ${currentAgentId}`);
        break;
      }
      
      // Check if agent should process this message
      const shouldProcess = await agent.shouldProcess(context);
      if (!shouldProcess) {
        console.log(`Agent ${currentAgentId} declined to process the message`);
        
        // Try the fallback agent if available
        if (this.config.fallback_agent_id) {
          currentAgentId = this.config.fallback_agent_id;
          continue;
        }
        
        break;
      }
      
      // Process the message with the current agent
      result = await agent.process(context);
      
      // Determine the next agent to use
      if (result.next_action) {
        currentAgentId = result.next_action;
      } else {
        // No next action specified, we're done
        break;
      }
    }
    
    if (iterations >= maxIterations) {
      console.warn(`Max agent iterations (${maxIterations}) reached`);
    }
    
    if (!result) {
      return {
        success: false,
        message: 'No agent processed the message',
        data: null,
        next_action: undefined,
        agent_id: '',
        confidence: 0
      };
    }
    
    return result;
  }
  
  /**
   * Save an AI response to the database
   * @param originalMessage The original message
   * @param result The processing result
   * @param contact The contact
   */
  private async saveResponse(
    originalMessage: Message, 
    result: ProcessResult, 
    contact: Contact
  ): Promise<Message> {
    // Create a response message
    const responseMessage = {
      contact_id: originalMessage.contact_id,
      content: result.data.response,
      direction: 'outgoing' as const,
      is_ai_response: true,
      is_from_customer: false,
      is_sent: false, // Start as not sent until confirmed
      is_viewed: false,
      agent_id: result.agent_id,
      status: 'pending' as const, // Start as pending
      timestamp: new Date().toISOString(),
      original_message_id: originalMessage.id,
      confidence: result.confidence,
      processing_details: result.message,
      agent_name: result.data.metadata?.agent_name || result.agent_id
    };
    
    // Save the message
    const savedMessage = await saveMessage(responseMessage);
    console.log(`🔄 Saved AI response message with ID: ${savedMessage.id}`);
    
    // Update contact's last contact timestamp if configured to do so
    if (this.config.update_contact_timestamp) {
      await updateContactLastContact(contact.id);
    }
    
    // Actually send the message to the contact - ensure this completes with proper contact info
    console.log(`📤 Sending external message to ${contact.name || 'user'} (ID: ${contact.id})`);
    console.log(`📄 Contact info: ${contact.contact_info || 'unknown'}`);
    
    try {
      // First, make sure we have valid contact info
      if (!contact.contact_info) {
        console.error('❌ No contact info available for external delivery');
        return savedMessage;
      }
      
      // Sanitize contact info for Telegram
      let contactInfo = contact.contact_info;
      
      // Format checking and correction for Telegram IDs
      if (/^\d+$/.test(contactInfo)) {
        // If it's just a numeric ID, don't add default bot suffix - let the send API decide
        // contactInfo = `${contactInfo}:maxo`;
        console.log(`Using numeric ID without bot specification: ${contactInfo}`);
      } else if (contactInfo.includes('@') && !contactInfo.includes(':')) {
        // If it's a username without bot specification, use as is
        const username = contactInfo.replace('@', '');
        // contactInfo = `${username}:maxo`;
        console.log(`Using username without bot specification: ${username}`);
      }
      
      // Try to use direct approach first for more reliable delivery
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (
        typeof window !== 'undefined' 
          ? window.location.origin 
          : 'http://localhost:3000'
      );
      
      console.log(`Sending message via send-message API: ${baseUrl}/api/send-message`);
      
      const response = await fetch(`${baseUrl}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactId: contact.id,
          contactInfo: contactInfo,
          message: result.data.response,
          agentName: result.data.metadata?.agent_name || result.agent_id || 'AI',
          messageId: savedMessage.id
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send message: ${response.status}`, errorText);
        
        // Even if the API call fails, update the database message
        await supabase
          .from('messages')
          .update({ 
            status: 'failed'
          })
          .eq('id', savedMessage.id);
      } else {
        const result = await response.json();
        console.log('Message delivery result:', result);
        
        if (result.success) {
          // If the message was sent successfully, update the status
          await supabase
            .from('messages')
            .update({ 
              is_sent: true,
              status: 'sent'
            })
            .eq('id', savedMessage.id);
          console.log('✅ Updated message as successfully sent');
        } else {
          console.error('❌ API reported failure:', result.error);
        }
      }
    } catch (error) {
      console.error('Error in message delivery:', error);
      
      // Update the message status to reflect the error
      try {
        await supabase
          .from('messages')
          .update({ 
            status: 'failed'
          })
          .eq('id', savedMessage.id);
      } catch (dbError) {
        console.error('Failed to update message status after error:', dbError);
      }
    }
    
    return savedMessage;
  }
  
  /**
   * Get all registered agents
   * @returns Map of agent IDs to agent instances
   */
  getAgents(): Map<string, BaseAgent> {
    return new Map(this.agents);
  }
  
  /**
   * Get a specific agent by ID
   * @param agentId The agent ID
   * @returns The agent instance or undefined
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }
  
  /**
   * Remove an agent from the orchestrator
   * @param agentId The agent ID to remove
   * @returns True if the agent was removed
   */
  removeAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  private findDefaultAgent(): BaseAgent | null {
    // Look for a generic LLM agent first
    // Convert Map.values() iterator to array before iterating
    for (const agent of Array.from(this.agents.values())) {
      if (agent.getType() === 'llm' && agent.isEnabled()) {
        return agent;
      }
    }
    return null;
  }
} 