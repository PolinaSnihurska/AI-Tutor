import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import usageRoutes from './routes/usageRoutes';
import parentRoutes from './routes/parentRoutes';
import healthRoutes from './routes/healthRoutes';
import gdprRoutes from './routes/gdprRoutes';
import { runMigrations } from './db/migrate';
import { ScheduledJobsService } from './services/scheduledJobsService';
import { getRedisClient, closeRedisClient } from './services/redisClient';
import {
  initializeSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  metricsMiddleware,
  captureException,
} from './utils/monitoring';
import {
  helmetConfig,
  corsConfig,
  authRateLimiter,
  passwordResetRateLimiter,
  generalRateLimiter,
  sanitizeInput,
  securityHeaders,
  requestSizeLimiter,
} from './middleware/security';

dotenv.config();

// Initialize Sentry
initializeSentry(process.env.SENTRY_DSN);

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

// Sentry request handler must be first
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Enhanced security middleware
app.use(helmetConfig);
app.use(corsConfig);
app.use(securityHeaders);
app.use(requestSizeLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

// Prometheus metrics middleware
app.use(metricsMiddleware());

// Apply rate limiting to specific endpoints
app.use('/auth/login', authRateLimiter);
app.use('/auth/register', authRateLimiter);
app.use('/auth/request-password-reset', passwordResetRateLimiter);
app.use('/auth/reset-password', passwordResetRateLimiter);
app.use(generalRateLimiter);

// Health and monitoring routes (no auth required)
app.use('/', healthRoutes);

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/usage', usageRoutes);
app.use('/parent', parentRoutes);
app.use('/gdpr', gdprRoutes);

// Sentry error handler must be before other error handlers
app.use(sentryErrorHandler());

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Capture exception in Sentry
  captureException(err, {
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Initialize database and start server
async function start() {
  try {
    console.log('Running database migrations...');
    await runMigrations();
    
    // Initialize Redis connection
    console.log('Connecting to Redis...');
    getRedisClient();
    
    // Start scheduled jobs
    ScheduledJobsService.startAll();
    
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  ScheduledJobsService.stopAll();
  await closeRedisClient();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  ScheduledJobsService.stopAll();
  await closeRedisClient();
  process.exit(0);
});

start();
