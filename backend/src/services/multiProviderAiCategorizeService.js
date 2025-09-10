/**
 * Multi-Provider AI Categorization Service
 * 
 * This service provides email categorization and reply suggestion using multiple AI providers.
 * It supports:
 * - DeepSeek (default)
 * - OpenAI
 * - Ollama (local)
 * - Groq
 * - Mistral AI
 * - Anthropic Claude
 * - Rule-based fallback
 */

const axios = require('axios');
const logger = require('../utils/logger');

class MultiProviderAICategorizeService {
  constructor() {
    // Initialize with available configuration
    this.providers = {
      deepseek: {
        enabled: !!process.env.DEEPSEEK_API_KEY,
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        endpoint: '/v1/chat/completions',
        compatibleFormat: 'openai'
      },
      openai: {
        enabled: !!process.env.OPENAI_API_KEY,
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        endpoint: '/v1/chat/completions',
        compatibleFormat: 'openai'
      },
      ollama: {
        enabled: process.env.OLLAMA_API_BASE_URL ? true : false,
        baseURL: process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama2',
        endpoint: '/api/chat',
        compatibleFormat: 'ollama'
      },
      groq: {
        enabled: !!process.env.GROQ_API_KEY,
        apiKey: process.env.GROQ_API_KEY,
        baseURL: process.env.GROQ_API_BASE_URL || 'https://api.groq.com',
        model: process.env.GROQ_MODEL || 'llama3-8b-8192',
        endpoint: '/openai/v1/chat/completions',
        compatibleFormat: 'openai'
      },
      mistral: {
        enabled: !!process.env.MISTRAL_API_KEY,
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: process.env.MISTRAL_API_BASE_URL || 'https://api.mistral.ai',
        model: process.env.MISTRAL_MODEL || 'mistral-tiny',
        endpoint: '/v1/chat/completions',
        compatibleFormat: 'openai'
      },
      anthropic: {
        enabled: !!process.env.ANTHROPIC_API_KEY,
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        endpoint: '/v1/messages',
        compatibleFormat: 'anthropic'
      }
    };

    // Determine active provider
    this.activeProvider = this.selectActiveProvider();

    if (!this.activeProvider) {
      logger.warn('No AI provider configured. Using rule-based categorization only.');
    } else {
      logger.info(`AI categorization initialized with provider: ${this.activeProvider}`);
    }

    // Initialize categories
    this.categories = [
      'Interested',
      'Meeting Booked',
      'Not Interested',
      'Spam',
      'Out of Office'
    ];

    // Initialize rules for fallback categorization
    this.initializeRules();
  }

  /**
   * Select the active provider based on availability
   */
  selectActiveProvider() {
    // Check each provider in order of preference
    const preferredOrder = ['deepseek', 'groq', 'ollama', 'mistral', 'anthropic', 'openai'];
    
    for (const provider of preferredOrder) {
      if (this.providers[provider] && this.providers[provider].enabled) {
        return provider;
      }
    }
    
    return null;
  }

  /**
   * Initialize rules for fallback categorization
   */
  initializeRules() {
    this.rules = {
      'Interested': [
        'interested', 'tell me more', 'sounds good', 'learn more', 
        'would like to', 'interested in', 'send me', 'demo',
        'want to know', 'pricing', 'quote', 'proposal'
      ],
      'Meeting Booked': [
        'calendar', 'schedule', 'meeting', 'appointment', 
        'book a', 'booked', 'meet', 'let\'s meet', 
        'calendar invite', 'scheduled', 'time to talk',
        'confirmed', 'accepted invitation'
      ],
      'Not Interested': [
        'not interested', 'no thanks', 'unsubscribe', 'opt out',
        'remove me', 'stop contacting', 'don\'t contact', 'no longer',
        'not a fit', 'not at this time', 'decline', 'pass'
      ],
      'Spam': [
        'viagra', 'pharmacy', 'lottery', 'winner', 'prince',
        'inheritance', 'bank transfer', 'prize', 'click here',
        'cryptocurrency', 'investment opportunity', 'bitcoin'
      ],
      'Out of Office': [
        'out of office', 'vacation', 'holiday', 'away from my desk',
        'annual leave', 'maternity leave', 'paternity leave', 'sabbatical',
        'will return', 'automatic reply', 'auto-reply', 'autoreply'
      ]
    };
  }

