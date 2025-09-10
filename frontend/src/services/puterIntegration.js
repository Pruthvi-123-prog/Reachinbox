/**
 * Puter.js Integration Script for Frontend
 * 
 * This script will integrate Puter.js for client-side AI access
 * to replace the DeepSeek API calls on the backend.
 */

// Helper to inject Puter.js into the document
function injectPuterJS() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.puter && window.puter.ai) {
      console.log('Puter.js already loaded');
      return resolve(true);
    }
    
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    
    script.onload = () => {
      console.log('Puter.js loaded successfully');
      resolve(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load Puter.js');
      reject(new Error('Failed to load Puter.js'));
    };
    
    document.head.appendChild(script);
  });
}

// Function to categorize email with Puter.js
async function categorizeEmailWithPuter(email) {
  // First ensure Puter.js is loaded
  try {
    await injectPuterJS();
  } catch (error) {
    console.error('Failed to inject Puter.js:', error);
    throw new Error('Failed to load AI capabilities');
  }
  
  // Prepare the prompt
  const prompt = `
I need you to analyze this email and determine the category from the following options: Interested, Meeting Booked, Not Interested, Spam, Out of Office.
Also, generate 3 different reply suggestions for this email.

Email:
From: ${email.sender}
Subject: ${email.subject}
Body:
${email.bodyText || email.body}

Return the result in the following JSON format exactly:
{
  "category": "one of the categories",
  "reasoning": "brief explanation for the categorization",
  "replies": [
    {"subject": "Re: ${email.subject}", "body": "first reply suggestion"},
    {"subject": "Re: ${email.subject}", "body": "second reply suggestion"},
    {"subject": "Re: ${email.subject}", "body": "third reply suggestion"}
  ]
}
`;

  try {
    // Call DeepSeek via Puter.js
    const response = await window.puter.ai.chat(prompt, {
      model: 'deepseek-reasoner', // Use the reasoner model for better quality
      stream: false
    });
    
    const content = response.message.content;
    
    // Find JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result;
    
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
      
      // Standardize the response format
      return {
        success: true,
        data: {
          suggestedReply: {
            category: result.category,
            confidence: 0.95, // Puter.js doesn't return confidence, so we set a high default
            replies: result.replies || []
          }
        }
      };
    } else {
      throw new Error('Could not extract JSON from AI response');
    }
  } catch (error) {
    console.error('Puter.js AI error:', error);
    throw error;
  }
}

// Override the API's suggest-reply endpoint
function overrideApiSuggestReply(api) {
  // Store the original post method
  const originalPost = api.post;
  
  // Override the post method
  api.post = function(url, data, config = {}) {
    // Check if this is a suggest-reply call
    if (url.includes('/suggest-reply')) {
      console.log('Intercepting suggest-reply API call to use Puter.js instead');
      
      // Extract email ID from URL
      const emailId = url.split('/')[3];
      
      // Create headers for the request to notify backend we're using Puter.js
      config.headers = config.headers || {};
      config.headers['X-Use-Puter'] = 'true';
      
      // Find the email in the page context or fetch it
      const findEmail = async () => {
        // Try to get email from the page context
        let email = window.__emailDetail;
        
        // If not available in context, fetch it
        if (!email) {
          try {
            const response = await api.get(`/api/emails/${emailId}`);
            email = response.data.data;
          } catch (error) {
            console.error('Failed to fetch email:', error);
            throw error;
          }
        }
        
        return email;
      };
      
      // Return a promise that resolves with the Puter.js result
      return findEmail().then(email => {
        return categorizeEmailWithPuter(email);
      });
    }
    
    // For all other API calls, use the original method
    return originalPost.call(api, url, data, config);
  };
  
  console.log('API suggest-reply endpoint overridden to use Puter.js');
  return api;
}

// Export the integration functions
export { injectPuterJS, categorizeEmailWithPuter, overrideApiSuggestReply };

// Auto-initialize when loaded
(function() {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Inject Puter.js
    injectPuterJS()
      .then(() => {
        console.log('Puter.js integration ready');
        
        // Add a global flag to indicate Puter.js is available
        window.__puterJSAvailable = true;
        
        // Look for any API object to override
        if (window.api) {
          overrideApiSuggestReply(window.api);
        }
      })
      .catch(error => {
        console.error('Puter.js integration failed:', error);
      });
  }
})();
