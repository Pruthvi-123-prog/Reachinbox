import axios from 'axios';
import { 
  EmailMessage, 
  EmailSearchQuery, 
  EmailSearchResult, 
  EmailStats, 
  SyncStatus, 
  EmailCategory, 
  AnalyticsData,
  VolumeByTimeData,
  HourlyVolumeData,
  CategoryTrendData,
  ResponseTimeMetrics 
} from '../context/EmailContext';

// Simple function to check if Puter.js is available
function isPuterAvailable(): boolean {
  const puterWindow = window as any;
  const puterExists = typeof puterWindow !== 'undefined' && typeof puterWindow.puter !== 'undefined';
  const aiExists = puterExists && typeof puterWindow.puter.ai !== 'undefined';
  
  // Check if the chat method is available (which we use for email replies)
  const hasChatMethod = aiExists && typeof puterWindow.puter.ai.chat === 'function';
  
  if (puterExists && aiExists) {
    console.log('Puter AI methods available:', Object.keys(puterWindow.puter.ai));
  }
  
  return puterExists && aiExists && hasChatMethod;
}

// Direct Puter.js processing function without relying on dynamic imports
async function processPuterEmailDirectly(email: any): Promise<{ subject: string; body: string; confidence: number }> {
  try {
    console.log('Processing email with Puter.js directly:', email.id);
    
    // Create a subject line for the reply
    const subject = `Re: ${email.subject || '(No Subject)'}`;
    
    // Build the email content for analysis
    const content = `
From: ${email.sender?.name || email.sender?.address || 'Unknown Sender'}
Subject: ${email.subject || '(No Subject)'}
Date: ${email.date?.toLocaleString() || 'Unknown Date'}

${email.body || email.bodyText || '(No content)'}
`;

    // Double check Puter.js availability before proceeding
    if (!isPuterAvailable()) {
      throw new Error('Puter.js is not available for email processing');
    }

    // Connect to Puter.js API
    const puterWindow = window as any;
    
    // Log available methods for debugging
    console.log('Puter.js AI methods:', Object.keys(puterWindow.puter.ai));
    
    // Check which API method is available and use it
    let generatedText;
    
    if (typeof puterWindow.puter.ai.chat === 'function') {
      // Use the chat method which is available
      console.log('Using Puter.js chat API');
      const response = await puterWindow.puter.ai.chat({
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that helps generate email replies. Your task is to generate a professional, helpful response to emails. Keep responses concise (3-5 sentences).`
          },
          {
            role: 'user',
            content: `Please write a reply to this email:
            
FROM: ${email.sender?.name || email.sender?.address || 'Unknown Sender'}
SUBJECT: ${email.subject || '(No Subject)'}
DATE: ${email.date?.toLocaleString() || 'Unknown Date'}
CONTENT:
${content}
            
Instructions:
- Start with a greeting addressing the sender
- Acknowledge their message
- Provide helpful information or next steps
- End with a professional closing
- Do not include any explanations or notes outside of the email reply`
          }
        ],
        model: 'claude-3-haiku-20240307'
      });
      
      console.log('Puter chat API response:', response);
      generatedText = response?.message?.content || response?.choices?.[0]?.message?.content;
    } else if (typeof puterWindow.puter.ai.txt2img === 'function') {
      // As a fallback, demonstrate Puter is working but explain we can't generate text
      console.log('Puter only has txt2img available, not suitable for email replies');
      throw new Error('Puter.js has AI capabilities but no text generation methods suitable for email replies');
    } else {
      // Fallback to arbitrary method attempt
      console.log('No suitable Puter.js AI methods found');
      throw new Error('No compatible Puter.js AI methods found for generating email replies');
    }
    
    return {
      subject,
      body: generatedText || "Thank you for your email. I'll get back to you shortly.\n\nBest regards,\n[Your Name]",
      confidence: 0.95, // High confidence since it's using a specialized AI model
    };
  } catch (error) {
    console.error('Error processing with Puter.js directly:', error);
    
    // Log available Puter.js information for debugging
    try {
      const puterWindow = window as any;
      if (puterWindow.puter) {
        console.log('Available Puter properties:', Object.keys(puterWindow.puter));
        if (puterWindow.puter.ai) {
          console.log('Available AI methods:', Object.keys(puterWindow.puter.ai));
        }
      }
    } catch (e) {
      console.error('Error while logging Puter.js debug info:', e);
    }
    
    // Return a fallback response
    return {
      subject: `Re: ${email.subject || '(No Subject)'}`,
      body: "Thank you for your email. I've received your message and will get back to you shortly.\n\nBest regards,\n[Your Name]",
      confidence: 0.5,
    };
  }
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (window as any).REACHINBOX_CONFIG?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include credentials with all requests
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access - consider implementing authentication');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error occurred');
    }
    
    return Promise.reject(error);
  }
);

// Special handling for suggest-reply endpoint to use Puter.js if available
api.interceptors.request.use(
  async (config) => {
    // Check if it's a suggest-reply request
    if (config.url?.includes('/suggest-reply') && typeof window !== 'undefined') {
      try {
        // Use the isPuterAvailable function we defined above
        const puterAvailable = isPuterAvailable();
        
        if (puterAvailable) {
          console.log('Puter.js is available for email processing');
          
          // Extract email ID from URL
          const urlParts = config.url.split('/');
          const emailId = urlParts[urlParts.indexOf('emails') + 1];
          
          // Get the email data
          const emailResponse = await api.get(`/api/emails/${emailId}`);
          const email = emailResponse.data.data;
          
          if (email) {
            // Store email for later use
            if (typeof window !== 'undefined') {
              (window as any).__emailDetail = email;
            }
            
            // Mark the request for special handling
            config.headers = config.headers || {};
            config.headers['X-Use-Puter'] = 'true';
            
            // Ensure credentials are included
            config.withCredentials = true;
          }
        } else {
          console.log('Puter.js is not available, using server-side processing');
        }
      } catch (error) {
        console.error('Failed to prepare for Puter.js:', error);
        // Continue with the original request if there's an error
      }
    }
    return config;
  }
);

// Email API functions
export const emailAPI = {
  // Get emails with filtering and pagination
  async getEmails(params: EmailSearchQuery): Promise<EmailSearchResult> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value instanceof Date) {
          queryParams.append(key, value.toISOString());
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const response = await api.get(`/api/emails?${queryParams.toString()}`);
    
    // Convert date strings back to Date objects
    if (response.data.success && response.data.data.emails) {
      response.data.data.emails = response.data.data.emails.map((email: any) => ({
        ...email,
        date: new Date(email.date),
        createdAt: new Date(email.createdAt),
        updatedAt: new Date(email.updatedAt)
      }));
    }
    
    return response.data.data;
  },

  // Get single email by ID
  async getEmailById(id: string): Promise<EmailMessage> {
    const response = await api.get(`/api/emails/${id}`);
    
    if (response.data.success) {
      const email = response.data.data;
      return {
        ...email,
        date: new Date(email.date),
        createdAt: new Date(email.createdAt),
        updatedAt: new Date(email.updatedAt)
      };
    }
    
    throw new Error(response.data.error || 'Failed to fetch email');
  },

  // Update email (mark as read, starred, etc.)
  async updateEmail(id: string, updates: Partial<EmailMessage>): Promise<EmailMessage> {
    const response = await api.patch(`/api/emails/${id}`, updates);
    
    if (response.data.success) {
      const email = response.data.data;
      return {
        ...email,
        date: new Date(email.date),
        createdAt: new Date(email.createdAt),
        updatedAt: new Date(email.updatedAt)
      };
    }
    
    throw new Error(response.data.error || 'Failed to update email');
  },

  // Get email statistics
  async getStats(): Promise<EmailStats> {
    const response = await api.get('/api/emails/stats/overview');
    
    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch email statistics');
  },

  // Manually trigger sync
  async triggerSync(accountId?: string): Promise<void> {
    const response = await api.post('/api/emails/sync', { accountId });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to trigger sync');
    }
  },

  // Get sync status
  async getSyncStatus(): Promise<SyncStatus> {
    const response = await api.get('/api/emails/sync/status');
    
    if (response.data.success) {
      const status = response.data.data;
      // Convert lastSync dates
      const lastSync: { [accountId: string]: Date } = {};
      Object.entries(status.lastSync).forEach(([accountId, dateString]) => {
        lastSync[accountId] = new Date(dateString as string);
      });
      
      return {
        ...status,
        lastSync
      };
    }
    
    throw new Error(response.data.error || 'Failed to fetch sync status');
  },

  // Generate suggested reply
  async generateSuggestedReply(
    emailId: string, 
    context?: string[], 
    productInfo?: string
  ): Promise<{ subject: string; body: string; confidence: number }> {
    try {
      // Check if Puter.js should be used directly
      if (typeof window !== 'undefined' && (window as any).__emailDetail) {
        // Try to use Puter.js integration first
        try {
          const emailToProcess = (window as any).__emailDetail;
          
          // Check for Puter.js availability with our updated function that checks for chat API
          const puterAvailable = isPuterAvailable();
          
          if (puterAvailable) {
            console.log('Using Puter.js for direct client-side processing with chat API');
            
            // Process with Puter.js directly using the chat API
            const result = await processPuterEmailDirectly(emailToProcess);
            
            // Clean up stored email
            delete (window as any).__emailDetail;
            
            return result;
          }
        } catch (puterError) {
          console.error('Error using Puter.js for client-side processing:', puterError);
          // Fall back to server-side processing
        }
      }
      
      // Standard server-side processing
      const response = await api.post(`/api/emails/${emailId}/suggest-reply`, {
        context,
        productInfo
      });
      
      if (response.data.success) {
        // Handle special case where server indicates client should process
        if (response.data.data.clientProcessing) {
          // If server returned clientProcessing flag but we didn't process client-side above,
          // return a fallback response
          return {
            subject: `Re: ${(window as any).__emailDetail?.subject || 'Your email'}`,
            body: "Thank you for your email. I'll review it and get back to you soon.\n\nBest regards,\n[Your Name]",
            confidence: 0.5
          };
        }
        
        return response.data.data.suggestedReply;
      }
      
      throw new Error(response.data.error || 'Failed to generate suggested reply');
    } catch (error) {
      console.error('Error generating suggested reply:', error);
      throw error;
    }
  },

  // Bulk update emails
  async bulkUpdateEmails(emailIds: string[], updates: Partial<EmailMessage>): Promise<void> {
    const response = await api.post('/api/emails/bulk/update', { emailIds, updates });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to bulk update emails');
    }
  },
};

// Search API functions
export const searchAPI = {
  // Advanced search
  async advancedSearch(searchParams: {
    query?: string;
    filters?: any;
    pagination?: { page?: number; limit?: number };
    sort?: { field?: string; order?: string };
  }): Promise<EmailSearchResult> {
    const response = await api.post('/api/search', searchParams);
    
    if (response.data.success) {
      const result = response.data.data;
      // Convert date strings back to Date objects
      if (result.emails) {
        result.emails = result.emails.map((email: any) => ({
          ...email,
          date: new Date(email.date),
          createdAt: new Date(email.createdAt),
          updatedAt: new Date(email.updatedAt)
        }));
      }
      return result;
    }
    
    throw new Error(response.data.error || 'Advanced search failed');
  },

  // Quick text search
  async quickSearch(query: string, options?: { limit?: number; account?: string; category?: EmailCategory }): Promise<{
    results: Array<{
      id: string;
      sender: any;
      subject: string;
      date: Date;
      category?: EmailCategory;
      confidence?: number;
      snippet: string;
    }>;
    total: number;
    query: string;
  }> {
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.account) params.append('account', options.account);
    if (options?.category) params.append('category', options.category);

    const response = await api.get(`/search/quick?${params.toString()}`);
    
    if (response.data.success) {
      const result = response.data.data;
      // Convert date strings
      if (result.results) {
        result.results = result.results.map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }));
      }
      return result;
    }
    
    throw new Error(response.data.error || 'Quick search failed');
  },

  // Get search suggestions
  async getSuggestions(query: string, type: 'all' | 'senders' | 'subjects' | 'accounts' | 'folders' = 'all'): Promise<{
    senders: Array<{ address: string; name?: string }>;
    subjects: string[];
    accounts: string[];
    folders: string[];
  }> {
    const response = await api.get(`/search/suggestions?q=${encodeURIComponent(query)}&type=${type}`);
    
    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get search suggestions');
  },

  // Search by category
  async searchByCategory(
    category: EmailCategory,
    filters?: { account?: string; dateFrom?: Date; dateTo?: Date },
    pagination?: { page?: number; limit?: number }
  ): Promise<EmailSearchResult> {
    const params = new URLSearchParams({ category });
    
    if (filters?.account) params.append('account', filters.account);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
    if (filters?.dateTo) params.append('dateTo', filters.dateTo.toISOString());
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());

    const response = await api.get(`/search/by-category?${params.toString()}`);
    
    if (response.data.success) {
      const result = response.data.data;
      // Convert date strings
      if (result.emails) {
        result.emails = result.emails.map((email: any) => ({
          ...email,
          date: new Date(email.date),
          createdAt: new Date(email.createdAt),
          updatedAt: new Date(email.updatedAt)
        }));
      }
      return result;
    }
    
    throw new Error(response.data.error || 'Category search failed');
  },

  // Find similar emails
  async findSimilarEmails(emailId: string, limit: number = 5): Promise<{
    originalEmail: { id: string; subject: string; sender: any };
    similarEmails: EmailMessage[];
    total: number;
  }> {
    const response = await api.get(`/search/${emailId}/similar?limit=${limit}`);
    
    if (response.data.success) {
      const result = response.data.data;
      // Convert date strings for similar emails
      if (result.similarEmails) {
        result.similarEmails = result.similarEmails.map((email: any) => ({
          ...email,
          date: new Date(email.date),
          createdAt: new Date(email.createdAt),
          updatedAt: new Date(email.updatedAt)
        }));
      }
      return result;
    }
    
    throw new Error(response.data.error || 'Failed to find similar emails');
  },

  // Get analytics trends (moved to analyticsAPI)
  async getAnalyticsTrends(
    period: '7d' | '30d' | '90d' = '30d',
    filters?: { account?: string; category?: EmailCategory }
  ): Promise<{
    period: string;
    dateRange: { from: Date; to: Date };
    totalEmails: number;
    stats: {
      byAccount: Array<{ key: string; doc_count: number }>;
      byCategory: Array<{ key: string; doc_count: number }>;
      byFolder: Array<{ key: string; doc_count: number }>;
    };
  }> {
    const params = new URLSearchParams({ period });
    if (filters?.account) params.append('account', filters.account);
    if (filters?.category) params.append('category', filters.category);

    const response = await api.get(`/api/analytics/trends?${params.toString()}`);
    
    if (response.data.success) {
      const result = response.data.data;
      return {
        ...result,
        dateRange: {
          from: new Date(result.dateRange.from),
          to: new Date(result.dateRange.to)
        }
      };
    }
    
    throw new Error(response.data.error || 'Failed to get analytics trends');
  },
};

// Analytics API functions
export const analyticsAPI = {
  // Get analytics trends
  async getAnalyticsTrends(
    period: '7d' | '30d' | '90d' = '30d',
    filters?: { account?: string; category?: EmailCategory }
  ): Promise<{
    period: string;
    dateRange: { from: Date; to: Date };
    totalEmails: number;
    stats: {
      byAccount: Array<{ key: string; doc_count: number }>;
      byCategory: Array<{ key: string; doc_count: number }>;
      byFolder: Array<{ key: string; doc_count: number }>;
    };
  }> {
    const params = new URLSearchParams({ period });
    if (filters?.account) params.append('account', filters.account);
    if (filters?.category) params.append('category', filters.category);

    const response = await api.get(`/api/analytics/trends?${params.toString()}`);
    
    if (response.data.success) {
      const result = response.data.data;
      return {
        ...result,
        dateRange: {
          from: new Date(result.dateRange.from),
          to: new Date(result.dateRange.to)
        }
      };
    }
    
    throw new Error(response.data.error || 'Failed to get analytics trends');
  },
  
  // Get dashboard analytics data
  async getDashboardAnalytics(params?: {
    dateFrom?: string,
    dateTo?: string,
    account?: string
  }): Promise<AnalyticsData> {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params?.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    
    if (params?.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    
    if (params?.account) {
      queryParams.append('account', params.account);
    }
    
    const url = `/api/analytics/dashboard?${queryParams.toString()}`;
    const response = await api.get(url);
    
    if (response.status === 200) {
      return response.data;
    }
    
    throw new Error('Failed to get dashboard analytics');
  },
  
  // Get email volume by day
  async getEmailVolumeByDay(params?: {
    dateFrom?: string,
    dateTo?: string,
    account?: string,
    category?: string
  }): Promise<VolumeByTimeData[]> {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params?.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    
    if (params?.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    
    if (params?.account) {
      queryParams.append('account', params.account);
    }
    
    if (params?.category) {
      queryParams.append('category', params.category);
    }
    
    const url = `/api/analytics/volume/daily?${queryParams.toString()}`;
    const response = await api.get(url);
    
    if (response.status === 200) {
      return response.data;
    }
    
    throw new Error('Failed to get daily email volume');
  },
  
  // Get email volume by hour
  async getEmailVolumeByHour(params?: {
    dateFrom?: string,
    dateTo?: string,
    account?: string,
    category?: string
  }): Promise<HourlyVolumeData[]> {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params?.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    
    if (params?.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    
    if (params?.account) {
      queryParams.append('account', params.account);
    }
    
    if (params?.category) {
      queryParams.append('category', params.category);
    }
    
    const url = `/api/analytics/volume/hourly?${queryParams.toString()}`;
    const response = await api.get(url);
    
    if (response.status === 200) {
      return response.data;
    }
    
    throw new Error('Failed to get hourly email volume');
  },
  
  // Get category distribution trends
  async getCategoryTrends(params?: {
    dateFrom?: string,
    dateTo?: string,
    account?: string
  }): Promise<CategoryTrendData[]> {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params?.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    
    if (params?.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    
    if (params?.account) {
      queryParams.append('account', params.account);
    }
    
    const url = `/api/analytics/trends/categories?${queryParams.toString()}`;
    const response = await api.get(url);
    
    if (response.status === 200) {
      return response.data;
    }
    
    throw new Error('Failed to get category trends');
  },
  
  // Get response time metrics
  async getResponseTimeMetrics(params?: {
    dateFrom?: string,
    dateTo?: string,
    account?: string
  }): Promise<ResponseTimeMetrics> {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params?.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    
    if (params?.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    
    if (params?.account) {
      queryParams.append('account', params.account);
    }
    
    const url = `/api/analytics/metrics/response-time?${queryParams.toString()}`;
    const response = await api.get(url);
    
    if (response.status === 200) {
      return response.data;
    }
    
    throw new Error('Failed to get response time metrics');
  },
};

// Health API functions
export const healthAPI = {
  // Basic health check
  async getHealth(): Promise<any> {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Detailed health check
  async getDetailedHealth(): Promise<any> {
    const response = await api.get('/api/health/detailed');
    return response.data;
  },

  // Readiness check
  async getReadiness(): Promise<any> {
    const response = await api.get('/api/health/ready');
    return response.data;
  },
};

// Export the configured axios instance for custom requests
export default api;
