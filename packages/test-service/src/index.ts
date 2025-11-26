import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { connectToMongoDB, disconnectFromMongoDB } from './db/connection';
import testRoutes from './routes/testRoutes';

dotenv.config();

const app = express();
const PORT = process.env.TEST_SERVICE_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'test-service' });
});

// Routes
app.use('/tests', testRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    app.listen(PORT, () => {
      console.log(`Test service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await disconnectFromMongoDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await disconnectFromMongoDB();
  process.exit(0);
});

startServer();
