import { Router, Request, Response } from 'express';
import { performHealthCheck, getMetrics } from '../utils/monitoring';
import pool from '../db/connection';
import redisClient from '../services/redisClient';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await performHealthCheck(
      'auth-service',
      process.env.npm_package_version || '1.0.0',
      {
        database: async () => {
          try {
            await pool.query('SELECT 1');
            return { status: 'pass', message: 'Database connection successful' };
          } catch (error) {
            return {
              status: 'fail',
              message: error instanceof Error ? error.message : 'Database connection failed',
            };
          }
        },
        redis: async () => {
          try {
            await redisClient.ping();
            return { status: 'pass', message: 'Redis connection successful' };
          } catch (error) {
            return {
              status: 'fail',
              message: error instanceof Error ? error.message : 'Redis connection failed',
            };
          }
        },
        memory: async () => {
          const usage = process.memoryUsage();
          const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
          
          if (heapUsedPercent > 90) {
            return {
              status: 'fail',
              message: `High memory usage: ${heapUsedPercent.toFixed(2)}%`,
            };
          }
          
          return {
            status: 'pass',
            message: `Memory usage: ${heapUsedPercent.toFixed(2)}%`,
          };
        },
      }
    );

    const statusCode = healthCheck.status === 'healthy' ? 200 : healthCheck.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Readiness probe
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.ping();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

// Prometheus metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', 'text/plain');
    res.send(await getMetrics());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to collect metrics',
    });
  }
});

export default router;
