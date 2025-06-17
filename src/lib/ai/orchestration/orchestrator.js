/**
 * AI Orchestration System
 * Main orchestration module that connects all components
 */

const config = require('../utils/env-config');
const supabaseClient = require('../utils/supabase-client');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

/**
 * Orchestrator class for managing AI agent interactions
 */
class Orchestrator {
  constructor() {
    this.agents = [];
    this.initialized = false;
  }

  /**
   * Initialize the orchestrator
   * Loads agents from Supabase
   */
  async initialize() {
    try {
      // Check if environment variables are set
      if (!config.checkRequiredVars()) {
        console.error('Cannot initialize orchestrator: Missing required environment variables');
        return false;
      }

      // Load agents from Supabase
      this.agents = await supabaseClient.getAgents();
      console.log(`Loaded ${this.agents.length} agents`);

      // Filter out disabled agents
      this.agents = this.agents.filter(agent => agent.enabled);
      console.log(`Using ${this.agents.length} enabled agents`);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing orchestrator:', error);
      return false;
    }
  }

  /**
   * Score agent relevance for a message
   * @param {string} message - The message content
   * @param {object} agent - The agent to score
   * @returns {number} - The relevance score
   */
  scoreAgentRelevance(message, agent) {
    if (!message || !agent) return 0;
    
    const messageContent = message.toLowerCase();
    const agentName = agent.name.toLowerCase();
    const agentDescription = agent.description ? agent.description.toLowerCase() : '';
    
    let score = 0;
    
    // Special case scoring based on message content and agent type
    if (messageContent.includes('computer') || 
        messageContent.includes('troubleshoot') || 
        messageContent.includes('technical') || 
        messageContent.includes('help me')) {
      if (agentName.includes('support')) {
        score += 5;
      }
    }
    
    if (messageContent.includes('cost') || 
        messageContent.includes('price') || 
        messageContent.includes('discount') || 
        messageContent.includes('how much')) {
      if (agentName.includes('sales')) {
        score += 5;
      }
    }
    
    if (messageContent.includes('weather') || 
        (messageContent.includes('tell me about') && !messageContent.includes('product'))) {
      if (agentName.includes('general')) {
        score += 5;
      }
    }
    
    // Name matching (higher weight)
    if (messageContent.includes(agentName)) {
      score += 3;
    }
    
    // Description matching
    if (agentDescription) {
      const descWords = agentDescription.split(/\s+/);
      for (const word of descWords) {
        if (word && word.length > 3 && messageContent.includes(word)) {
          score += 1;
        }
      }
    }
    
    return score;
  }

  /**
   * Find the best agent for a message
   * @param {string} message - The message content
   * @returns {object|null} - The best matching agent or null if none found
   */
  findBestAgent(message) {
    if (!this.initialized) {
      console.error('Orchestrator not initialized');
      return null;
    }
    
    if (!this.agents || this.agents.length === 0) {
      console.error('No agents available');
      return null;
    }
    
    // Calculate scores for all agents
    const scoredAgents = this.agents.map(agent => ({
      agent,
      score: this.scoreAgentRelevance(message, agent)
    }));
    
    // Sort by score in descending order
    scoredAgents.sort((a, b) => b.score - a.score);
    
    // Return the highest scoring agent if score > 0
    if (scoredAgents.length > 0 && scoredAgents[0].score > 0) {
      return scoredAgents[0].agent;
    }
    
    // If no good match, return the first agent as default
    return this.agents[0];
  }

  /**
   * Generate a response for a message using a specific agent
   * @param {string} message - The message content
   * @param {object} agent - The agent to use for response generation
   * @returns {string} - The generated response
   */
  async generateResponse(message, agent) {
    if (!message || !agent) {
      console.error('Missing message or agent for response generation');
      return 'Error: Missing message or agent';
    }
    
    try {
      // Create system prompt using agent information
      const systemPrompt = `You are ${agent.name}. ${agent.description || ''}
      
      You are a chatbot for Bladex AI.
      Keep responses concise and helpful.
      Be friendly and professional.
      `;
      
      // Call Claude API
      const response = await anthropic.messages.create({
        model: agent.model || 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      });
      
      // Extract response text
      return response.content[0].text;
    } catch (error) {
      console.error('Error generating response:', error);
      return `Error: ${error.message}`;
    }
  }

  /**
   * Process an unviewed message
   * @param {object} messageData - The message data with id, content, etc.
   * @returns {object} - The processed result with agent and response
   */
  async processMessage(messageData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const messageId = messageData.id;
      const messageContent = messageData.content;
      const contactId = messageData.contact_id;
      
      console.log(`Processing message ${messageId} from contact ${contactId}`);
      
      // Find the best agent for this message
      const agent = this.findBestAgent(messageContent);
      
      if (!agent) {
        console.error('No agent found for message');
        return {
          success: false,
          error: 'No agent found'
        };
      }
      
      console.log(`Selected agent: ${agent.name}`);
      
      // Generate response
      const response = await this.generateResponse(messageContent, agent);
      
      // Mark message as viewed
      await supabaseClient.markMessageAsViewed(messageId);
      
      // Construct result
      const result = {
        success: true,
        message_id: messageId,
        contact_id: contactId,
        original_message: messageContent,
        agent_id: agent.id,
        agent_name: agent.name,
        response: response,
        processed_at: new Date().toISOString()
      };
      
      return result;
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process all unviewed messages
   * @returns {Array} - Array of processed message results
   */
  async processUnviewedMessages() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Get unviewed messages
      const messages = await supabaseClient.getUnviewedMessages();
      console.log(`Found ${messages.length} unviewed messages to process`);
      
      if (messages.length === 0) {
        return [];
      }
      
      // Process each message
      const results = [];
      
      for (const message of messages) {
        const messageData = {
          id: message.message_id,
          content: message.message_content,
          contact_id: message.contact_id,
          contact_name: message.contact_name
        };
        
        const result = await this.processMessage(messageData);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error processing unviewed messages:', error);
      return [];
    }
  }
}

module.exports = {
  Orchestrator
}; 