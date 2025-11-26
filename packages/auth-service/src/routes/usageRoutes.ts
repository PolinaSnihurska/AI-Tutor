import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { UsageTrackingService } from '../services/usageTrackingService';
import { getRedisClient, isRedisAvailable } from '../services/redisClient';
import { SUBSCRIPTION_TIERS } from '@ai-tutor/shared-types';

const router = Router();

/**
 * Get current usage statistics for the authenticated user
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userPlan = (req as any).user.subscription?.plan || 'free';
    
    // Get database usage
    const dbUsage = await UsageTrackingService.getTodayUsage(userId);
    
    // Get Redis usage if available
    let redisUsage = { aiQueries: 0, tests: 0 };
    const redisAvailable = await isRedisAvailable();
    
    if (redisAvailable) {
      const redis = getRedisClient();
      const today = new Date().toISOString().split('T')[0];
      
      const aiQueriesKey = `ai_queries:${userId}:${today}`;
      const testsKey = `tests:${userId}:${today}`;
      
      const [aiQueries, tests] = await Promise.all([
        redis.get(aiQueriesKey),
        redis.get(testsKey),
      ]);
      
      redisUsage = {
        aiQueries: parseInt(aiQueries || '0', 10),
        tests: parseInt(tests || '0', 10),
      };
    }
    
    // Get tier limits
    const tierConfig = SUBSCRIPTION_TIERS[userPlan as keyof typeof SUBSCRIPTION_TIERS];
    
    res.json({
      success: true,
      data: {
        date: dbUsage.date,
        usage: {
          aiQueries: Math.max(dbUsage.aiQueries, redisUsage.aiQueries),
          tests: Math.max(dbUsage.testsTaken, redisUsage.tests),
          studyMinutes: dbUsage.studyMinutes,
        },
        limits: {
          aiQueries: tierConfig.aiQueriesPerDay,
          tests: tierConfig.testsPerDay,
        },
        remaining: {
          aiQueries: tierConfig.aiQueriesPerDay === 'unlimited' 
            ? 'unlimited' 
            : Math.max(0, (tierConfig.aiQueriesPerDay as number) - Math.max(dbUsage.aiQueries, redisUsage.aiQueries)),
          tests: tierConfig.testsPerDay === 'unlimited'
            ? 'unlimited'
            : Math.max(0, (tierConfig.testsPerDay as number) - Math.max(dbUsage.testsTaken, redisUsage.tests)),
        },
        plan: userPlan,
      },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics',
    });
  }
});

/**
 * Get usage history for a date range
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }
    
    const history = await UsageTrackingService.getUsageStats(userId, start, end);
    
    res.json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        history,
      },
    });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage history',
    });
  }
});

/**
 * Increment AI query count (for testing or manual tracking)
 */
router.post('/track/ai-query', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    await UsageTrackingService.incrementAIQueries(userId);
    
    res.json({
      success: true,
      message: 'AI query tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking AI query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track AI query',
    });
  }
});

/**
 * Increment test count (for testing or manual tracking)
 */
router.post('/track/test', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    await UsageTrackingService.incrementTests(userId);
    
    res.json({
      success: true,
      message: 'Test tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track test',
    });
  }
});

/**
 * Add study minutes (for testing or manual tracking)
 */
router.post('/track/study-time', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { minutes } = req.body;
    
    if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid minutes value is required',
      });
    }
    
    await UsageTrackingService.addStudyMinutes(userId, minutes);
    
    res.json({
      success: true,
      message: 'Study time tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking study time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track study time',
    });
  }
});

export default router;
