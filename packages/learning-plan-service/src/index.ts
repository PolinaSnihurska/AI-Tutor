import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { getScheduledJobsService } from './services/scheduledJobsService';
import notificationRoutes from './routes/notificationRoutes';
import learningPlanRoutes from './routes/learningPlanRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.LEARNING_PLAN_SERVICE_PORT || 3004;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'learning-plan-service' });
});

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/plans', learningPlanRoutes);

// Start scheduled jobs
const scheduledJobs = getScheduledJobsService();
scheduledJobs.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  scheduledJobs.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  scheduledJobs.stop();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Learning Plan Service running on port ${PORT}`);
});

export default app;
