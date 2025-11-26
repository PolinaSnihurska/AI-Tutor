import { Router, Request, Response } from 'express';
import { collectRUMData } from '../utils/performance';
import { log } from '../utils/logger';

const router = Router();

// Real User Monitoring endpoint
router.post('/rum', (req: Request, res: Response) => {
  try {
    collectRUMData(req, res);
  } catch (error) {
    log.error('Failed to collect RUM data', { error });
    res.status(500).json({ error: 'Failed to collect performance data' });
  }
});

// Custom analytics event endpoint
router.post('/analytics/event', (req: Request, res: Response) => {
  try {
    const { event, properties } = req.body;
    
    log.info('Analytics event', {
      event,
      properties,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    log.error('Failed to track analytics event', { error });
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Performance metrics endpoint (for internal monitoring)
router.get('/performance/metrics', (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    res.json({
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    log.error('Failed to get performance metrics', { error });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

export default router;
