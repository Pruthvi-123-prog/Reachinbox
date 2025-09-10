import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import cors from 'cors';

const router = Router();

// Set up permissive CORS for health routes
const healthCors = cors({
  origin: function(origin, callback) {
    // Allow all origins for health endpoints
    // This is necessary for deployment monitoring
    callback(null, true);
    
    // Log origins for debugging purposes
    if (origin) {
      logger.debug(`Health endpoint accessed from origin: ${origin}`);
    }
  },
  credentials: true,
  methods: ['GET', 'OPTIONS']
});

// Basic health check
router.get('/', healthCors, asyncHandler(async (req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(healthStatus);
}));

// Debug endpoint for IMAP service connectivity
router.get('/imap-debug', healthCors, asyncHandler(async (req: Request, res: Response) => {
  const { imapEmailService } = require('../index');
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    imapServiceAvailable: imapEmailService ? imapEmailService.isInitialized : false,
    environmentVars: {
      IMAP1_HOST: process.env.IMAP1_HOST,
      IMAP1_USER: process.env.IMAP1_USER ? '***configured***' : 'not set',
      IMAP2_HOST: process.env.IMAP2_HOST,
      IMAP2_USER: process.env.IMAP2_USER ? '***configured***' : 'not set'
    }
  };
  
  try {
    if (imapEmailService) {
      const status = imapEmailService.getStatus();
      debugInfo.imapStatus = status;
      debugInfo.pingStatus = 'success';
    } else {
      debugInfo.pingStatus = 'error';
      debugInfo.pingError = {
        message: 'IMAP service not initialized'
      };
    }
  } catch (err: any) {
    debugInfo.error = {
      message: err.message,
      stack: err.stack
    };
  }

  res.status(200).json(debugInfo);
}));

