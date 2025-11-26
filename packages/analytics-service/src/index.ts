import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import analyticsRoutes from './routes/analyticsRoutes';
import parentRoutes from './routes/parentRoutes';
import healthRoutes from './routes/healthRoutes';
import { runMigrations } from './db/migrate';
import { ScheduledJobsService } from './services/scheduledJobsService';
import { AnalyticsWebSocket } from './websocket/analyticsWebSocket';
import {
  initializeSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  metricsMiddleware,
  captureException,
} from './utils/monitoring';

dotenv.config();

// Initialize Sentry
initializeSentry(process.env.SENTRY_DSN);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.ANALYTICS_SERVICE_PORT || 3004;

// Sentry request handler must be first
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Prometheus metrics middleware
app.use(metricsMiddleware());

// Health and monitoring routes (no auth required)
app.use('/', healthRoutes);

// Routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/parent', parentRoutes);

// Sentry error handler must be before other error handlers
app.use(sentryErrorHandler());

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Capture exception in Sentry
  captureException(err, {
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
  });
  
  res.status(500).json({ error: 'Internal server error' });
});

let analyticsWS: AnalyticsWebSocket;

// Initialize database and start server
async function start() {
  try {
    // Run database migrations
    console.log('Running database migrations...');
    await runMigrations();
    
    // Start scheduled jobs
    ScheduledJobsService.start();
    
    // Initialize WebSocket server
    analyticsWS = new AnalyticsWebSocket(httpServer);
    console.log('WebSocket server initialized');
    
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`Analytics service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start analytics service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  ScheduledJobsService.stop();
  if (analyticsWS) {
    await analyticsWS.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  ScheduledJobsService.stop();
  if (analyticsWS) {
    await analyticsWS.close();
  }
  process.exit(0);
});

start();