  /**
   * Categorize an email using AI or fallback to rule-based approach
   * @param {Object} email - The email object to categorize
   * @returns {Promise<Object>} - The categorization result with category and reply suggestions
   */
  async categorizeEmail(email) {
    // If no provider is active, use rule-based approach
    if (!this.activeProvider) {
      return this.categorizeWithRules(email);
    }

    try {
      // Attempt to categorize with AI
      return await this.categorizeWithAI(email);
    } catch (error) {
      logger.error(`AI categorization failed: ${error.message}`);
      logger.info('Falling back to rule-based categorization');
      
      // Fallback to rule-based categorization
      return this.categorizeWithRules(email);
    }
  }

  /**
   * Categorize an email using the active AI provider
   * @param {Object} email - The email object to categorize
   * @returns {Promise<Object>} - The categorization result with category and reply suggestions
   */
  async categorizeWithAI(email) {
    const provider = this.providers[this.activeProvider];
    
    if (!provider || !provider.enabled) {
      throw new Error(`Provider ${this.activeProvider} is not available`);
    }

    // Extract email content
    const { subject = '', from = '', body = '' } = email;
    
    // Prepare the prompt
    const prompt = `
I need you to analyze this email and determine the category from the following options: ${this.categories.join(', ')}.
Also, generate 3 different reply suggestions for this email.

Email:
From: ${from}
Subject: ${subject}
Body:
${body}

Return the result in the following JSON format exactly:
{
  "category": "one of the categories",
  "reasoning": "brief explanation for the categorization",
  "replies": [
    "first reply suggestion",
    "second reply suggestion",
    "third reply suggestion"
  ]
}
`;

    try {
      // Make the API request based on the provider's format
      let response;
      
      switch (provider.compatibleFormat) {
        case 'openai':
          response = await this.makeOpenAIRequest(provider, prompt);
          break;
        case 'anthropic':
          response = await this.makeAnthropicRequest(provider, prompt);
          break;
        case 'ollama':
          response = await this.makeOllamaRequest(provider, prompt);
          break;
        default:
          throw new Error(`Unknown provider format: ${provider.compatibleFormat}`);
      }

      // Parse and validate the response
      return this.parseAIResponse(response);
    } catch (error) {
      logger.error(`Error with ${this.activeProvider} API:`, error);
      throw error;
    }
  }

  /**
   * Make an OpenAI-compatible API request
   * @param {Object} provider - The provider configuration
   * @param {string} prompt - The prompt to send
   * @returns {Promise<Object>} - The API response
   */
  async makeOpenAIRequest(provider, prompt) {
    const requestData = {
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    };

    const response = await axios.post(
      `${provider.baseURL}${provider.endpoint}`,
      requestData,
      { headers }
    );

    return response.data?.choices?.[0]?.message?.content;
  }

  /**
   * Make an Anthropic API request
   * @param {Object} provider - The provider configuration
   * @param {string} prompt - The prompt to send
   * @returns {Promise<Object>} - The API response
   */
  async makeAnthropicRequest(provider, prompt) {
    const requestData = {
      model: provider.model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    };

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01'
    };

    const response = await axios.post(
      `${provider.baseURL}${provider.endpoint}`,
      requestData,
      { headers }
    );

