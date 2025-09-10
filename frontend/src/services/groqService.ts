// Groq API service for client-side AI processing
import { detectCorsEnvironment, getCorsProxyUrl } from '../utils/corsHelper';
import axios from 'axios';

// Backend API base URL - using relative URL for same-origin requests 
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// Use environment variables to access API key (only needed for direct API calls)
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';
const GROQ_MODEL = 'mixtral-8x7b-32768'; // Using mixtral model as fallback - llama3 models may be decommissioned
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = GROQ_MODEL;

// Debug environment variables
function debugEnvVars() {
  console.log('Environment Variables Debug:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL || '/api (default)');
  console.log('- REACT_APP_GROQ_API_KEY exists:', !!process.env.REACT_APP_GROQ_API_KEY);
  console.log('- All env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
}

// Call debug function to help diagnose issues
debugEnvVars();

/**
 * Fetch available Groq models through our backend proxy
 */
export async function fetchGroqModels(): Promise<string[]> {
  try {
    // Make sure we're hitting the backend server (port 3000), not the frontend server (port 3002)
    // Use the full URL to avoid any confusion
    const backendUrl = `${(window as any).REACHINBOX_CONFIG?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/groq-proxy/models`;
    console.log('Fetching Groq models from:', backendUrl);
    
    const response = await axios.get(backendUrl, {
      withCredentials: true
    });
    
    if (response.status === 200 && response.data && response.data.models) {
      console.log('Available models:', response.data.models);
      return response.data.models;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Groq models:', error);
    return [];
  }
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

// Create an API request for Groq to generate email replies
export async function generateEmailReply(emailContent: string): Promise<{ subject: string; body: string; confidence: number }> {
  // Extract subject if possible
  let subject = 'Re: Your Email';
  if (emailContent.includes('Subject:')) {
    const subjectMatch = emailContent.match(/Subject: (.*?)(\n|$)/);
    if (subjectMatch && subjectMatch[1]) {
      subject = `Re: ${subjectMatch[1].trim()}`;
    }
  }
  
  try {
    console.log('Generating email reply through backend proxy');

    // Determine which model to use (use configured model by default)
    let modelToUse = DEFAULT_MODEL;
    
    // Check if the configured model is valid by fetching available models
    try {
      const availableModels = await fetchGroqModels();
      
      if (availableModels.length > 0) {
        // If our model isn't in the list, use the first available one
        if (!availableModels.includes(modelToUse)) {
          const fallbackModel = availableModels.find((m: string) => m.includes('mixtral') || m.includes('llama')) || availableModels[0];
          console.warn(`Model ${modelToUse} not found in available models. Using ${fallbackModel} instead.`);
          modelToUse = fallbackModel;
        }
      }
    } catch (err) {
      console.warn('Could not fetch available models. Will try with default model:', modelToUse);
    }
    
    // Make request through our backend proxy
    console.log(`Making API call to Groq through backend proxy with model ${modelToUse}`);
    
    // Use the full backend URL to avoid confusion
    const backendUrl = `${(window as any).REACHINBOX_CONFIG?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/groq-proxy/chat`;
    console.log('Sending request to:', backendUrl);
    
    const response = await axios.post(backendUrl, {
      model: modelToUse,
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
          content: `Please write a reply to this email:\n\n${emailContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }, {
      withCredentials: true
    });

    // Process the response
    const data = response.data;
    let generatedText = data.choices[0].message.content;
    
    // Clean up the response
    generatedText = cleanupAIResponse(generatedText);
    
    return {
      subject,
      body: generatedText,
      confidence: 0.9
    };
  } catch (error: any) {
    console.error('Error generating email reply:', error);
    
    // If the error is due to a specific model being unavailable, try a fallback
    if (error.response && error.response.status === 400 && 
        (error.response.data.error?.includes('model_not_found') || 
         error.response.data.error?.includes('model_decommissioned'))) {
      
      // Try to fetch available models
      const availableModels = await fetchGroqModels();
      
      if (availableModels.length > 0) {
        const fallbackModel = availableModels[0];
        console.log(`Attempting with fallback model: ${fallbackModel}`);
        
        try {
          // Make a new request with the fallback model
          // Use the full backend URL to avoid confusion
          const backendUrl = `${(window as any).REACHINBOX_CONFIG?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/groq-proxy/chat`;
          console.log('Sending fallback request to:', backendUrl);
          
          const fallbackResponse = await axios.post(backendUrl, {
            model: fallbackModel,
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
                content: `Please write a reply to this email:\n\n${emailContent}`
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          }, {
            withCredentials: true
          });
          
          // Process the fallback response
          const data = fallbackResponse.data;
          let generatedText = data.choices[0].message.content;
          
          // Clean up the response
          generatedText = cleanupAIResponse(generatedText);
          
          return {
            subject,
            body: generatedText,
            confidence: 0.8 // Slightly lower confidence for fallback
          };
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
        }
      }
    }
    
    // If we get here, both the primary and fallback attempts failed
    throw new Error('Failed to generate email reply. Please try again later.');
  }
}

// Create an API request for Groq to generate email replies
export async function generateComprehensiveEmailAnalysis(emailContent: string): Promise<{
  summary: string;
  intent: string;
  urgency: string;
  sentiment: string;
  nextActions: string[];
  replyTips: string;
}> {
  try {
    console.log('Generating comprehensive email analysis through backend proxy');
    
    // Determine which model to use (use configured model by default)
    let modelToUse = DEFAULT_MODEL;
    
    // Check if the configured model is valid by fetching available models
    try {
      const availableModels = await fetchGroqModels();
      
      if (availableModels.length > 0) {
        // If our model isn't in the list, use the first available one
        if (!availableModels.includes(modelToUse)) {
          const fallbackModel = availableModels.find((m: string) => m.includes('mixtral') || m.includes('llama')) || availableModels[0];
          console.warn(`Model ${modelToUse} not found in available models. Using ${fallbackModel} instead.`);
          modelToUse = fallbackModel;
        }
      }
    } catch (err) {
      console.warn('Could not fetch available models. Will try with default model:', modelToUse);
    }
    
    // Making API call through our backend proxy
    console.log(`Making API call to Groq through backend proxy with model ${modelToUse}`);
    
    const response = await axios.post(`${API_BASE_URL}/groq-proxy/chat`, {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that helps analyze emails. You need to provide a comprehensive analysis of the email content.
          
          Return your analysis in the following JSON format:
          {
            "summary": "Brief 1-2 sentence summary of the email",
            "intent": "The main purpose of the email (e.g., request for information, follow-up, scheduling, etc.)",
            "urgency": "How urgent the email appears to be (Low, Medium, High)",
            "sentiment": "The general sentiment of the email (Positive, Neutral, Negative)",
            "nextActions": ["List of", "recommended next", "actions to take"],
            "replyTips": "Tips for how to effectively respond to this email"
          }
          
          IMPORTANT: Ensure your response is properly formatted JSON that can be parsed.`
        },
        {
          role: 'user',
          content: `Please analyze this email:\n\n${emailContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }, {
      withCredentials: true
    });

    // Process the response
    const data = response.data;
    let analysisText = data.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                     analysisText.match(/```([\s\S]*?)```/) ||
                     analysisText.match(/{[\s\S]*?}/);
    
    let analysisJson: any;
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        analysisJson = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('Failed to parse JSON from match, trying full response');
        analysisJson = JSON.parse(analysisText);
      }
    } else {
      try {
        analysisJson = JSON.parse(analysisText);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('Invalid response format');
      }
    }
    
    return {
      summary: analysisJson.summary || 'No summary provided',
      intent: analysisJson.intent || 'Intent unclear',
      urgency: analysisJson.urgency || 'Medium',
      sentiment: analysisJson.sentiment || 'Neutral',
      nextActions: analysisJson.nextActions || ['Review the email', 'Determine appropriate response'],
      replyTips: analysisJson.replyTips || 'Be clear and concise in your response'
    };
  } catch (error: any) {
    console.error('Error generating email analysis:', error);
    
    // Return default values if analysis fails
    return {
      summary: 'Analysis failed',
      intent: 'Unable to determine',
      urgency: 'Medium',
      sentiment: 'Neutral',
      nextActions: ['Review the email manually'],
      replyTips: 'Unable to provide specific guidance'
    };
  }
}

// Check if the Groq service is configured and available
export function isGroqAvailable(): boolean {
  // Check if we're using the proxy approach
  return true;
}

// Additional helper function to handle CORS issues
function logCORSError(error: any): void {
  console.error('CORS Error Details:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    cause: error.cause
  });
  
  // Get environment-specific recommendations
  const corsEnv = detectCorsEnvironment();
  console.warn('CORS issue detected. Here are some recommendations:');
  
  if (corsEnv.recommendations.length > 0) {
    corsEnv.recommendations.forEach((rec, index) => {
      console.warn(`${index + 1}. ${rec}`);
    });
  } else {
    console.warn('1. Use a CORS proxy server');
    console.warn('2. Set up a backend proxy in your Node.js server');
    console.warn('3. Use a browser extension that disables CORS for development');
  }
}

// Test the connection to Groq API through our backend proxy and validate the model
export async function testGroqConnection(): Promise<boolean> {
  try {
    // Fetch available models through the backend proxy
    const models = await fetchGroqModels();
    
    if (models.length === 0) {
      console.error('Failed to fetch Groq models or no models available');
      return false;
    }
    
    // Check if our default model exists
    const isModelValid = models.includes(DEFAULT_MODEL);
    
    if (!isModelValid) {
      console.error(`Model ${DEFAULT_MODEL} is not available. Available models:`, models);
      console.warn('Using a different model from the available ones');
      
      // Suggest a replacement model (prefer mixtral or llama models if available)
      const suggestedModels = models.filter((m: string) => m.includes('mixtral') || m.includes('llama'));
      if (suggestedModels.length > 0) {
        console.log('Suggested replacement models:', suggestedModels);
      }
    } else {
      console.log(`Groq API connection successful. Model ${DEFAULT_MODEL} is valid.`);
    }
    
    return models.length > 0;
  } catch (error) {
    console.error('Failed to connect to Groq API:', error);
    if (error instanceof Error) {
      logCORSError(error);
    }
    return false;
  }
}
