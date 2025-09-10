import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { EmailSearchQuery, EmailCategory } from '../models/email';

const router = Router();

// Advanced search endpoint
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    query,
    filters = {},
    pagination = {},
    sort = {}
  } = req.body;

  try {
    // Build search query from request body
    const searchQuery: EmailSearchQuery = {
      q: query,
      page: pagination.page || 1,
      limit: Math.min(pagination.limit || 20, 100),
      sortBy: sort.field || 'date',
      sortOrder: sort.order || 'desc'
    };

    // Apply filters
    if (filters.account) searchQuery.account = filters.account;
    if (filters.folder) searchQuery.folder = filters.folder;
    if (filters.category && Object.values(EmailCategory).includes(filters.category)) {
      searchQuery.category = filters.category;
    }
    if (filters.sender) searchQuery.sender = filters.sender;
    if (filters.subject) searchQuery.subject = filters.subject;
    if (filters.dateFrom) searchQuery.dateFrom = new Date(filters.dateFrom);
    if (filters.dateTo) searchQuery.dateTo = new Date(filters.dateTo);
    if (filters.isRead !== undefined) searchQuery.isRead = Boolean(filters.isRead);
    if (filters.isStarred !== undefined) searchQuery.isStarred = Boolean(filters.isStarred);
    if (filters.hasAttachments !== undefined) searchQuery.hasAttachments = Boolean(filters.hasAttachments);

    const { imapEmailService } = require('../index');
    const result = await imapEmailService.searchEmails(searchQuery);

    res.status(200).json({
      success: true,
      data: result,
      searchQuery: {
        query,
        filters,
        pagination,
        sort
      }
    });

  } catch (error: any) {
    logger.error('Error in advanced search:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
}));

// Quick text search
router.get('/quick', asyncHandler(async (req: Request, res: Response) => {
  const { 
    q,
    limit = '10',
    account,
    category
  } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "q" is required for quick search'
    });
  }

  try {
    const searchQuery: EmailSearchQuery = {
      q: q as string,
      limit: Math.min(parseInt(limit as string), 50),
      sortBy: 'date',
      sortOrder: 'desc'
    };

    // Optional filters for quick search
    if (account) searchQuery.account = account as string;
    if (category && Object.values(EmailCategory).includes(category as EmailCategory)) {
      searchQuery.category = category as EmailCategory;
    }

    const { imapEmailService } = require('../index');
    const result = await imapEmailService.searchEmails(searchQuery);

    // Return simplified response for quick search
    const quickResults = result.emails.map(email => ({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      date: email.date,
      category: email.category,
      confidence: email.confidence,
      snippet: email.bodyText.substring(0, 150) + (email.bodyText.length > 150 ? '...' : '')
    }));

    res.status(200).json({
      success: true,
      data: {
        results: quickResults,
        total: result.total,
        query: q
      }
    });

  } catch (error: any) {
    logger.error('Error in quick search:', error);
    res.status(500).json({
      success: false,
      error: 'Quick search failed',
      message: error.message
    });
  }
}));

// Search suggestions/autocomplete
router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const { q, type = 'all' } = req.query;

  if (!q || (q as string).length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query must be at least 2 characters long'
    });
  }

  try {
    const { imapEmailService } = require('../index');
    
    const suggestions: any = {
      senders: [],
      subjects: [],
      accounts: [],
      folders: []
    };

    // Get suggestions based on type
    if (type === 'all' || type === 'senders') {
      // Search for sender suggestions
      const senderResults = await imapEmailService.searchEmails({
        q: `sender.address:*${q}* OR sender.name:*${q}*`,
        limit: 5
      });
      
      suggestions.senders = Array.from(new Set(
        senderResults.emails.map(email => ({
          address: email.sender.address,
          name: email.sender.name
        }))
      )).slice(0, 5);
    }

    if (type === 'all' || type === 'subjects') {
      // Search for subject suggestions
      const subjectResults = await imapEmailService.searchEmails({
        q: `subject:*${q}*`,
        limit: 5
      });
      
      suggestions.subjects = Array.from(new Set(
        subjectResults.emails.map(email => email.subject)
      )).slice(0, 5);
    }

    if (type === 'all' || type === 'accounts') {
      // Get account suggestions
      const accountResults = await imapEmailService.searchEmails({
        q: `account:*${q}*`,
        limit: 5
      });
      
      suggestions.accounts = Array.from(new Set(
        accountResults.emails.map(email => email.account)
      ));
    }

    if (type === 'all' || type === 'folders') {
      // Get folder suggestions
      const folderResults = await imapEmailService.searchEmails({
        q: `folder:*${q}*`,
        limit: 5
      });
      
      suggestions.folders = Array.from(new Set(
        folderResults.emails.map(email => email.folder)
      ));
    }

    res.status(200).json({
      success: true,
      data: suggestions,
      query: q,
      type
    });

  } catch (error: any) {
    logger.error('Error getting search suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search suggestions',
      message: error.message
    });
  }
}));

