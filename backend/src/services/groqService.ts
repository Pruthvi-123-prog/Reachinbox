import axios from 'axios';
import { EmailMessage, EmailCategory, EmailCategorization } from '../models/email';
import { logger } from '../utils/logger';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
// Updated model since llama3-8b-8192 is decommissioned
const GROQ_MODEL = 'mixtral-8x7b-32768';

if (!GROQ_API_KEY) {
  console.warn('GROQ_API_KEY not found in environment variables');
}

// Create a configured Axios instance for Groq API
const groqApi = axios.create({
  baseURL: GROQ_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export interface GroqReplyResult {
  subject: string;
  body: string;
  confidence: number;
}

export async function generateEmailReply(emailContent: string): Promise<GroqReplyResult> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  try {
    console.log('Generating email reply with Groq API');
    
    const response = await groqApi.post('/chat/completions', {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that helps generate email replies. Your task is to generate a professional, 
          helpful response to emails. Keep responses concise but friendly (3-5 sentences).
          
          IMPORTANT: Do not include any <think> tags, internal reasoning, or meta-commentary in your response. 
          Do not include any text like "Subject:" or "Body:" or any other formatting markers.
          Return only the final email reply that the user can copy and paste directly.`
        },
        {
          role: 'user',
          content: `Please write a reply to this email:\n\n${emailContent}\n\n
          Instructions:
          - Start with a greeting addressing the sender
          - Acknowledge their message
          - Provide helpful information or next steps
          - End with a professional closing
          - Return only the reply text, no explanations or reasoning`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    // Extract the generated content
    let generatedText = response.data.choices[0].message.content;
    
    // Clean up the response to remove any thinking tags or meta-text
    generatedText = cleanupAIResponse(generatedText);
    
    // Create a subject line by extracting from original or using default
    let subject = 'Re: Your Email';
    if (emailContent.includes('Subject:')) {
      const subjectMatch = emailContent.match(/Subject: (.*?)(\n|$)/);
      if (subjectMatch && subjectMatch[1]) {
        subject = `Re: ${subjectMatch[1].trim()}`;
      }
    }
    
    return {
      subject,
      body: generatedText,
      confidence: 0.9
    };
  } catch (error: any) {
    console.error('Error generating reply with Groq API:', error);
    
    // Provide more specific error messages
    if (error.response?.status === 401) {
      throw new Error('Groq API authentication failed - check API key');
    } else if (error.response?.status === 429) {
      throw new Error('Groq API rate limit exceeded - please try again later');
    } else if (error.response?.status === 400) {
      throw new Error('Invalid request to Groq API - check request format');
    } else {
      throw new Error(`Groq API error: ${error.message}`);
    }
  }
}

export function isGroqAvailable(): boolean {
  return !!GROQ_API_KEY && GROQ_API_KEY.startsWith('gsk_');
}

/**
 * Cleans up AI responses to remove any thinking tags, meta-comments, or other unwanted text
 */
function cleanupAIResponse(text: string): string {
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
 * Categorizes an email into one of the specified categories using Groq AI
 */
export async function categorizeEmail(email: EmailMessage): Promise<EmailCategorization> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  try {
    logger.debug(`Categorizing email ${email.id} with Groq API`);
    
    // Extract the text from the email
    const emailContent = `
From: ${email.sender.name || ''} <${email.sender.address || 'unknown@example.com'}>
Subject: ${email.subject || '(No Subject)'}
Date: ${email.date instanceof Date ? email.date.toISOString() : String(email.date)}

Email Body:
${email.bodyText || ''}

Additional Context:
- Account: ${email.account}
- Folder: ${email.folder}
- Has Attachments: ${email.attachments && email.attachments.length > 0 ? 'Yes' : 'No'}
- Thread ID: ${email.threadId || 'None'}
`;

    const systemPrompt = `You are an AI email categorization system for a sales and outreach management tool. 
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
Focus on the email content, sender context, and subject line to make your decision.`;

    const response = await groqApi.post('/chat/completions', {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\n\nIMPORTANT: Do not include any <think> tags or internal reasoning in your response. Provide only the requested JSON format with clean category, confidence, and reasoning fields.'
        },
        {
          role: 'user',
          content: `Please categorize the following email:\n\n${emailContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });
    
    const result = response.data.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from Groq API');
    }

    // Clean up the result to remove any thinking tags or unwanted text
    const cleanedResult = cleanupAIResponse(result);
    
    // Parse the JSON response
    let categorization;
    try {
      categorization = JSON.parse(cleanedResult) as {
        category: string;
        confidence: number;
        reasoning: string;
      };
      
      // Also clean up the reasoning field
      if (categorization.reasoning) {
        categorization.reasoning = cleanupAIResponse(categorization.reasoning);
      }
    } catch (parseError) {
      logger.error(`Failed to parse Groq API response for email ${email.id}:`, parseError);
      logger.error(`Original response: ${result}`);
      logger.error(`Cleaned response: ${cleanedResult}`);
      throw new Error('Invalid JSON response from Groq API');
    }

    // Map the category string to our EmailCategory enum
    const mappedCategory = mapCategoryFromString(categorization.category);
    
    return {
      category: mappedCategory,
      confidence: Math.min(Math.max(categorization.confidence || 0.7, 0), 1),
      reasoning: categorization.reasoning || 'Groq AI-based categorization'
    };
  } catch (error: any) {
    logger.error('Error categorizing email with Groq API:', error);
    
    // Provide more specific error messages
    if (error.response?.status === 401) {
      throw new Error('Groq API authentication failed - check API key');
    } else if (error.response?.status === 429) {
      throw new Error('Groq API rate limit exceeded - please try again later');
    } else if (error.response?.status === 400) {
      // Check if it's a model decommissioned error
      if (error.response?.data?.error?.code === 'model_decommissioned') {
        logger.error('Groq model is decommissioned. Update the GROQ_MODEL constant in groqService.ts');
        throw new Error(`Model ${GROQ_MODEL} has been decommissioned. Please update to a newer model.`);
      }
      throw new Error('Invalid request to Groq API - check request format');
    } else {
      throw new Error(`Groq API error: ${error.message}`);
    }
  }
}

/**
 * Maps a category string to our EmailCategory enum
 */
function mapCategoryFromString(category: string): EmailCategory {
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

/**
 * Test the connection to Groq API and fetch available models
 * This can be used for initialization and checking if the API key is valid
 */
export async function testGroqConnection(): Promise<{ valid: boolean; availableModels?: string[] }> {
  if (!GROQ_API_KEY) {
    return { valid: false };
  }

  try {
    const response = await groqApi.get('/models');
    
    // Extract model IDs from the response
    if (response.data.data && Array.isArray(response.data.data)) {
      const modelIds = response.data.data.map((model: any) => model.id);
      logger.info('Available Groq models:', modelIds);
      
      // Check if our configured model exists
      const isModelValid = modelIds.includes(GROQ_MODEL);
      if (!isModelValid) {
        logger.warn(`Configured model ${GROQ_MODEL} is not available in Groq API`);
        
        // Find suitable replacement models
        const recommendedModels = modelIds.filter((id: string) => 
          id.includes('llama') || id.includes('mixtral')
        );
        
        if (recommendedModels.length > 0) {
          logger.info('Recommended replacement models:', recommendedModels);
        }
      }
      
      return { 
        valid: true, 
        availableModels: modelIds 
      };
    }
    
    return { valid: true };
  } catch (error) {
    logger.error('Failed to connect to Groq API:', error);
    return { valid: false };
  }
}
