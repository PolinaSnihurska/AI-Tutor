import { Request, Response, NextFunction } from 'express';
import { UsageTrackingService } from '../services/usageTrackingService';

export type UsageType = 'ai_query' | 'test';

/**
 * Middleware to enforce rate limits based on subscription tier
 */
export function rateLimitBySubscription(usageType: UsageType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const subscription = req.subscription;
      
      if (!userId || !subscription) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      let limitCheck: { allowed: boolean; remaining: number };
      
      if (usageType === 'ai_query') {
        limitCheck = await UsageTrackingService.checkAIQueryLimit(userId, subscription.plan);
      } else if (usageType === 'test') {
        limitCheck = await UsageTrackingService.checkTestLimit(userId, subscription.plan);
      } else {
        return next();
      }
      
      // Add rate limit headers
      if (limitCheck.remaining >= 0) {
        res.setHeader('X-RateLimit-Remaining', limitCheck.remaining.toString());
      }
      
      if (!limitCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: `Daily ${usageType.replace('_', ' ')} limit reached`,
          currentPlan: subscription.plan,
          upgradeRequired: subscription.plan === 'free',
          message: subscription.plan === 'free' 
            ? 'Upgrade to Premium for unlimited access'
            : 'Daily limit reached, resets at midnight',
        });
      }
      
      // Track usage after successful request (will be called in the actual endpoint)
      req.trackUsage = async () => {
        if (usageType === 'ai_query') {
          await UsageTrackingService.incrementAIQueries(userId);
        } else if (usageType === 'test') {
          await UsageTrackingService.incrementTests(userId);
        }
      };
      
      next();
    } catch (error) {
      console.error('Rate limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check rate limit',
      });
    }
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      trackUsage?: () => Promise<void>;
    }
  }
}
