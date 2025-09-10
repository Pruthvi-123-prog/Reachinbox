import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { EmailMessage, EmailCategory, EmailCategorization } from '../models/email';
import * as groqService from './groqService';

export class AICategorizeService {
  private llmClient: OpenAI | null = null;
  private model: string;
  private isEnabled: boolean = false;
  private isDeepSeek: boolean = true; // Use DeepSeek by default
  private isGroq: boolean = false; // Whether to use Groq instead of DeepSeek
  private isInsufficientBalance: boolean = false; // Track if the API key has insufficient balance

  constructor() {
    try {
      // First check if Groq API is available - we prefer it if available
      if (groqService.isGroqAvailable()) {
        logger.info('Groq API key found, attempting to initialize Groq categorization service');
        this.isGroq = true;
        this.isDeepSeek = false;
        
        // Test Groq connection
        groqService.testGroqConnection().then(result => {
          if (result.valid) {
            logger.info('Groq API connection successful, using Groq for email categorization');
            this.isEnabled = true;
          } else {
            logger.warn('Groq API connection failed, falling back to DeepSeek or rule-based categorization');
            this.isGroq = false;
            // Continue with DeepSeek initialization below
          }
        }).catch(error => {
          logger.error('Error testing Groq API connection:', error);
          this.isGroq = false;
          // Continue with DeepSeek initialization below
        });
        
        // If Groq is available, we'll return early and skip DeepSeek initialization
        if (this.isGroq && this.isEnabled) {
          return;
        }
      }
      
      // Fall back to DeepSeek if Groq is not available or failed
      let apiKey = process.env.DEEPSEEK_API_KEY;
      const baseUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com';
      
      if (!apiKey) {
        logger.warn('Neither Groq nor DeepSeek API keys are available, AI categorization will be disabled');
        this.isEnabled = false;
        return;
      }

      // Clean up escaped characters from the API key
      apiKey = apiKey.replace(/\\+/g, '').trim();
      
      // Validate API key format
      if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
        logger.warn('Invalid DEEPSEEK_API_KEY format. Using enhanced rule-based categorization instead');
        this.isEnabled = false;
        return;
      }

      try {
        // Initialize DeepSeek client using OpenAI-compatible interface
        this.llmClient = new OpenAI({
          apiKey: apiKey,
          baseURL: baseUrl
        });
        
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
        this.isEnabled = true;
        
        // Test the API key with a simple request
        this.testApiKey().then(isValid => {
          if (!isValid) {
            if (this.isInsufficientBalance) {
              logger.warn('DeepSeek API key has insufficient balance. Please add funds to your DeepSeek account or get a new API key. Using enhanced rule-based categorization instead.');
            } else {
              logger.warn('DeepSeek API key validation failed. Using enhanced rule-based categorization instead');
            }
            this.isEnabled = false;
          } else {
            logger.info('DeepSeek AI categorization service initialized successfully with validated API key');
          }
        }).catch(() => {
          logger.warn('DeepSeek API key validation failed. Using enhanced rule-based categorization instead');
          this.isEnabled = false;
        });
        
      } catch (initError) {
        logger.error('Failed to initialize OpenAI client:', initError);
        this.isEnabled = false;
      }
    } catch (error) {
      logger.error('Failed to initialize AI categorization service:', error);
      this.isEnabled = false;
    }
  }
  
  private async testApiKey(): Promise<boolean> {
    if (!this.llmClient) return false;
    
    try {
      // Simple test request
      await this.llmClient.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: 'This is a test message to validate the API key.' }
        ],
        max_tokens: 5
      });
      return true;
    } catch (error: any) {
      // Check for specific error types
      if (error.toString().includes('Insufficient Balance') || error.toString().includes('402')) {
        logger.error('DeepSeek API key has insufficient balance. Please add funds to your account or get a new API key.');
        // This is still a valid key, just out of credits
        this.isInsufficientBalance = true;
      } else if (error.toString().includes('401') || error.toString().includes('authentication')) {
        logger.error('DeepSeek API key is invalid or unauthorized.');
      } else {
        logger.error('DeepSeek API key validation failed:', error);
      }
      return false;
    }
  }

  async categorizeEmail(email: EmailMessage): Promise<EmailCategorization> {
    // If Groq is enabled, use it first
    if (this.isEnabled && this.isGroq) {
      try {
        logger.debug(`Using Groq for email categorization: ${email.id}`);
        return await groqService.categorizeEmail(email);
      } catch (error) {
        logger.error(`Groq categorization failed for email ${email.id}:`, error);
        // Fall back to DeepSeek or rule-based if Groq fails
        if (this.isDeepSeek && this.llmClient) {
          logger.debug(`Falling back to DeepSeek for email ${email.id}`);
        } else {
          logger.debug(`Falling back to rule-based categorization for email ${email.id}`);
        }
      }
    }
    
    // Skip DeepSeek categorization if service is disabled or unavailable
    if (!this.isEnabled || !this.llmClient || this.isGroq) {
      if (this.isInsufficientBalance) {
        logger.debug(`DeepSeek API has insufficient balance, using rule-based categorization for email ${email.id}`);
      } else {
        logger.debug(`AI service is disabled, using rule-based categorization for email ${email.id}`);
      }
      
      return this.ruleBasedCategorization(email);
    }
    
    try {
      logger.debug(`Categorizing email: ${email.id}`);

      const prompt = this.buildCategorizationPrompt(email);
      
      // First check API key with a simple operation
      try {
        const response = await this.llmClient.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 150,
          response_format: { type: 'json_object' }
        });

        let result = response.choices[0]?.message?.content;
        if (!result) {
          throw new Error('No response from DeepSeek API');
        }
        
        // Clean up result to remove thinking tags
        result = this.cleanupResponseText(result);

        let categorization;
        try {
          categorization = JSON.parse(result) as {
            category: string;
            confidence: number;
            reasoning: string;
          };
        } catch (parseError) {
          logger.error(`Failed to parse DeepSeek API response for email ${email.id}:`, parseError);
          throw new Error('Invalid JSON response from DeepSeek API');
        }

        // Validate and map category
        const mappedCategory = this.mapCategory(categorization.category);
        
        return {
          category: mappedCategory,
          confidence: Math.min(Math.max(categorization.confidence || 0.7, 0), 1),
          reasoning: categorization.reasoning || 'AI-based categorization'
        };
      } catch (apiError) {
        // Check if it's an authentication error
        if (apiError.toString().includes('401') || apiError.toString().includes('API key')) {
          logger.error('DeepSeek API authentication failed. Disabling AI service:', apiError);
          this.isEnabled = false; // Disable the service for future calls
          throw new Error('DeepSeek API authentication failed');
        }
        
        // Check if it's a rate limit or quota error (429)
        if (apiError.toString().includes('429') || 
            apiError.toString().includes('rate limit') || 
            apiError.toString().includes('too many requests') ||
            apiError.toString().includes('quota') ||
            apiError.toString().includes('insufficient_quota')) {
          
          const isQuotaError = apiError.toString().includes('quota') || apiError.toString().includes('insufficient_quota');
          
          if (isQuotaError) {
            logger.warn('DeepSeek API quota exceeded. Using rule-based categorization as fallback:', apiError);
            // Disable the AI service completely if it's a quota issue
            this.isEnabled = false;
            throw new Error('DeepSeek API quota exceeded');
          } else {
            logger.warn('DeepSeek API rate limit reached. Using rule-based categorization as fallback:', apiError);
            // Don't disable the service for temporary rate limits, just handle this request with fallback
            throw new Error('DeepSeek API rate limit reached');
          }
        }
        
        throw apiError; // Re-throw for the outer catch
      }
    } catch (error) {
      logger.error(`Failed to categorize email ${email.id}:`, error);
      
      // Use rule-based categorization on API errors
      let category = EmailCategory.INTERESTED; // Default to INTERESTED
      let confidence = 0.6;
      
      // Simple rule-based categorization as fallback
      const subject = email.subject?.toLowerCase() || '';
      const body = email.bodyText?.toLowerCase() || '';
      
      if (subject.includes('newsletter') || body.includes('unsubscribe')) {
        category = EmailCategory.NEWSLETTER;
        confidence = 0.7;
      } else if (subject.includes('meeting') || body.includes('call')) {
        category = EmailCategory.MEETING_BOOKED;
        confidence = 0.7;
      } else if (subject.includes('receipt') || subject.includes('invoice')) {
        category = EmailCategory.BUSINESS;
        confidence = 0.7;
      } else if (subject.includes('out of office') || body.includes('vacation')) {
        category = EmailCategory.OUT_OF_OFFICE;
        confidence = 0.8;
      }
      
      return {
        category: category,
        confidence: confidence,
        reasoning: 'Fallback rule-based categorization due to AI service error'
      };
    }
  }

  async batchCategorizeEmails(emails: EmailMessage[]): Promise<EmailCategorization[]> {
    const categorizations: EmailCategorization[] = [];
    
    // If Groq is enabled, use it for categorization
    if (this.isEnabled && this.isGroq) {
      logger.info('Using Groq for batch email categorization');
      
      // Process emails in smaller batches to avoid rate limits
      const batchSize = 5; // Process 5 emails at a time
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        // Process each email in the batch with Groq (in parallel)
        const batchPromises = batch.map(async (email) => {
          try {
            return await groqService.categorizeEmail(email);
          } catch (error) {
            logger.error(`Groq categorization failed for email ${email.id}:`, error);
            // Use rule-based categorization as fallback
            return this.ruleBasedCategorization(email);
          }
        });
        
        // Wait for all emails in this batch to be processed
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Add results to the categorizations array
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            categorizations.push(result.value);
          } else {
            logger.error('Error during batch categorization:', result.reason);
            // Push a default categorization for failed emails
            categorizations.push({
              category: EmailCategory.INTERESTED,
              confidence: 0.5,
              reasoning: 'Fallback due to categorization error'
            });
          }
        });
        
        // Add a small delay between batches to respect rate limits
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return categorizations;
    }
    
    // If Groq is not enabled but DeepSeek is disabled, use rule-based categorization for all emails
    if (!this.isEnabled || !this.llmClient) {
      logger.warn('AI service is disabled, using rule-based categorization for all emails');
      for (const email of emails) {
        const categorization = await this.ruleBasedCategorization(email);
        categorizations.push(categorization);
      }
      return categorizations;
    }
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Process each email individually to handle errors better
      for (const email of batch) {
        try {
          const categorization = await this.categorizeEmail(email);
          categorizations.push(categorization);
        } catch (error) {
          logger.error(`Failed to categorize email ${email.id}:`, error);
          
          // Use rule-based categorization for failed email
          let category = EmailCategory.INTERESTED; // Default to INTERESTED instead of UNCATEGORIZED
          const subject = email.subject?.toLowerCase() || '';
          
          if (subject.includes('newsletter')) {
            category = EmailCategory.NEWSLETTER;
          } else if (subject.includes('meeting')) {
            category = EmailCategory.MEETING_BOOKED;
          }
          
          categorizations.push({
            category: category,
            confidence: 0.5,
            reasoning: 'Fallback categorization due to individual processing error'
          });
        }
      }
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return categorizations;
  }
  
  /**
   * Clean up response text to remove any thinking tags or internal AI dialogue
   */
  private cleanupResponseText(text: string): string {
    if (!text) return '';
    
    // Remove <think> blocks
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Remove any other thinking tags without closing tags
    text = text.replace(/<think>[\s\S]*/g, '');
    
    // Remove AI prefix markers like "AI:" or "Assistant:"
    text = text.replace(/^(AI:|Assistant:|Bot:|Groq AI:|ChatGPT:)[ \t]*/gm, '');
    
    // Remove any lines with "Subject:" if they appear in the middle of the text
    // But keep them at the beginning as they might be part of an email format
    const lines = text.split('\n');
    if (lines.length > 2) {
      // Check if "Subject:" appears after the first couple of lines
      for (let i = 2; i < lines.length; i++) {
        if (lines[i].trim().startsWith('Subject:')) {
          lines[i] = ''; // Remove this line
        }
      }
      text = lines.join('\n');
    }
    
    // Remove extra newlines (more than 2 consecutive)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Trim extra whitespace
    return text.trim();
  }

  /**
   * Rule-based categorization for when AI services are unavailable
   */
  private ruleBasedCategorization(email: EmailMessage): EmailCategorization {
    // Default categorization based on basic rules
    let category = EmailCategory.INTERESTED; // Default to INTERESTED to make emails show up in that category
    let confidence = 0.7;
    
    // Simple rule-based categorization
    const subject = email.subject?.toLowerCase() || '';
    const body = email.bodyText?.toLowerCase() || '';
    
    // Apply rule-based categorization with patterns that match our 5 required categories
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
    
    // If no other categories matched, emails will default to INTERESTED
    return {
      category: category,
      confidence: confidence,
      reasoning: 'Enhanced rule-based categorization (AI service unavailable)'
    };
  }

  private getSystemPrompt(): string {
    return `You are an AI email categorization system for a sales and outreach management tool. 
Your task is to categorize incoming emails into EXACTLY ONE of the following categories:

1. INTERESTED - Email shows genuine interest in the product/service, asking for more information, pricing, or next steps
2. MEETING_BOOKED - Email contains meeting confirmations, calendar invites, or scheduling information
3. NOT_INTERESTED - Email explicitly declines the offer, says not interested, or asks to be removed
4. SPAM - Unsolicited promotional emails, suspicious content, or clearly spam messages
5. OUT_OF_OFFICE - Automated out-of-office replies or vacation responses

Return your response as a JSON object with the following structure:
{
  "category": "CATEGORY_NAME",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category was chosen"
}

Confidence should be a number between 0 and 1, where 1 is completely certain.
Focus on the email content, sender context, and subject line to make your decision.

IMPORTANT: Do not include any <think> tags, internal reasoning, or meta-commentary in your response.
Provide only the requested JSON format with clean category, confidence, and reasoning fields.`;
  }

  private buildCategorizationPrompt(email: EmailMessage): string {
    // Ensure date is a proper Date object or format it as a string
    let dateStr: string;
    try {
      // Try to use as Date object first
      if (email.date instanceof Date) {
        dateStr = email.date.toISOString();
      } else if (typeof email.date === 'string') {
        // Use directly if it's already a string
        dateStr = email.date;
      } else if (email.date) {
        // Try to convert any other non-null value to a string
        dateStr = String(email.date);
      } else {
        // If null/undefined, use current date
        dateStr = new Date().toISOString();
      }
    } catch (err) {
      // Fallback to current date if parsing fails
      dateStr = new Date().toISOString();
      logger.warn(`Failed to format email date: ${err}. Using current date instead.`);
    }
    
    return `Please categorize the following email:

From: ${email.sender.name || ''} <${email.sender.address || 'unknown@example.com'}>
Subject: ${email.subject || '(No Subject)'}
Date: ${dateStr}

Email Body:
${email.bodyText}

Additional Context:
- Account: ${email.account}
- Folder: ${email.folder}
- Has Attachments: ${email.attachments && email.attachments.length > 0 ? 'Yes' : 'No'}
- Thread ID: ${email.threadId || 'None'}

Please analyze this email and provide a categorization with confidence score and reasoning.`;
  }

  private mapCategory(category: string): EmailCategory {
    const normalizedCategory = category.toUpperCase().replace(/[^A-Z_]/g, '');
    
    switch (normalizedCategory) {
      case 'INTERESTED':
        return EmailCategory.INTERESTED;
      case 'MEETING_BOOKED':
        return EmailCategory.MEETING_BOOKED;
      case 'NOT_INTERESTED':
        return EmailCategory.NOT_INTERESTED;
      case 'SPAM':
        return EmailCategory.SPAM;
      case 'OUT_OF_OFFICE':
        return EmailCategory.OUT_OF_OFFICE;
      // Map additional categories to our 5 required ones based on similarity
      case 'PROMOTIONAL':
      case 'NEWSLETTER':
      case 'ADVERTISEMENT':
      case 'MARKETING':
        return EmailCategory.SPAM;
      case 'PERSONAL':
      case 'BUSINESS':
      case 'SUPPORT':
      case 'INQUIRY':
        return EmailCategory.INTERESTED;
      default:
        return EmailCategory.INTERESTED;  // Default to INTERESTED instead of UNCATEGORIZED
    }
  }

  // Method for generating suggested replies (for the advanced RAG feature)
  async generateSuggestedReply(
    email: EmailMessage, 
    context: string[] = [], 
    productInfo?: string
  ): Promise<{ 
    category: string;
    confidence: number;
    replies: Array<{ subject: string; body: string }>;
  }> {
    // If service is disabled or unavailable, return fallback reply
    if (!this.isEnabled || !this.llmClient) {
      if (this.isInsufficientBalance) {
        logger.warn(`DeepSeek API has insufficient balance, using fallback reply for email ${email.id}`);
      } else {
        logger.warn(`AI service is disabled, using fallback reply for email ${email.id}`);
      }
      return this.generateFallbackReply(email);
    }
    
    try {
      const contextPrompt = this.buildReplyPrompt(email, context, productInfo);
      
      try {
        const response = await this.llmClient.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getReplySystemPrompt()
            },
            {
              role: 'user',
              content: contextPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000, // Increased token count for multiple replies
          response_format: { type: 'json_object' }
        });
  
        let result = response.choices[0]?.message?.content;
        if (!result) {
          throw new Error('No response from AI for reply generation');
        }
        
        // Clean up result to remove thinking tags
        result = this.cleanupResponseText(result);
  
        const reply = JSON.parse(result) as {
          category: string;
          confidence: number;
          replies: Array<{ subject: string; body: string }>;
        };
        
        // Clean up each reply body to remove any thinking tags
        if (reply.replies && Array.isArray(reply.replies)) {
          reply.replies.forEach(r => {
            if (r.body) {
              r.body = this.cleanupResponseText(r.body);
            }
          });
        }
  
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
      } catch (apiError) {
        // Check if it's an authentication error
        if (apiError.toString().includes('401') || apiError.toString().includes('API key')) {
          logger.error('OpenAI authentication failed. Disabling AI service:', apiError);
          this.isEnabled = false; // Disable the service for future calls
          return this.generateFallbackReply(email);
        }
        
        // Check if it's a rate limit or quota error (429)
        if (apiError.toString().includes('429') || 
            apiError.toString().includes('rate limit') || 
            apiError.toString().includes('too many requests') ||
            apiError.toString().includes('quota') ||
            apiError.toString().includes('insufficient_quota')) {
          
          const isQuotaError = apiError.toString().includes('quota') || apiError.toString().includes('insufficient_quota');
          
          if (isQuotaError) {
            logger.warn('OpenAI API quota exceeded. Using fallback reply:', apiError);
            // Disable the AI service completely if it's a quota issue
            this.isEnabled = false;
          } else {
            logger.warn('OpenAI API rate limit reached. Using fallback reply:', apiError);
            // Don't disable the service for temporary rate limits
          }
          
          // Return fallback reply in either case
          return this.generateFallbackReply(email);
        }
        
        throw apiError; // Re-throw for the outer catch
      }
    } catch (error) {
      logger.error(`Failed to generate reply for email ${email.id}:`, error);
      return this.generateFallbackReply(email);
    }
  }
  
  private generateFallbackReply(email: EmailMessage): { 
    category: string;
    confidence: number;
    replies: Array<{ subject: string; body: string }>;
  } {
    let subject = `Re: ${email.subject}`;
    let body = ``;
    let category = email.category || EmailCategory.INTERESTED;
    
    // Generate a simple response based on email category if available
    if (email.category) {
      switch(email.category) {
        case EmailCategory.INTERESTED:
          body = `Hi ${email.sender.name || 'there'},\n\nThank you for your interest in our product. I'd be happy to provide more information. Could we schedule a quick call to discuss your specific needs?\n\nBest regards,\n[Your Name]`;
          break;
        case EmailCategory.MEETING_BOOKED:
          body = `Hi ${email.sender.name || 'there'},\n\nI'm looking forward to our scheduled meeting. If you need to make any changes to the time, please let me know.\n\nBest regards,\n[Your Name]`;
          break;
        case EmailCategory.NOT_INTERESTED:
          body = `Hi ${email.sender.name || 'there'},\n\nThank you for considering our product. I understand it may not be the right fit at this time. If your needs change in the future, please don't hesitate to reach out.\n\nBest regards,\n[Your Name]`;
          break;
        case EmailCategory.SPAM:
          body = `This message appears to be spam. No response necessary.`;
          break;
        case EmailCategory.OUT_OF_OFFICE:
          body = `This is an out-of-office reply. No immediate response necessary.`;
          break;
        default:
          body = `Hi ${email.sender.name || 'there'},\n\nThank you for your email. I've received your message and will respond shortly.\n\nBest regards,\n[Your Name]`;
      }
    } else {
      // Default reply if no category
      body = `Hi ${email.sender.name || 'there'},\n\nThank you for your email. I've received your message and will respond shortly.\n\nBest regards,\n[Your Name]`;
    }
    
    // Create multiple fallback reply variations based on the category
    let replies = [];
    
    // Add the primary reply
    replies.push({
      subject: subject,
      body: body
    });
    
    // Add secondary variations with different wording
    switch(category) {
      case EmailCategory.INTERESTED:
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
          body: `Hello ${email.sender.name || 'there'},\n\nI'm looking forward to our upcoming meeting. I've added it to my calendar and will be prepared to discuss your requirements.\n\nKind regards,\n[Your Name]`
        });
        break;
        
      case EmailCategory.NOT_INTERESTED:
        replies.push({
          subject: subject,
          body: `Hello ${email.sender.name || 'there'},\n\nI appreciate your candid feedback. If circumstances change in the future, please don't hesitate to reach out.\n\nKind regards,\n[Your Name]`
        });
        break;
        
      default:
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

  private getReplySystemPrompt(): string {
    return `You are an AI assistant that first categorizes the email and then generates professional email replies for sales and business outreach.

IMPORTANT: Do not include any <think> tags or internal reasoning in your response. Provide only the requested JSON format. 
DO NOT include any text like "<think>" or any internal dialogue process in your replies.

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

  private buildReplyPrompt(email: EmailMessage, context: string[], productInfo?: string): string {
    // Ensure date is a proper Date object or format it as a string
    let dateStr: string;
    try {
      // Try to use as Date object first
      if (email.date instanceof Date) {
        dateStr = email.date.toISOString();
      } else if (typeof email.date === 'string') {
        // Use directly if it's already a string
        dateStr = email.date;
      } else if (email.date) {
        // Try to convert any other non-null value to a string
        dateStr = String(email.date);
      } else {
        // If null/undefined, use current date
        dateStr = new Date().toISOString();
      }
    } catch (err) {
      // Fallback to current date if parsing fails
      dateStr = new Date().toISOString();
      logger.warn(`Failed to format email date: ${err}. Using current date instead.`);
    }
    
    return `Generate a professional reply to the following email:

Original Email:
From: ${email.sender.name || ''} <${email.sender.address || 'unknown@example.com'}>
Subject: ${email.subject || '(No Subject)'}
Date: ${dateStr}
Category: ${email.category || 'Unknown'}

Body:
${email.bodyText}

${context.length > 0 ? `\nAdditional Context:\n${context.join('\n')}` : ''}

${productInfo ? `\nProduct/Service Information:\n${productInfo}` : ''}

Please generate an appropriate reply that addresses the sender's message and maintains professional tone.`;
  }
}
