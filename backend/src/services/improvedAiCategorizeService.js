/**
 * Improved DeepSeek AI Service Implementation
 * This file contains a complete implementation of the AI categorization service
 * that can replace the existing service if needed
 */

const axios = require('axios');
const { logger } = require('../utils/logger');
const { EmailMessage, EmailCategory } = require('../models/email');

class ImprovedAICategorizeService {
  constructor() {
    this.isEnabled = false;
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.baseURL = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com';
    this.isInsufficientBalance = false;
    
    // Initialize the service
    this.initialize();
  }
  
  async initialize() {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        logger.warn('DeepSeek API key not found in environment variables');
        this.isEnabled = false;
        return;
      }
      
      // Clean up the API key (remove any escape characters or whitespace)
      this.apiKey = this.apiKey.replace(/\\+/g, '').trim();
      
      // Validate the API key format
      if (!this.apiKey.startsWith('sk-') || this.apiKey.length < 20) {
        logger.warn('Invalid DeepSeek API key format');
        this.isEnabled = false;
        return;
      }
      
      // Test the API key with a simple request
      const isValid = await this.testApiKey();
      
      if (isValid) {
        logger.info('DeepSeek AI service initialized successfully with valid API key');
        this.isEnabled = true;
      } else {
        if (this.isInsufficientBalance) {
          logger.warn('DeepSeek API key has insufficient balance. Using enhanced rule-based categorization instead.');
        } else {
          logger.warn('DeepSeek API key validation failed. Using enhanced rule-based categorization instead.');
        }
        this.isEnabled = false;
      }
    } catch (error) {
      logger.error('Failed to initialize AI categorization service:', error);
      this.isEnabled = false;
    }
  }
  
  async testApiKey() {
    try {
      // Very small test request
      const response = await this.makeApiRequest({
        model: this.model,
        messages: [
          { role: 'user', content: 'Test' }
        ],
        max_tokens: 5
      });
      
      return true;
    } catch (error) {
      if (error.status === 402 || error.message.includes('Insufficient Balance')) {
        logger.error('DeepSeek API key has insufficient balance');
        this.isInsufficientBalance = true;
      } else if (error.status === 401 || error.message.includes('authentication')) {
        logger.error('DeepSeek API key is invalid or unauthorized');
      } else {
        logger.error('DeepSeek API key validation failed:', error);
      }
      
      return false;
    }
  }
  
  async makeApiRequest(data) {
    try {
      const response = await axios({
        method: 'post',
        url: `${this.baseURL}/v1/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        data: data
      });
      
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      // Create a standardized error object
      const standardError = {
        status: status || 500,
        message: errorData?.error?.message || error.message,
        type: errorData?.error?.type || 'api_error',
        raw: errorData || error
      };
      
      // Handle specific error types
      if (status === 402 || standardError.message.includes('Insufficient Balance')) {
        this.isInsufficientBalance = true;
        standardError.type = 'insufficient_balance';
      } else if (status === 401) {
        standardError.type = 'authentication_error';
      } else if (status === 429) {
        standardError.type = 'rate_limit_error';
      }
      
      throw standardError;
    }
  }
  
  async categorizeEmail(email) {
    // Skip categorization if service is disabled
    if (!this.isEnabled) {
      logger.debug(`AI service is disabled, using rule-based categorization for email ${email.id}`);
      return this.ruleBasedCategorization(email);
    }
    
    try {
      const prompt = this.buildCategorizationPrompt(email);
      
      const response = await this.makeApiRequest({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });
      
      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw { message: 'No response content from DeepSeek API' };
      }
      
      const categorization = JSON.parse(result);
      
      // Validate and map the category
      const mappedCategory = this.mapCategory(categorization.category);
      
      return {
        category: mappedCategory,
        confidence: Math.min(Math.max(categorization.confidence || 0.7, 0), 1),
        reasoning: categorization.reasoning || 'AI-based categorization'
      };
    } catch (error) {
      logger.error(`Failed to categorize email ${email.id}:`, error);
      
      // Disable the service for certain error types
      if (error.type === 'insufficient_balance' || error.type === 'authentication_error') {
        this.isEnabled = false;
      }
      
      // Fall back to rule-based categorization
      return this.ruleBasedCategorization(email);
    }
  }
  
  async generateSuggestedReply(email, context = [], productInfo) {
    // Skip if service is disabled
    if (!this.isEnabled) {
      if (this.isInsufficientBalance) {
        logger.warn(`DeepSeek API has insufficient balance, using fallback reply for email ${email.id}`);
      } else {
        logger.warn(`AI service is disabled, using fallback reply for email ${email.id}`);
      }
      return this.generateFallbackReply(email);
    }
    
    try {
      const contextPrompt = this.buildReplyPrompt(email, context, productInfo);
      
      const response = await this.makeApiRequest({
        model: this.model,
        messages: [
          { role: 'system', content: this.getReplySystemPrompt() },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw { message: 'No response content from DeepSeek API' };
      }
      
      const reply = JSON.parse(result);
      
      // Ensure confidence is within valid range
      const normalizedConfidence = Math.min(Math.max(reply.confidence || 0.7, 0), 1);
      
      return {
        category: reply.category || EmailCategory.INTERESTED,
        confidence: normalizedConfidence,
        replies: Array.isArray(reply.replies) && reply.replies.length > 0 
          ? reply.replies.map(r => ({
              subject: r.subject || `Re: ${email.subject || ''}`,
              body: r.body || ''
            }))
          : [{ 
              subject: `Re: ${email.subject || ''}`, 
              body: "Thank you for your email. I'll get back to you shortly." 
            }]
      };
    } catch (error) {
      logger.error(`Failed to generate reply for email ${email.id}:`, error);
      
      // Disable the service for certain error types
      if (error.type === 'insufficient_balance' || error.type === 'authentication_error') {
        this.isEnabled = false;
      }
      
      return this.generateFallbackReply(email);
    }
  }
  
  ruleBasedCategorization(email) {
    let category = EmailCategory.INTERESTED; // Default to INTERESTED
    let confidence = 0.7;
    
    // Extract text for categorization
    const subject = email.subject?.toLowerCase() || '';
    const body = email.bodyText?.toLowerCase() || '';
    
    // Apply rules for each category
    if (subject.includes('meeting') || subject.includes('call scheduled') || 
        body.includes('schedule a call') || body.includes('appointment') || 
        body.includes('zoom') || body.includes('google meet') || 
        body.includes('microsoft teams') || body.includes('calendar') ||
        body.includes('booking confirmed') || body.includes('meeting confirmation')) {
      category = EmailCategory.MEETING_BOOKED;
      confidence = 0.9;
    } else if (subject.includes('out of office') || subject.includes('ooo') || 
        body.includes('out of office') || body.includes('on vacation') || 
        body.includes('will return') || body.includes('auto reply') ||
        body.includes('away from my desk') || body.includes('automatic reply') ||
        body.includes('absence') || body.includes('not in office')) {
      category = EmailCategory.OUT_OF_OFFICE;
      confidence = 0.9;
    } else if (subject.includes('interested') || body.includes('interested') || 
        body.includes('follow up') || body.includes('looking forward') ||
        body.includes('would like to learn more') || body.includes('sounds good') ||
        body.includes('please tell me more') || body.includes('more information') ||
        body.includes('pricing') || body.includes('demo')) {
      category = EmailCategory.INTERESTED;
      confidence = 0.85;
    } else if (body.includes('not interested') || body.includes('no thanks') || 
        body.includes('unsubscribe') || body.includes('stop contacting') ||
        body.includes('remove me') || body.includes('don\'t contact') ||
        body.includes('do not contact') || body.includes('decline') ||
        subject.includes('unsubscribe') || subject.includes('remove')) {
      category = EmailCategory.NOT_INTERESTED;
      confidence = 0.85;
    } else if (subject.match(/^\s*(?:re:\s*)*\s*viagra|cialis|free\s+money|lottery|winner|prize|millions|inheritance|bank\s+transfer|urgent/i) ||
        body.match(/(?:viagra|cialis|free\s+money|lottery|winner|click\s+here|urgent\s+reply|bank\s+transfer|nigerian|millions|inheritance)/i) ||
        subject.includes('!!!') || subject.includes('$$$') ||
        body.includes('crypto') || body.includes('bitcoin') || body.includes('investment opportunity')) {
      category = EmailCategory.SPAM;
      confidence = 0.9;
    }
    
    return {
      category: category,
      confidence: confidence,
      reasoning: 'Rule-based categorization (AI service unavailable)'
    };
  }
  
  generateFallbackReply(email) {
    let subject = `Re: ${email.subject}`;
    let category = email.category || EmailCategory.INTERESTED;
    let replies = [];
    
    // Create multiple fallback reply variations based on the category
    switch(category) {
      case EmailCategory.INTERESTED:
        replies.push({
          subject: subject,
          body: `Hi ${email.sender.name || 'there'},\n\nThank you for your interest in our product. I'd be happy to provide more information. Could we schedule a quick call to discuss your specific needs?\n\nBest regards,\n[Your Name]`
        });
        replies.push({
          subject: subject,
          body: `Hello ${email.sender.name || 'there'},\n\nThanks for your interest in our product. I'd be happy to schedule a call to discuss how we can meet your needs.\n\nKind regards,\n[Your Name]`
        });
        replies.push({
          subject: subject,
          body: `Dear ${email.sender.name || 'there'},\n\nI appreciate your interest in our services. Would you be available for a brief discussion to explore how we can best assist you?\n\nSincerely,\n[Your Name]`
        });
        break;
        
      case EmailCategory.MEETING_BOOKED:
        replies.push({
          subject: subject,
          body: `Hi ${email.sender.name || 'there'},\n\nI'm looking forward to our scheduled meeting. If you need to make any changes to the time, please let me know.\n\nBest regards,\n[Your Name]`
        });
        replies.push({
          subject: subject,
          body: `Hello ${email.sender.name || 'there'},\n\nI'm looking forward to our upcoming meeting. I've added it to my calendar and will be prepared to discuss your requirements.\n\nKind regards,\n[Your Name]`
        });
        break;
        
      case EmailCategory.NOT_INTERESTED:
        replies.push({
          subject: subject,
          body: `Hi ${email.sender.name || 'there'},\n\nThank you for considering our product. I understand it may not be the right fit at this time. If your needs change in the future, please don't hesitate to reach out.\n\nBest regards,\n[Your Name]`
        });
        replies.push({
          subject: subject,
          body: `Hello ${email.sender.name || 'there'},\n\nI appreciate your candid feedback. If circumstances change in the future, please don't hesitate to reach out.\n\nKind regards,\n[Your Name]`
        });
        break;
        
      case EmailCategory.SPAM:
        replies.push({
          subject: subject,
          body: `This message appears to be spam. No response necessary.`
        });
        break;
        
      case EmailCategory.OUT_OF_OFFICE:
        replies.push({
          subject: subject,
          body: `This is an out-of-office reply. No immediate response necessary.`
        });
        break;
        
      default:
        replies.push({
          subject: subject,
          body: `Hi ${email.sender.name || 'there'},\n\nThank you for your email. I've received your message and will respond shortly.\n\nBest regards,\n[Your Name]`
        });
        replies.push({
          subject: subject,
          body: `Hello ${email.sender.name || 'there'},\n\nI wanted to acknowledge receipt of your email. I'll review it and get back to you as soon as possible.\n\nKind regards,\n[Your Name]`
        });
        replies.push({
          subject: subject,
          body: `Dear ${email.sender.name || 'there'},\n\nThanks for your message. I'll look into this and respond to your inquiry shortly.\n\nSincerely,\n[Your Name]`
        });
    }
    
    // Ensure we have at least one reply
    if (replies.length === 0) {
      replies.push({
        subject: subject,
        body: `Thank you for your email. I'll respond soon.\n\nBest regards,\n[Your Name]`
      });
    }
    
    return {
      category: category,
      confidence: 0.5, // Lower confidence for fallback replies
      replies: replies
    };
  }
  
  buildCategorizationPrompt(email) {
    // Ensure date is properly formatted
    const dateStr = email.date instanceof Date 
      ? email.date.toISOString() 
      : typeof email.date === 'string' 
        ? email.date 
        : new Date().toISOString();
    
    return `
Please categorize this email:

Subject: ${email.subject || '(No Subject)'}
From: ${email.sender?.name || ''} <${email.sender?.address || 'unknown@example.com'}>
Date: ${dateStr}

Body:
${email.bodyText || '(No content)'}
`;
  }
  
  buildReplyPrompt(email, context = [], productInfo) {
    // Ensure date is properly formatted
    const dateStr = email.date instanceof Date 
      ? email.date.toISOString() 
      : typeof email.date === 'string' 
        ? email.date 
        : new Date().toISOString();
    
    return `Generate a professional reply to the following email:

Original Email:
From: ${email.sender?.name || ''} <${email.sender?.address || 'unknown@example.com'}>
Subject: ${email.subject || '(No Subject)'}
Date: ${dateStr}
Category: ${email.category || 'Unknown'}

Body:
${email.bodyText || '(No content)'}

${context.length > 0 ? `\nAdditional Context:\n${context.join('\n')}` : ''}
${productInfo ? `\nProduct Information:\n${productInfo}` : ''}
`;
  }
  
  getSystemPrompt() {
    return `You are an AI assistant that categorizes emails.
Categorize the email into EXACTLY ONE of these categories:
1. INTERESTED - Email shows genuine interest in the product/service
2. MEETING_BOOKED - Email contains meeting confirmations or scheduling information
3. NOT_INTERESTED - Email explicitly declines the offer or says not interested
4. SPAM - Unsolicited promotional emails or suspicious content
5. OUT_OF_OFFICE - Automated out-of-office replies or vacation responses

Return your response as a JSON object with:
{
  "category": "CATEGORY_NAME",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this category was selected"
}

The confidence should reflect how certain you are of the email's category.`;
  }
  
  getReplySystemPrompt() {
    return `You are an AI assistant that first categorizes the email and then generates professional email replies for sales and business outreach.

First, categorize the email into EXACTLY ONE of these categories:
1. INTERESTED - Email shows genuine interest in the product/service
2. MEETING_BOOKED - Email contains meeting confirmations or scheduling information
3. NOT_INTERESTED - Email explicitly declines the offer or says not interested
4. SPAM - Unsolicited promotional emails or suspicious content
5. OUT_OF_OFFICE - Automated out-of-office replies or vacation responses

Then, generate THREE suggested replies that are:
1. Professional and courteous
2. Relevant to the original email content
3. Action-oriented when appropriate
4. Personalized based on the context provided
5. Concise but informative

Return your response as a JSON object with:
{
  "category": "CATEGORY_NAME",
  "confidence": 0.85,
  "replies": [
    {
      "subject": "Re: [Original Subject]",
      "body": "First suggested reply with appropriate greeting and closing"
    },
    {
      "subject": "Re: [Original Subject]",
      "body": "Second suggested reply with appropriate greeting and closing"
    },
    {
      "subject": "Re: [Original Subject]",
      "body": "Third suggested reply with appropriate greeting and closing"
    }
  ]
}

The confidence should reflect how certain you are of the email's category.`;
  }
  
  mapCategory(category) {
    if (!category) return EmailCategory.INTERESTED;
    
    // Normalize the category name
    const normalized = category.trim().toUpperCase();
    
    switch(normalized) {
      case 'INTERESTED':
      case 'LEAD':
      case 'PROSPECT':
        return EmailCategory.INTERESTED;
      
      case 'MEETING_BOOKED':
      case 'MEETING BOOKED':
      case 'MEETING':
      case 'APPOINTMENT':
      case 'SCHEDULED':
        return EmailCategory.MEETING_BOOKED;
      
      case 'NOT_INTERESTED':
      case 'NOT INTERESTED':
      case 'DECLINED':
      case 'REJECT':
      case 'REJECTED':
        return EmailCategory.NOT_INTERESTED;
      
      case 'SPAM':
      case 'JUNK':
      case 'PROMOTIONAL':
        return EmailCategory.SPAM;
      
      case 'OUT_OF_OFFICE':
      case 'OUT OF OFFICE':
      case 'OOO':
      case 'VACATION':
      case 'AWAY':
        return EmailCategory.OUT_OF_OFFICE;
      
      case 'INQUIRY':
        return EmailCategory.INTERESTED;
      
      default:
        return EmailCategory.INTERESTED;  // Default to INTERESTED instead of UNCATEGORIZED
    }
  }
}

module.exports = ImprovedAICategorizeService;
