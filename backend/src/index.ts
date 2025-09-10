import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { ElasticsearchService } from './services/elasticsearchService';
import { EmailSyncService } from './services/emailSyncService';
import { SlackService } from './services/slackService';
import { WebhookService } from './services/webhookService';
import { AICategorizeService } from './services/aiCategorizeService';

// Global error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Server NOT shutting down:', error);
  
  // Special handling for the IMAP idle error - log and continue
  if (error.message && error.message.includes('imap.idle is not a function')) {
    logger.warn('IMAP idle not supported, continuing with polling mode');
    return; // Don't exit for this specific error
  }
  
  // Log the error but don't exit - this keeps the server running
});

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('UNHANDLED REJECTION! 💥 Server NOT shutting down. Reason:', reason);
  
  // Special handling for IMAP errors
  if (reason && reason.message && 
      (reason.message.includes('IMAP') || reason.message.includes('imap'))) {
    logger.warn('IMAP connection issue detected, continuing operation');
    return;
  }
  
  // Log the rejection but don't exit
});
import emailRoutes from './routes/emailRoutes';
import searchRoutes from './routes/searchRoutes';
import healthRoutes from './routes/healthRoutes';
import groqRoutes from './routes/groqRoutes';
import groqProxyRoutes from './routes/groqProxyRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting - increased for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit to 500 requests per windowMs for development
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
// Commenting out rate limiter for development
// app.use(limiter);
app.use(helmet({
  // Disable contentSecurityPolicy for development
  contentSecurityPolicy: false
}));
app.use(compression());

// CORS configuration - allow all origins for public API
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins for public API access
    // This is necessary for deployed Vercel frontend to access Render backend
    callback(null, true);
    
    // Log origins for debugging purposes
    if (origin) {
      logger.debug(`CORS request from origin: ${origin}`);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Use-Puter', 'X-Requested-With']
}));

app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/groq', groqRoutes);
app.use('/api/groq-proxy', groqProxyRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler);

// Global services
let elasticsearchService: ElasticsearchService;
let emailSyncService: EmailSyncService;
let slackService: SlackService;
let webhookService: WebhookService;
let aiCategorizeService: AICategorizeService;

// Service monitoring
let serviceMonitor: NodeJS.Timeout;

async function initializeServices() {
  try {
    logger.info('Initializing services...');
    
    // Initialize Elasticsearch
    elasticsearchService = new ElasticsearchService();
    const elasticsearchAvailable = await elasticsearchService.initialize();
    
    // Initialize AI categorization service
    aiCategorizeService = new AICategorizeService();
    
    // Initialize Slack service
    slackService = new SlackService();
    
    // Initialize Webhook service
    webhookService = new WebhookService();
    
    // Always initialize the Email sync service, even if Elasticsearch is not available
    // This allows the service to run in a degraded mode without Elasticsearch
    emailSyncService = new EmailSyncService(
      elasticsearchService,
      aiCategorizeService,
      slackService,
      webhookService
    );
    
    // Set a flag to indicate if we're running in fallback mode
    if (!elasticsearchAvailable) {
      logger.warn('Initializing Email sync service in fallback mode due to Elasticsearch unavailability');
      // We still initialize the service but some features will be limited
    }
    
    // Start email synchronization 
    await emailSyncService.startSync();

    // Set up service monitoring to restart services if they fail
    serviceMonitor = setInterval(() => {
      try {
        // Check email sync service status and restart if needed, but only if it exists
        if (emailSyncService) {
          const status = emailSyncService.getStatus();
          if (!status.isRunning) {
            logger.warn('Email sync service is not running. Attempting to restart...');
            emailSyncService.startSync().catch(err => {
              logger.error('Failed to restart email sync service:', err);
            });
          }
        }
      } catch (error) {
        logger.error('Service monitor error:', error);
      }
    }, 60000); // Check every minute
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Clear service monitor
  if (serviceMonitor) {
    clearInterval(serviceMonitor);
  }
  
  if (emailSyncService) {
    await emailSyncService.stopSync();
  }
  
  if (elasticsearchService) {
    await elasticsearchService.close();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Clear service monitor
  if (serviceMonitor) {
    clearInterval(serviceMonitor);
  }
  
  if (emailSyncService) {
    await emailSyncService.stopSync();
  }
  
  if (elasticsearchService) {
    await elasticsearchService.close();
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    try {
      await initializeServices();
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      logger.info('Continuing with limited functionality');
    }
    
    const server = app.listen(PORT, () => {
      const address = server.address();
      const actualPort = typeof address === 'string' ? address : address?.port;
      
      console.log('\n🚀 =================================');
      console.log('🚀 REACHINBOX BACKEND SERVER STARTED');
      console.log('🚀 =================================');
      console.log(`🚀 Server URL: http://localhost:${actualPort}`);
      console.log(`🚀 API Base URL: http://localhost:${actualPort}/api`);
      console.log(`🚀 Health Check: http://localhost:${actualPort}/api/health`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
      console.log('🚀 =================================\n');
      
      logger.info(`ReachInbox Backend Server running on port ${actualPort}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, elasticsearchService, emailSyncService, slackService, webhookService, aiCategorizeService };
