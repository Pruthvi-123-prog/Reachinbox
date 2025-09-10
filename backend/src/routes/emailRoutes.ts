import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { EmailSearchQuery, EmailCategory } from '../models/email';
import cors from 'cors';

const router = Router();

// Set up CORS specifically for email routes
const emailCors = cors({
  origin: function(origin, callback) {
    // Allow all origins for production deployment
    callback(null, true);
    
    // Log origins for debugging purposes
    if (origin) {
      logger.debug(`Email endpoint accessed from origin: ${origin}`);
    }
  },
  credentials: true,
  // Allow the custom header for Puter.js integration
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Use-Puter']
});

// Get emails with filtering and pagination
router.get('/', emailCors, asyncHandler(async (req: Request, res: Response) => {
  const {
    q,
    account,
    folder,
    category,
    sender,
    subject,
    dateFrom,
    dateTo,
    isRead,
    isStarred,
    hasAttachments,
    page = '1',
    limit = '20',
    sortBy = 'date',
    sortOrder = 'desc'
  } = req.query;

  // Build search query
  const searchQuery: EmailSearchQuery = {
    page: parseInt(page as string),
    limit: Math.min(parseInt(limit as string), 100), // Max 100 per page
    sortBy: sortBy as 'date' | 'sender' | 'subject',
    sortOrder: sortOrder as 'asc' | 'desc'
  };

  // Add optional filters
  if (q) searchQuery.q = q as string;
  if (account) searchQuery.account = account as string;
  if (folder) searchQuery.folder = folder as string;
  if (category && Object.values(EmailCategory).includes(category as EmailCategory)) {
    searchQuery.category = category as EmailCategory;
  }
  if (sender) searchQuery.sender = sender as string;
  if (subject) searchQuery.subject = subject as string;
  if (dateFrom) searchQuery.dateFrom = new Date(dateFrom as string);
  if (dateTo) searchQuery.dateTo = new Date(dateTo as string);
  if (isRead !== undefined) searchQuery.isRead = isRead === 'true';
  if (isStarred !== undefined) searchQuery.isStarred = isStarred === 'true';
  if (hasAttachments !== undefined) searchQuery.hasAttachments = hasAttachments === 'true';

  try {
    const { imapEmailService } = require('../index');
    const result = await imapEmailService.searchEmails(searchQuery);

    res.status(200).json({
      success: true,
      data: result,
      query: searchQuery
    });

  } catch (error: any) {
    logger.error('Error fetching emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emails',
      message: error.message
    });
  }
}));

// Get single email by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { imapEmailService } = require('../index');
    const email = await imapEmailService.getEmailById(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found',
        id
      });
    }

    res.status(200).json({
      success: true,
      data: email
    });

  } catch (error: any) {
    logger.error(`Error fetching email ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email',
      message: error.message
    });
  }
}));

// Update email (mark as read, starred, etc.)
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isRead, isStarred, category } = req.body;

  const updates: any = {};
  if (isRead !== undefined) updates.isRead = Boolean(isRead);
  if (isStarred !== undefined) updates.isStarred = Boolean(isStarred);
  if (category && Object.values(EmailCategory).includes(category)) {
    updates.category = category;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid updates provided',
      allowedFields: ['isRead', 'isStarred', 'category']
    });
  }

  try {
    const { imapEmailService } = require('../index');
    
    // Check if email exists
    const existingEmail = await imapEmailService.getEmailById(id);
    if (!existingEmail) {
      return res.status(404).json({
        success: false,
        error: 'Email not found',
        id
      });
    }

    // Update email
    await imapEmailService.updateEmail(id, updates);

    // Get updated email
    const updatedEmail = await imapEmailService.getEmailById(id);

    res.status(200).json({
      success: true,
      data: updatedEmail,
      updates
    });

  } catch (error: any) {
    logger.error(`Error updating email ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email',
      message: error.message
    });
  }
}));

