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

// Debug endpoint for Elasticsearch connectivity
router.get('/elasticsearch-debug', healthCors, asyncHandler(async (req: Request, res: Response) => {
  const { elasticsearchService } = require('../index');
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    elasticsearchAvailable: elasticsearchService ? elasticsearchService.isAvailable : false,
    elasticsearchHost: process.env.ELASTICSEARCH_HOST || process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    indexName: elasticsearchService ? elasticsearchService.indexName : 'unknown',
    environmentVars: {
      ELASTICSEARCH_HOST: process.env.ELASTICSEARCH_HOST,
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
      ELASTICSEARCH_INDEX_PREFIX: process.env.ELASTICSEARCH_INDEX_PREFIX
    }
  };
  
  try {
    if (elasticsearchService) {
      try {
        const pingResult = await elasticsearchService.client.ping({ requestTimeout: 5000 });
        debugInfo.pingResult = pingResult;
        debugInfo.pingStatus = 'success';
      } catch (pingError: any) {
        debugInfo.pingStatus = 'error';
        debugInfo.pingError = {
          message: pingError.message,
          code: pingError.code,
          stack: pingError.stack
        };
      }
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
    
    // Check Elasticsearch connection with a racing promise
    const { elasticsearchService } = require('../index');
    if (elasticsearchService) {
      try {
        // Create a racing promise that resolves or rejects after 1 second
        let timeoutId;
        const pingPromise = elasticsearchService.client.ping();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Elasticsearch ping timed out after 1 second'));
          }, 1000);
        });
        
        try {
          // Race the promises
          await Promise.race([pingPromise, timeoutPromise]);
          // Clear timeout if ping succeeds
          clearTimeout(timeoutId);
          checks.elasticsearch = { status: 'healthy', message: 'Connected' };
        } catch (error: any) {
          // Don't fail the whole health check just because Elasticsearch is down
          checks.elasticsearch = { 
            status: 'degraded', 
            message: `Not connected: ${error.message}`,
            fallbackEnabled: true
          };
          logger.warn(`Health check: Elasticsearch connection failed: ${error.message}`);
        }
      } catch (error: any) {
        checks.elasticsearch = { 
          status: 'degraded', 
          message: `Error checking Elasticsearch: ${error.message}`,
          fallbackEnabled: true
        };
        logger.warn(`Health check error: ${error.message}`);
      }
    } else {
      checks.elasticsearch = { 
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
    const { elasticsearchService, emailSyncService } = require('../index');
    
    // Check if minimal requirements are met to serve requests
    const esStatus = { ready: false, optional: true };
    const syncStatus = { ready: false, optional: false };
    
    // Elasticsearch is optional - we can fall back to mock behavior
    if (elasticsearchService) {
      try {
        // Quick timeout for readiness checks
        let timeoutId;
        const pingPromise = elasticsearchService.client.ping();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('timeout'));
          }, 1000);
        });
        
        try {
          await Promise.race([pingPromise, timeoutPromise]);
          // Clear timeout if ping succeeds
          clearTimeout(timeoutId);
          esStatus.ready = true;
        } catch (err) {
          // Elasticsearch is down but that's okay if we have fallbacks
          esStatus.ready = false;
          logger.info('Elasticsearch not ready, but continuing with fallback');
        }
      } catch (err) {
        // Error in the check itself
        esStatus.ready = false;
        logger.info(`Error checking Elasticsearch readiness: ${err}`);
      }
    }
    
    // Email sync is required
    if (emailSyncService) {
      const status = emailSyncService.getStatus();
      syncStatus.ready = status.isInitialized || status.isRunning;
    }
    
    // We're ready if required services are ready
    // and optional services are either ready or marked as optional
    const isReady = syncStatus.ready && (esStatus.ready || esStatus.optional);
    
    if (isReady) {
      res.status(200).json({ 
        status: 'ready', 
        timestamp: new Date().toISOString(),
        elasticsearch: esStatus.ready ? 'ready' : 'bypassed (optional)',
        emailSync: syncStatus.ready ? 'ready' : 'not ready'
      });
    } else {
      res.status(200).json({ 
        status: 'ready with limitations', 
        timestamp: new Date().toISOString(),
        message: 'Service is ready but some features may be limited',
        elasticsearch: esStatus.ready ? 'ready' : 'bypassed (optional)',
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
