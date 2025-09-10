/**
 * PuterDeepSeekService
 * 
 * Provides a way to use Puter.js for DeepSeek API access in a browser environment.
 * This is a hybrid approach that can work in both Node.js and browser environments.
 * 
 * In browser: Uses Puter.js to access DeepSeek models without API keys
 * In Node.js: Falls back to rule-based categorization or other providers
 */

// For browser environment
let isPuter = false;
let puterAI = null;

// Check if we're in a browser environment with Puter.js
if (typeof window !== 'undefined' && window.puter && window.puter.ai) {
  isPuter = true;
  puterAI = window.puter.ai;
  console.log('Puter.js detected and initialized for DeepSeek access');
}

/**
 * PuterDeepSeekService class for integrating with Puter.js
 */
class PuterDeepSeekService {
  constructor() {
    this.isAvailable = isPuter;
    
    // Initialize categories for email classification
    this.categories = [
      'Interested',
      'Meeting Booked', 
      'Not Interested',
      'Spam',
      'Out of Office'
    ];
    
    // Initialize rule-based fallback
    this.initializeRules();
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
   * Check if Puter.js is available
   * @returns {boolean} - Whether Puter.js is available
   */
  isPuterAvailable() {
    return this.isAvailable;
  }
  
  /**
   * Try to load Puter.js dynamically
   * Note: This only works in browser environments
   */
  static async loadPuter() {
    if (typeof window === 'undefined') {
      console.log('Cannot load Puter.js in a Node.js environment');
      return false;
    }
    
    if (window.puter && window.puter.ai) {
      return true;
    }
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.onload = () => {
        if (window.puter && window.puter.ai) {
          isPuter = true;
          puterAI = window.puter.ai;
          resolve(true);
        } else {
          resolve(false);
        }
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
  
  /**
   * Categorize an email using Puter.js and DeepSeek models
   * @param {Object} email - The email to categorize
   * @returns {Promise<Object>} - The categorization result
   */
  async categorizeEmail(email) {
    // If Puter.js is not available, use rule-based approach
    if (!this.isAvailable) {
      console.log('Puter.js not available, using rule-based categorization');
      return this.categorizeWithRules(email);
    }
    
    try {
      const { subject = '', from = '', body = '' } = email;
      
      // Create prompt for the model
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

      // Use Puter.js to call DeepSeek
      const response = await puterAI.chat(prompt, {
        model: 'deepseek-reasoner', // Use reasoner for better results
        stream: false
      });
      
      // Extract content from response
      const content = response.message.content;
      
      // Parse the JSON response
      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error using Puter.js:', error);
      
      // Fallback to rule-based categorization
      return this.categorizeWithRules(email);
    }
  }
  
  /**
   * Parse the AI response from Puter.js
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
        console.warn(`Invalid category in AI response: ${parsedResponse.category}`);
        parsedResponse.category = this.categories[0]; // Default to first category
      }

      // Ensure replies is an array with at least one item
      if (!Array.isArray(parsedResponse.replies) || parsedResponse.replies.length === 0) {
        console.warn('No valid replies in AI response, generating default replies');
        parsedResponse.replies = ['Thank you for your email. I will get back to you shortly.'];
      }

      return {
        category: parsedResponse.category,
        reasoning: parsedResponse.reasoning || 'AI categorization',
        replies: parsedResponse.replies
      };
    } catch (error) {
      console.error(`Failed to parse AI response: ${error.message}`);
      
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
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PuterDeepSeekService,
    isPuterAvailable: isPuter
  };
}

// Make available in browser environments
if (typeof window !== 'undefined') {
  window.PuterDeepSeekService = PuterDeepSeekService;
}