// Get email statistics
router.get('/stats/overview', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { imapEmailService } = require('../index');
    
    // Check if IMAP service is available before attempting to get stats
    let stats;
    let usingMockData = false;
    
    try {
      // Try to get stats with a timeout
      const statsPromise = imapEmailService.getEmailStats();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IMAP service timeout')), 3000);
      });
      
      stats = await Promise.race([statsPromise, timeoutPromise]);
    } catch (imapError: any) {
      // IMAP service is unavailable, use mock data
      logger.warn('Using mock data for email stats:', imapError.message);
      
      usingMockData = true;
      stats = {
        by_category: { buckets: [] },
        by_account: { buckets: [] },
        by_folder: { buckets: [] }
      };
    }

    // Convert categories from underscore format (stored in ES) to hyphen format (used by frontend)
    // This ensures consistent category display
    const categoryCounts: { [key: string]: number } = {};
    (stats.by_category?.buckets || []).forEach((bucket: any) => {
      // Use normalized format with hyphens instead of underscores for frontend consistency
      const normalizedCategory = bucket.key.replace('_', '-');
      categoryCounts[normalizedCategory] = bucket.doc_count;
    });
    
    // Make sure all categories have at least a zero count
    // Use sample categories if no real data is available
    const categories = Object.values(EmailCategory).length > 0 
      ? Object.values(EmailCategory) 
      : ['inbox', 'important', 'work', 'personal', 'updates', 'social'];
      
    categories.forEach((category) => {
      const normalizedCategory = typeof category === 'string' ? category.replace('_', '-') : category;
      if (!categoryCounts[normalizedCategory]) {
        categoryCounts[normalizedCategory] = usingMockData ? Math.floor(Math.random() * 10) : 0;
      }
    });

    // Process aggregations into readable format
    const processedStats = {
      totalEmails: stats.by_account?.buckets?.reduce((total: number, bucket: any) => total + bucket.doc_count, 0) || 
                   (usingMockData ? 23 : 0),
      byAccount: stats.by_account?.buckets?.map((bucket: any) => ({
        account: bucket.key,
        count: bucket.doc_count
      })) || (usingMockData ? [{account: 'example@gmail.com', count: 23}] : []),
      byCategory: Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count
      })),
      byFolder: stats.by_folder?.buckets?.map((bucket: any) => ({
        folder: bucket.key,
        count: bucket.doc_count
      })) || (usingMockData ? [{folder: 'INBOX', count: 15}, {folder: 'Sent', count: 8}] : []),
      categories: categoryCounts, // Direct access to category counts
      isMockData: usingMockData
    };

    res.status(200).json({
      success: true,
      data: processedStats
    });

  } catch (error: any) {
    logger.error('Error fetching email stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email statistics',
      message: error.message
    });
  }
}));

// Manually trigger sync for specific account or all accounts
router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
  const { accountId, force } = req.body;

  try {
    const { emailSyncService } = require('../index');
    
    if (!emailSyncService) {
      return res.status(503).json({
        success: false,
        error: 'Email sync service not available'
      });
    }

    const status = emailSyncService.getStatus();
    if (!status.isRunning) {
      return res.status(503).json({
        success: false,
        error: 'Email sync service is not running'
      });
    }
    
    // Log the sync request
    logger.info(`Manual sync requested for account: ${accountId || 'all'}, force: ${!!force}`);

    // Respond immediately with acknowledgment and run the sync in the background
    res.status(200).json({
      success: true,
      message: `Sync started for ${accountId || 'all'} accounts`,
      status: 'processing',
      accountId: accountId || 'all'
    });
    
    // Run sync in the background - no await
    emailSyncService.manualSync(accountId)
      .then(() => {
        logger.info(`Background sync completed for account: ${accountId || 'all'}`);
      })
      .catch(error => {
        logger.error(`Background sync failed for account: ${accountId || 'all'}:`, error);
      });

  } catch (error: any) {
    logger.error('Error during manual sync:', error);
    res.status(500).json({
      success: false,
      error: 'Manual sync failed',
      message: error.message
    });
  }
}));

// Get sync status with protection against long operations
router.get('/sync/status', emailCors, asyncHandler(async (req: Request, res: Response) => {
  // Using a timeout to ensure we respond quickly even if there are issues
  const timeout = setTimeout(() => {
    logger.warn('Sync status request timed out, returning mock data');
    res.status(200).json({
      success: true,
      data: {
        isRunning: true,
        connectedAccounts: 1,
        totalAccounts: 2,
        lastSync: new Date().toISOString(),
        message: 'Status data is mocked due to timeout',
        isMocked: true,
        accountStatus: [
          { accountId: 'account1', isConnected: true, lastSync: new Date().toISOString() }
        ]
      }
    });
  }, 2000); // 2 second timeout
  
  try {
    const { emailSyncService } = require('../index');
    
    if (!emailSyncService) {
      clearTimeout(timeout);
      return res.status(200).json({
        success: true,
        data: {
          isRunning: false,
          connectedAccounts: 0,
          totalAccounts: 0,
          lastSync: {},
          message: 'Email sync service not initialized'
        }
      });
    }

    const status = emailSyncService.getStatus();
    clearTimeout(timeout);
    
    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error: any) {
    logger.error('Error fetching sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status',
      message: error.message
    });
  }
}));

