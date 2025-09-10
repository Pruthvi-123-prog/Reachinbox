import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { ImapEmailService } from '../services/imapEmailService';

const router = Router();

/**
 * Get analytics trends based on actual email data
 * GET /api/analytics/trends
 */
router.get('/trends', asyncHandler(async (req: Request, res: Response) => {
  const { 
    period = '30d', 
    account,
    category,
    startDate,
    endDate
  } = req.query;
  
  try {
    // Get services from the main app instance
    const { imapEmailService } = require('../index');
    
    // Define the date range based on the period parameter
    const now = new Date();
    let fromDate = new Date();
    
    if (startDate && endDate) {
      // Use custom date range if provided
      fromDate = new Date(startDate as string);
      now.setTime(Date.parse(endDate as string));
    } else {
      // Otherwise use the period parameter
      switch(period) {
        case '7d':
          fromDate.setDate(now.getDate() - 7);
          break;
        case '90d':
          fromDate.setDate(now.getDate() - 90);
          break;
        case '365d':
          fromDate.setDate(now.getDate() - 365);
          break;
        case '30d':
        default:
          fromDate.setDate(now.getDate() - 30);
          break;
      }
    }
    
    // Get email analytics from IMAP service
    const analyticsData = await imapEmailService.getEmailAnalytics({
      dateFrom: fromDate,
      dateTo: now,
      account: account as string | undefined,
      category: category as string | undefined
    });
    
    // Calculate daily trends
    const dailyTrends = await imapEmailService.getEmailVolumeByDay({
      dateFrom: fromDate,
      dateTo: now,
      account: account as string | undefined,
      category: category as string | undefined
    });
    
    // Calculate hourly distribution
    const hourlyDistribution = await imapEmailService.getEmailVolumeByHour({
      dateFrom: fromDate,
      dateTo: now,
      account: account as string | undefined,
      category: category as string | undefined
    });
    
    // Calculate category distribution over time
    const categoryTrends = await imapEmailService.getCategoryTrends({
      dateFrom: fromDate,
      dateTo: now,
      account: account as string | undefined
    });
    
    // Calculate response time metrics
    const responseTimeMetrics = await imapEmailService.getResponseTimeMetrics({
      dateFrom: fromDate,
      dateTo: now,
      account: account as string | undefined
    });
    
    res.status(200).json({
      success: true,
      data: {
        period: period,
        dateRange: { 
          from: fromDate, 
          to: now 
        },
        totalEmails: analyticsData.totalEmails,
        stats: {
          byAccount: analyticsData.byAccount,
          byCategory: analyticsData.byCategory,
          byFolder: analyticsData.byFolder
        },
        trends: {
          daily: dailyTrends,
          hourly: hourlyDistribution,
          categoryTrends: categoryTrends
        },
        metrics: {
          responseTime: responseTimeMetrics
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

/**
 * Get email volume by day
 * GET /api/analytics/volume/daily
 */
router.get('/volume/daily', asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, account, category } = req.query;
  
  try {
    // Get services from the main app instance
    const { imapEmailService } = require('../index');
    
    const dailyVolume = await imapEmailService.getEmailVolumeByDay({
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      account: account as string | undefined,
      category: category as string | undefined
    });
    
    res.status(200).json({
      success: true,
      data: dailyVolume
    });
  } catch (error: any) {
    logger.error('Error in daily volume API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch daily volume data',
      message: error.message 
    });
  }
}));

/**
 * Get email volume by hour
 * GET /api/analytics/volume/hourly
 */
router.get('/volume/hourly', asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, account, category } = req.query;
  
  try {
    // Get services from the main app instance
    const { imapEmailService } = require('../index');
    
    const hourlyVolume = await imapEmailService.getEmailVolumeByHour({
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      account: account as string | undefined,
      category: category as string | undefined
    });
    
    res.status(200).json({
      success: true,
      data: hourlyVolume
    });
  } catch (error: any) {
    logger.error('Error in hourly volume API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch hourly volume data',
      message: error.message 
    });
  }
}));

/**
 * Get category trends over time
 * GET /api/analytics/trends/categories
 */
router.get('/trends/categories', asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, account } = req.query;
  
  try {
    // Get services from the main app instance
    const { imapEmailService } = require('../index');
    
    const categoryTrends = await imapEmailService.getCategoryTrends({
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      account: account as string | undefined
    });
    
    res.status(200).json({
      success: true,
      data: categoryTrends
    });
  } catch (error: any) {
    logger.error('Error in category trends API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch category trends data',
      message: error.message 
    });
  }
}));

/**
 * Get response time metrics
 * GET /api/analytics/metrics/response-time
 */
router.get('/metrics/response-time', asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, account } = req.query;
  
  try {
    // Get services from the main app instance
    const { imapEmailService } = require('../index');
    
    const responseTimeMetrics = await imapEmailService.getResponseTimeMetrics({
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      account: account as string | undefined
    });
    
    res.status(200).json({
      success: true,
      data: responseTimeMetrics
    });
  } catch (error: any) {
    logger.error('Error in response time metrics API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch response time metrics',
      message: error.message
    });
  }
}));

/**
 * Get dashboard analytics data
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, account } = req.query;
  
  try {
    // Get services from the main app instance
    const { imapEmailService } = require('../index');
    
    // Define default date range if not provided
    const now = new Date();
    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(now.getTime());
    fromDate.setDate(fromDate.getDate() - 30); // Default to last 30 days if no date range
    const toDate = dateTo ? new Date(dateTo as string) : new Date();
    
    // Since we don't have a specific getDashboardAnalytics method,
    // gather all the necessary analytics data from existing methods
    
    // Get email analytics
    const analyticsData = await imapEmailService.getEmailAnalytics({
      dateFrom: fromDate,
      dateTo: toDate,
      account: account as string | undefined
    });
    
    // Calculate daily trends
    const dailyTrends = await imapEmailService.getEmailVolumeByDay({
      dateFrom: fromDate,
      dateTo: toDate,
      account: account as string | undefined
    });
    
    // Calculate hourly distribution
    const hourlyDistribution = await imapEmailService.getEmailVolumeByHour({
      dateFrom: fromDate,
      dateTo: toDate,
      account: account as string | undefined
    });
    
    // Calculate category distribution over time
    const categoryTrends = await imapEmailService.getCategoryTrends({
      dateFrom: fromDate,
      dateTo: toDate,
      account: account as string | undefined
    });
    
    // Calculate response time metrics
    const responseTimeMetrics = await imapEmailService.getResponseTimeMetrics({
      dateFrom: fromDate,
      dateTo: toDate,
      account: account as string | undefined
    });
    
    // Combine all data into a dashboard object
    const dashboardData = {
      dateRange: { from: fromDate, to: toDate },
      totalEmails: analyticsData.totalEmails,
      stats: {
        byAccount: analyticsData.byAccount,
        byCategory: analyticsData.byCategory,
        byFolder: analyticsData.byFolder
      },
      trends: {
        daily: dailyTrends,
        hourly: hourlyDistribution,
        categoryTrends: categoryTrends
      },
      metrics: {
        responseTime: responseTimeMetrics
      }
    };
    
    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    logger.error('Error in dashboard analytics API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard analytics data',
      message: error.message
    });
  }
}));

export default router;