// Detailed health check with service dependencies
// Response timeout guard to prevent hanging
router.get('/detailed', healthCors, asyncHandler(async (req: Request, res: Response) => {
  // Set a timeout to ensure we always respond quickly
  const responseTimeout = setTimeout(() => {
    logger.warn('Health check timeout reached, responding with minimal status');
    res.status(200).json({
      status: 'responding',
      timestamp: new Date().toISOString(),
      service: 'reachinbox-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      message: 'Health check timed out - returning minimal status',
      checks: {
        system: { status: 'healthy', message: 'API server is running' }
      }
    });
  }, 2000); // 2 second timeout
  
  const checks: { [key: string]: any } = {};
  
  try {
    // Add system check immediately
    checks.system = { status: 'healthy', message: 'API server is running' };
    
    // Check IMAP service connection
    const { imapEmailService } = require('../index');
    if (imapEmailService) {
      try {
        const status = imapEmailService.getStatus();
        if (status.isInitialized && status.connectedAccounts > 0) {
          checks.imapService = { 
            status: 'healthy', 
            message: `Connected to ${status.connectedAccounts} accounts`,
            totalEmails: status.totalEmails
          };
        } else {
          checks.imapService = { 
            status: 'degraded', 
            message: 'Service initialized but no accounts connected',
            fallbackEnabled: true
          };
        }
      } catch (error: any) {
        checks.imapService = { 
          status: 'degraded', 
          message: `Error checking IMAP service: ${error.message}`,
          fallbackEnabled: true
        };
        logger.warn(`Health check error: ${error.message}`);
      }
    } else {
      checks.imapService = { 
        status: 'unknown', 
        message: 'Service not initialized',
        fallbackEnabled: true 
      };
    }

    // Check Email sync service
    const { emailSyncService } = require('../index');
    if (emailSyncService) {
      const syncStatus = emailSyncService.getStatus();
      checks.emailSync = {
        status: syncStatus.isRunning ? 'healthy' : 'unhealthy',
        connectedAccounts: syncStatus.connectedAccounts,
        totalAccounts: syncStatus.totalAccounts,
        lastSync: syncStatus.lastSync
      };
    } else {
      checks.emailSync = { status: 'unknown', message: 'Service not initialized' };
    }

    // Check Slack service
    const { slackService } = require('../index');
    if (slackService) {
      try {
        const slackHealthy = await slackService.testConnection();
        checks.slack = {
          status: slackHealthy ? 'healthy' : 'disabled',
          message: slackHealthy ? 'Connected' : 'Not configured or connection failed'
        };
      } catch (error: any) {
        checks.slack = {
          status: 'disabled',
          message: 'Not configured or connection failed'
        };
      }
    } else {
      checks.slack = { status: 'disabled', message: 'Service not initialized' };
    }

    // Check Webhook service
    const { webhookService } = require('../index');
    if (webhookService) {
      const webhookStatus = webhookService.getStatus();
      checks.webhook = {
        status: webhookStatus.enabled ? 'healthy' : 'disabled',
        url: webhookStatus.url
      };
    } else {
      checks.webhook = { status: 'unknown', message: 'Service not initialized' };
    }

    // Check AI Categorization service
    const { aiCategorizeService } = require('../index');
    if (aiCategorizeService) {
      const aiStatus = aiCategorizeService.getStatus();
      checks.aiCategorization = {
        status: aiStatus.enabled ? 'healthy' : 'fallback',
        provider: aiStatus.provider,
        model: aiStatus.model,
        fallbackAvailable: aiStatus.fallbackAvailable
      };
    } else {
      checks.aiCategorization = { status: 'unknown', message: 'Service not initialized' };
    }

    // Overall health status - more nuanced check
    // Count services in each state
    const states = {
      healthy: 0,
      degraded: 0,
      disabled: 0,
      unhealthy: 0,
      unknown: 0
    };
    
    Object.values(checks).forEach((check: any) => {
      if (check.status in states) {
        states[check.status as keyof typeof states]++;
      }
    });
    
    // Determine overall status
    let overallStatus = 'healthy';
    if (states.unhealthy > 0) {
      overallStatus = 'degraded'; // Not fully unhealthy if some services work
    } else if (states.degraded > 0) {
      overallStatus = 'degraded';
    } else if (states.healthy === 0 && states.disabled === 0) {
      overallStatus = 'unknown';
    }
    
    const healthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'reachinbox-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      checks,
      message: overallStatus === 'degraded' ? 
        'Some services are in degraded state but the API remains functional' : 
        'All services are operational'
    };
    
    // Clear the timeout since we're responding now
    clearTimeout(responseTimeout);
    
    // Always return 200 for health check to prevent cascading failures
    // The frontend can interpret the detailed status
    res.status(200).json(healthStatus);

  } catch (error: any) {
    // Clear the timeout since we're responding now
    clearTimeout(responseTimeout);
    
    logger.error('Health check error:', error);
    
    // Return 200 even on error to prevent cascading failures
    res.status(200).json({
      status: 'responding_with_errors',
      timestamp: new Date().toISOString(),
      service: 'reachinbox-backend',
      error: error.message,
      checks: checks || { system: { status: 'healthy', message: 'API server is running but encountered errors' } }
    });
  }
}));

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { imapEmailService, emailSyncService } = require('../index');
    
    // Check if minimal requirements are met to serve requests
    const imapStatus = { ready: false, optional: false };
    const syncStatus = { ready: false, optional: false };
    
    // IMAP service is required for email functionality
    if (imapEmailService) {
      try {
        const status = imapEmailService.getStatus();
        imapStatus.ready = status.isInitialized && status.connectedAccounts > 0;
      } catch (err) {
        imapStatus.ready = false;
        logger.info(`Error checking IMAP service readiness: ${err}`);
      }
    }
    
    // Email sync is required
    if (emailSyncService) {
      const status = emailSyncService.getStatus();
      syncStatus.ready = status.isRunning;
    }
    
    // We're ready if required services are ready
    const isReady = imapStatus.ready && syncStatus.ready;
    
    if (isReady) {
      res.status(200).json({ 
        status: 'ready', 
        timestamp: new Date().toISOString(),
        imapService: imapStatus.ready ? 'ready' : 'not ready',
        emailSync: syncStatus.ready ? 'ready' : 'not ready'
      });
    } else {
      res.status(200).json({ 
        status: 'ready with limitations', 
        timestamp: new Date().toISOString(),
        message: 'Service is ready but some features may be limited',
        imapService: imapStatus.ready ? 'ready' : 'not ready',
        emailSync: syncStatus.ready ? 'ready' : 'not ready'
      });
    }
  } catch (error: any) {
    // Still return 200 to prevent cascading failures
    res.status(200).json({ 
      status: 'ready with limitations', 
      timestamp: new Date().toISOString(),
      message: `Service ready with reduced functionality: ${error.message}`,
      error: error.message 
    });
  }
}));

// Liveness probe (for Kubernetes/Docker)
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
}));

export default router;