// Generate AI suggested reply for an email
router.post('/:id/suggest-reply', emailCors, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { context, productInfo } = req.body;
  
  // Check if request is using Puter.js
  const isPuter = req.headers['x-use-puter'] === 'true';
  if (isPuter) {
    logger.info(`Request for email ${id} is using Puter.js integration`);
    
    // Set proper CORS headers for Puter.js responses
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'X-Use-Puter, Content-Type, Authorization');
  }

  try {
    const { elasticsearchService, aiCategorizeService } = require('../index');
    
    // Get the email
    let email = await elasticsearchService.getEmailById(id);
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found',
        id
      });
    }
    
    // Ensure all date properties are properly formatted as Date objects
    try {
      if (email.date && typeof email.date === 'string') {
        email.date = new Date(email.date);
      }
      if (email.createdAt && typeof email.createdAt === 'string') {
        email.createdAt = new Date(email.createdAt);
      }
      if (email.updatedAt && typeof email.updatedAt === 'string') {
        email.updatedAt = new Date(email.updatedAt);
      }
    } catch (dateErr) {
      console.error('Error parsing dates:', dateErr);
      // Continue with the original email object
    }

    // Add extra validation and safely handle emails with missing fields
    if (!email.sender) {
      email.sender = { address: 'unknown@example.com' };
    }
    
    try {
      // Generate suggested reply with proper error handling
      const suggestedReply = await aiCategorizeService.generateSuggestedReply(
        email,
        context || [],
        productInfo,
        { isPuter } // Pass isPuter flag to the service
      );

      // If using Puter.js, return a special response that allows client-side processing
      if (isPuter) {
        res.status(200).json({
          success: true,
          data: {
            emailId: id,
            clientProcessing: true,
            suggestedReply: {
              category: 'TO_BE_PROCESSED_BY_CLIENT',
              confidence: 0,
              replies: []
            },
            generatedAt: new Date().toISOString()
          }
        });
      } else {
        // Normal server-side processing
        res.status(200).json({
          success: true,
          data: {
            emailId: id,
            suggestedReply,
            generatedAt: new Date().toISOString()
          }
        });
      }
    } catch (replyError) {
      console.error('Error generating suggested reply:', replyError);
      
      // Return a graceful error with fallback reply
      const subject = `Re: ${email.subject || '(No Subject)'}`;
      const fallbackReply = {
        category: email.category || 'INTERESTED',
        confidence: 0.5,
        replies: [
          {
            subject,
            body: `Hi there,\n\nThank you for your message. I'll get back to you with a more detailed response soon.\n\nBest regards,\n[Your Name]`
          },
          {
            subject,
            body: `Hello,\n\nI've received your email and will respond as soon as possible.\n\nKind regards,\n[Your Name]`
          }
        ]
      };
      
      res.status(200).json({
        success: true,
        data: {
          emailId: id,
          suggestedReply: fallbackReply,
          generatedAt: new Date().toISOString(),
          fallback: true,
          error: replyError.message
        }
      });
    }

  } catch (error: any) {
    logger.error(`Error generating reply for email ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggested reply',
      message: error.message
    });
  }
}));

// Bulk operations
router.post('/bulk/update', asyncHandler(async (req: Request, res: Response) => {
  const { emailIds, updates } = req.body;

  if (!Array.isArray(emailIds) || emailIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'emailIds must be a non-empty array'
    });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'updates object is required'
    });
  }

  try {
    const { elasticsearchService } = require('../index');
    
    const updatePromises = emailIds.map((id: string) => 
      elasticsearchService.updateEmail(id, updates)
    );

    await Promise.allSettled(updatePromises);

    res.status(200).json({
      success: true,
      message: `Bulk update completed for ${emailIds.length} emails`,
      updatedCount: emailIds.length,
      updates
    });

  } catch (error: any) {
    logger.error('Error during bulk update:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk update failed',
      message: error.message
    });
  }
}));

export default router;