    return response.data?.content?.[0]?.text;
  }

  /**
   * Make an Ollama API request
   * @param {Object} provider - The provider configuration
   * @param {string} prompt - The prompt to send
   * @returns {Promise<Object>} - The API response
   */
  async makeOllamaRequest(provider, prompt) {
    const requestData = {
      model: provider.model,
      messages: [{ role: 'user', content: prompt }]
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    const response = await axios.post(
      `${provider.baseURL}${provider.endpoint}`,
      requestData,
      { headers }
    );

    return response.data?.message?.content;
  }

  /**
   * Parse and validate the AI response
   * @param {string} responseContent - The content from the AI response
   * @returns {Object} - The parsed categorization result
   */
  parseAIResponse(responseContent) {
    try {
      // Find JSON in the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      let parsedResponse;
      
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }

      // Validate the response format
      if (!parsedResponse.category || !this.categories.includes(parsedResponse.category)) {
        logger.warn(`Invalid category in AI response: ${parsedResponse.category}`);
        parsedResponse.category = this.categories[0]; // Default to first category
      }

      // Ensure replies is an array with at least one item
      if (!Array.isArray(parsedResponse.replies) || parsedResponse.replies.length === 0) {
        logger.warn('No valid replies in AI response, generating default replies');
        parsedResponse.replies = ['Thank you for your email. I will get back to you shortly.'];
      }

      return {
        category: parsedResponse.category,
        reasoning: parsedResponse.reasoning || 'AI categorization',
        replies: parsedResponse.replies
      };
    } catch (error) {
      logger.error(`Failed to parse AI response: ${error.message}`);
      
      // Provide a default response
      return {
        category: this.categories[0],
        reasoning: 'Failed to parse AI response, using default',
        replies: ['Thank you for your email. I will get back to you shortly.']
      };
    }
  }

  /**
   * Categorize an email using rule-based approach
   * @param {Object} email - The email object to categorize
   * @returns {Object} - The categorization result
   */
  categorizeWithRules(email) {
    const { subject = '', body = '' } = email;
    const combinedText = (subject + ' ' + body).toLowerCase();
    
    let bestCategory = null;
    let maxMatches = 0;
    
    // Find category with most keyword matches
    for (const [category, keywords] of Object.entries(this.rules)) {
      const matches = keywords.filter(keyword => 
        combinedText.includes(keyword.toLowerCase())
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    }
    
    // If no matches, default to "Interested"
    if (!bestCategory) {
      bestCategory = 'Interested';
    }
    
    // Generate generic replies based on category
    const replies = this.generateRepliesForCategory(bestCategory);
    
    return {
      category: bestCategory,
      reasoning: `Rule-based categorization (matched ${maxMatches} keywords)`,
      replies: replies
    };
  }

  /**
   * Generate generic replies for a category
   * @param {string} category - The email category
   * @returns {Array<string>} - Array of reply suggestions
   */
  generateRepliesForCategory(category) {
    const replies = {
      'Interested': [
        'Thank you for your interest! I would be happy to provide more information about our product/service.',
        'Great to hear from you! Let me know what specific aspects you would like to learn more about.',
        'Thanks for reaching out. I would love to schedule a call to discuss how we can help you.'
      ],
      'Meeting Booked': [
        'I have confirmed our meeting and look forward to speaking with you soon.',
        'Thank you for booking the meeting. I have added it to my calendar and will be prepared.',
        'Looking forward to our upcoming meeting. Please let me know if you need to make any changes.'
      ],
      'Not Interested': [
        'Thank you for letting me know. I appreciate your consideration.',
        'I understand that this isn\'t the right fit right now. Would it be okay if I check back in 6 months?',
        'Thank you for your response. Please don\'t hesitate to reach out if your needs change in the future.'
      ],
      'Spam': [
        'This email has been marked as spam and will not be replied to.',
        'Our system has flagged this message as spam. No action needed.',
        'This message appears to be spam and has been filtered.'
      ],
      'Out of Office': [
        'Thank you for your email. I\'ll follow up when the recipient returns to the office.',
        'I see this is an out-of-office reply. I\'ll wait until they return before following up.',
        'Thank you for letting me know you\'re away. I\'ll reach out when you return.'
      ]
    };
    
    return replies[category] || [
      'Thank you for your email. I will get back to you shortly.'
    ];
  }

  /**
   * Get provider status information
   * @returns {Object} - Information about available providers and their status
   */
  getProviderStatus() {
    const result = {
      activeProvider: this.activeProvider,
      availableProviders: {}
    };

    for (const [name, provider] of Object.entries(this.providers)) {
      result.availableProviders[name] = {
        enabled: provider.enabled,
        model: provider.model
      };
    }

    return result;
  }
}

module.exports = new MultiProviderAICategorizeService();
