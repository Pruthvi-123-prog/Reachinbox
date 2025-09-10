import { EmailMessage } from '../context/EmailContext';

/**
 * Check if Puter.js is available in the current environment
 */
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).puter !== 'undefined' && 
         typeof (window as any).puter.ai !== 'undefined';
}

/**
 * Process an email using Puter.js AI capabilities
 * @param email The email to process
 * @returns A suggested reply with subject, body and confidence
 */
export async function categorizeEmailWithPuter(email: EmailMessage): Promise<{
  subject: string;
  body: string;
  confidence: number;
}> {
  try {
    console.log('Processing email with Puter.js:', email.id);
    
    // Create a subject line for the reply
    const subject = `Re: ${email.subject || '(No Subject)'}`;
    
    // Build the email content for analysis
    const content = `
From: ${email.sender?.name || email.sender?.address || 'Unknown Sender'}
Subject: ${email.subject || '(No Subject)'}
Date: ${email.date?.toLocaleString() || 'Unknown Date'}

${email.body || '(No content)'}
`;

    // Connect to Puter.js API
    const puterWindow = window as any;
    const response = await puterWindow.puter.ai.complete({
      prompt: `
You are an AI assistant that helps generate email replies. Below is an email that needs a response.
Your task is to:
1. Analyze the email content
2. Determine if it's a customer inquiry, complaint, or general message
3. Generate a professional, helpful response
4. Keep the response concise (3-5 sentences)

EMAIL:
${content}

INSTRUCTIONS:
- Start with a greeting addressing the sender
- Acknowledge their message
- Provide helpful information or next steps
- End with a professional closing
- Do not include any explanations or notes outside of the email reply
`,
      model: 'claude-3-haiku-20240307',
      stream: false,
      max_tokens: 500,
    });
    
    const generatedBody = response.choices[0].message.content.trim();
    
    return {
      subject,
      body: generatedBody,
      confidence: 0.95, // High confidence since it's using a specialized AI model
    };
  } catch (error) {
    console.error('Error processing with Puter.js:', error);
    
    // Return a fallback response
    return {
      subject: `Re: ${email.subject || '(No Subject)'}`,
      body: "Thank you for your email. I've received your message and will get back to you shortly.\n\nBest regards,\n[Your Name]",
      confidence: 0.5,
    };
  }
}

/**
 * Initialize Puter.js by loading the script dynamically
 * @returns Promise resolving to true if Puter.js was loaded successfully
 */
export function initializePuter(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    
    // If Puter is already loaded
    if (isPuterAvailable()) {
      console.log('Puter.js already loaded');
      resolve(true);
      return;
    }
    
    // Check if script is already being loaded
    const existingScript = document.getElementById('puter-js-script');
    if (existingScript) {
      console.log('Puter.js script is already loading');
      existingScript.addEventListener('load', () => resolve(isPuterAvailable()));
      return;
    }
    
    // Load Puter.js script
    console.log('Loading Puter.js script');
    const script = document.createElement('script');
    script.id = 'puter-js-script';
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => {
      console.log('Puter.js script loaded, checking availability');
      setTimeout(() => {
        resolve(isPuterAvailable());
      }, 100); // Give a moment for initialization
    };
    script.onerror = () => {
      console.error('Failed to load Puter.js');
      resolve(false);
    };
    
    document.body.appendChild(script);
  });
}
