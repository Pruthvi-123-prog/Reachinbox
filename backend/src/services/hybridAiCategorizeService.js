/**
 * Modified AI Categorize Service that can integrate with Puter.js
 * 
 * This service provides email categorization with the following prioritized approach:
 * 1. Use Puter.js in browser environments (client-side)
 * 2. Use direct DeepSeek API or another provider on the server
 * 3. Fall back to rule-based categorization
 */

const { default: axios } = require('axios');
const logger = require('../utils/logger');

class HybridAICategorizeService {
  constructor() {
    // API configuration from environment variables
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.deepseekApiBaseUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com';
    
    // Initialize categories for email classification
    this.categories = [
      'Interested',
      'Meeting Booked', 
      'Not Interested',
      'Spam',
      'Out of Office'
    ];
    
    // Initialize rules for fallback categorization
    this.initializeRules();
    
    // Log initialization status
    if (this.deepseekApiKey) {
      logger.info('HybridAICategorizeService initialized with DeepSeek API');
    } else {
      logger.warn('HybridAICategorizeService initialized without DeepSeek API - using rule-based categorization');
    }
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
   * Categorize an email
   * @param {Object} email - The email object
   * @param {Object} options - Additional options like isPuter flag
   * @returns {Promise<Object>} - The categorization result
   */
  async categorizeEmail(email, options = {}) {
    // Check for Puter.js flag (would be set in frontend)
    const isPuter = options.isPuter === true;
    
    // If this is a Puter.js request, return a special response
    // The actual categorization happens on the client side
    if (isPuter) {
      logger.info('Request flagged for Puter.js - returning empty response for client-side processing');
      return {
        category: 'TO_BE_PROCESSED_BY_CLIENT',
        confidence: 1.0,
        replies: []
      };
    }
    
    try {
      // Try to use DeepSeek API
      if (this.deepseekApiKey) {
        return await this.categorizeWithDeepSeek(email);
      }
    } catch (error) {
      logger.error(`AI categorization failed: ${error.message}`);
      logger.info('Falling back to rule-based categorization');
    }
    
    // Fallback to rule-based categorization
    return this.categorizeWithRules(email);
  }
  
  /**
   * Categorize an email using DeepSeek API
   * @param {Object} email - The email object
   * @returns {Promise<Object>} - The categorization result
   */
  async categorizeWithDeepSeek(email) {
    const { subject = '', from = '', body = '' } = email;
    
    // Create the prompt
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
    {
      "subject": "Re: ${subject}",
      "body": "first reply suggestion"
    },
    {
      "subject": "Re: ${subject}",
      "body": "second reply suggestion"
    },
    {
      "subject": "Re: ${subject}",
      "body": "third reply suggestion"
    }
  ]
}
`;

    try {
      // Call the DeepSeek API
      const response = await axios.post(`${this.deepseekApiBaseUrl}/v1/chat/completions`, {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Extract the response
      const responseContent = response.data?.choices?.[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from DeepSeek API');
      }
      
      // Parse the JSON response
      const result = this.parseAIResponse(responseContent);
      
      // Add confidence score
      result.confidence = 0.9; // DeepSeek doesn't provide confidence, so we set a high default
      
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      logger.error(`DeepSeek API error: ${errorMessage}`);
      
      // Rethrow with more specific message
      if (errorMessage.includes('Insufficient Balance')) {
        throw new Error('Insufficient Balance: DeepSeek API key has insufficient balance');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed: Invalid DeepSeek API key');
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Parse the AI response to extract structured data
   * @param {string} responseContent - The AI response content
   * @returns {Object} - Structured categorization data
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
        parsedResponse.replies = [
          {
            subject: 'Re: (No Subject)',
            body: 'Thank you for your email. I will get back to you shortly.'
          }
        ];
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
        replies: [
          {
            subject: 'Re: (No Subject)',
            body: 'Thank you for your email. I will get back to you shortly.'
          }
        ]
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
    const replies = this.generateRepliesForCategory(bestCategory, email);
    
    return {
      category: bestCategory,
      reasoning: `Rule-based categorization (matched ${maxMatches} keywords)`,
      confidence: maxMatches > 0 ? 0.6 : 0.4, // Lower confidence for rule-based
      replies: replies
    };
  }
  
  /**
   * Generate generic replies for a category
   * @param {string} category - The email category
   * @param {Object} email - The original email
   * @returns {Array<Object>} - Array of reply suggestions with subject and body
   */
  generateRepliesForCategory(category, email) {
    const subject = email.subject || '(No Subject)';
    const replySubject = `Re: ${subject}`;
    
    const templates = {
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
    
    // Get the template for this category or use default
    const bodyTemplates = templates[category] || [
      'Thank you for your email. I will get back to you shortly.',
      'I appreciate your message. I\'ll respond in detail soon.',
      'Thanks for contacting us. We\'ll be in touch shortly.'
    ];
    
    // Convert to required format with subject and body
    return bodyTemplates.map(body => ({
      subject: replySubject,
      body: body
    }));
  }
}

module.exports = new HybridAICategorizeService();
