import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisAvailable } from '../services/redisClient';
import { SUBSCRIPTION_TIERS } from '@ai-tutor/shared-types';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Create a Redis-based rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if Redis is available
      const redisAvailable = await isRedisAvailable();
      if (!redisAvailable) {
        console.warn('Redis unavailable, skipping rate limit check');
        return next();
      }

      const redis = getRedisClient();
      const userId = (req as any).user?.id;
      
      if (!userId) {
        // If no user ID, use IP address
        const identifier = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `${config.keyPrefix}:${identifier}`;
        
        await checkRateLimit(redis, key, config, res, next);
      } else {
        const key = `${config.keyPrefix}:${userId}`;
        await checkRateLimit(redis, key, config, res, next);
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}

/**
 * Check rate limit for a given key
 */
async function checkRateLimit(
  redis: any,
  key: string,
  config: RateLimitConfig,
  res: Response,
  next: NextFunction
): Promise<void> {
  const current = await redis.incr(key);
  
  if (current === 1) {
    // First request in window, set expiration
    await redis.pexpire(key, config.windowMs);
  }
  
  const ttl = await redis.pttl(key);
  const remaining = Math.max(0, config.maxRequests - current);
  const resetTime = Date.now() + ttl;
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
  
  if (current > config.maxRequests) {
    res.setHeader('Retry-After', Math.ceil(ttl / 1000).toString());
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(ttl / 1000),
    });
    return;
  }
  
  next();
}

/**
 * Rate limiter for AI queries based on subscription tier
 */
export function aiQueryRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const userPlan = (req as any).user?.subscription?.plan || 'free';
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }
      
      const tierConfig = SUBSCRIPTION_TIERS[userPlan as keyof typeof SUBSCRIPTION_TIERS];
      
      // Premium and family tiers have unlimited queries
      if (tierConfig.aiQueriesPerDay === 'unlimited') {
        return next();
      }
      
      // Check Redis for current usage
      const redisAvailable = await isRedisAvailable();
      if (!redisAvailable) {
        console.warn('Redis unavailable, skipping AI query rate limit');
        return next();
      }
      
      const redis = getRedisClient();
      const today = new Date().toISOString().split('T')[0];
      const key = `ai_queries:${userId}:${today}`;
      
      const current = await redis.incr(key);
      
      if (current === 1) {
        // First query today, set expiration to end of day
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
        await redis.expire(key, ttl);
      }
      
      const limit = tierConfig.aiQueriesPerDay as number;
      const remaining = Math.max(0, limit - current);
      
      // Set rate limit headers
      res.setHeader('X-AI-Query-Limit', limit.toString());
      res.setHeader('X-AI-Query-Remaining', remaining.toString());
      
      if (current > limit) {
        return res.status(429).json({
          success: false,
          error: 'AI query limit exceeded',
          message: `You have reached your daily limit of ${limit} AI queries. Upgrade to Premium for unlimited access.`,
          limit,
          remaining: 0,
          upgradeUrl: '/subscriptions/upgrade',
        });
      }
      
      next();
    } catch (error) {
      console.error('AI query rate limiter error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}

/**
 * Rate limiter for test generation based on subscription tier
 */
export function testGenerationRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const userPlan = (req as any).user?.subscription?.plan || 'free';
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }
      
      const tierConfig = SUBSCRIPTION_TIERS[userPlan as keyof typeof SUBSCRIPTION_TIERS];
      
      // Premium and family tiers have unlimited tests
      if (tierConfig.testsPerDay === 'unlimited') {
        return next();
      }
      
      // Check Redis for current usage
      const redisAvailable = await isRedisAvailable();
      if (!redisAvailable) {
        console.warn('Redis unavailable, skipping test generation rate limit');
        return next();
      }
      
      const redis = getRedisClient();
      const today = new Date().toISOString().split('T')[0];
      const key = `tests:${userId}:${today}`;
      
      const current = await redis.incr(key);
      
      if (current === 1) {
        // First test today, set expiration to end of day
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
        await redis.expire(key, ttl);
      }
      
      const limit = tierConfig.testsPerDay as number;
      const remaining = Math.max(0, limit - current);
      
      // Set rate limit headers
      res.setHeader('X-Test-Limit', limit.toString());
      res.setHeader('X-Test-Remaining', remaining.toString());
      
      if (current > limit) {
        return res.status(429).json({
          success: false,
          error: 'Test generation limit exceeded',
          message: `You have reached your daily limit of ${limit} tests. Upgrade to Premium for unlimited access.`,
          limit,
          remaining: 0,
          upgradeUrl: '/subscriptions/upgrade',
        });
      }
      
      next();
    } catch (error) {
      console.error('Test generation rate limiter error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}