// Search by category with aggregations
router.get('/by-category', asyncHandler(async (req: Request, res: Response) => {
  const { 
    category,
    account,
    dateFrom,
    dateTo,
    page = '1',
    limit = '20'
  } = req.query;

  if (!category || !Object.values(EmailCategory).includes(category as EmailCategory)) {
    return res.status(400).json({
      success: false,
      error: 'Valid category is required',
      availableCategories: Object.values(EmailCategory)
    });
  }

  try {
    const searchQuery: EmailSearchQuery = {
      category: category as EmailCategory,
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 100),
      sortBy: 'date',
      sortOrder: 'desc'
    };

    if (account) searchQuery.account = account as string;
    if (dateFrom) searchQuery.dateFrom = new Date(dateFrom as string);
    if (dateTo) searchQuery.dateTo = new Date(dateTo as string);

    const { imapEmailService } = require('../index');
    const result = await imapEmailService.searchEmails(searchQuery);

    res.status(200).json({
      success: true,
      data: result,
      category: category,
      filters: { account, dateFrom, dateTo }
    });

  } catch (error: any) {
    logger.error('Error searching by category:', error);
    res.status(500).json({
      success: false,
      error: 'Category search failed',
      message: error.message
    });
  }
}));

// Search emails with similar content (More Like This)
router.get('/:emailId/similar', asyncHandler(async (req: Request, res: Response) => {
  const { emailId } = req.params;
  const { limit = '5' } = req.query;

  try {
    const { imapEmailService } = require('../index');
    
    // Get the original email
    const originalEmail = await imapEmailService.getEmailById(emailId);
    if (!originalEmail) {
      return res.status(404).json({
        success: false,
        error: 'Email not found',
        emailId
      });
    }

    // Search for similar emails using subject and body content
    const searchTerms = [
      ...originalEmail.subject.split(' ').filter(word => word.length > 3),
      ...originalEmail.bodyText.split(' ').slice(0, 20).filter(word => word.length > 3)
    ].slice(0, 10).join(' ');

    const searchQuery: EmailSearchQuery = {
      q: searchTerms,
      limit: parseInt(limit as string) + 1, // +1 to exclude original email
      sortBy: 'date',
      sortOrder: 'desc'
    };

    const result = await imapEmailService.searchEmails(searchQuery);
    
    // Filter out the original email
    const similarEmails = result.emails.filter(email => email.id !== emailId);

    res.status(200).json({
      success: true,
      data: {
        originalEmail: {
          id: originalEmail.id,
          subject: originalEmail.subject,
          sender: originalEmail.sender
        },
        similarEmails: similarEmails.slice(0, parseInt(limit as string)),
        total: similarEmails.length
      }
    });

  } catch (error: any) {
    logger.error(`Error finding similar emails for ${emailId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to find similar emails',
      message: error.message
    });
  }
}));

// Advanced aggregations and analytics
router.get('/analytics/trends', asyncHandler(async (req: Request, res: Response) => {
  const { 
    period = '30d',
    account,
    category 
  } = req.query;

  try {
    const { imapEmailService } = require('../index');
    
    // Calculate date range based on period
    const now = new Date();
    const dateFrom = new Date();
    
    switch (period) {
      case '7d':
        dateFrom.setDate(now.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(now.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(now.getDate() - 90);
        break;
      default:
        dateFrom.setDate(now.getDate() - 30);
    }

    const searchQuery: EmailSearchQuery = {
      dateFrom,
      dateTo: now,
      limit: 0 // We only want aggregations
    };

    if (account) searchQuery.account = account as string;
    if (category && Object.values(EmailCategory).includes(category as EmailCategory)) {
      searchQuery.category = category as EmailCategory;
    }

    // Get basic stats
    const result = await imapEmailService.searchEmails(searchQuery);
    const stats = await imapEmailService.getEmailStats();

    res.status(200).json({
      success: true,
      data: {
        period,
        dateRange: { from: dateFrom, to: now },
        totalEmails: result.total,
        stats: {
          byAccount: stats.by_account?.buckets || [],
          byCategory: stats.by_category?.buckets || [],
          byFolder: stats.by_folder?.buckets || []
        }
      }
    });

  } catch (error: any) {
    logger.error('Error getting analytics trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics trends',
      message: error.message
    });
  }
}));

export default router;
