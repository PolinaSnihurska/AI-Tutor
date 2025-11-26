import Redis from 'ioredis';

/**
 * Cache service for test templates and frequently accessed data
 */
export class CacheService {
  private redis: Redis | null = null;
  private readonly defaultTTL = 3600; // 1 hour
  private readonly testTemplateTTL = 604800; // 1 week

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true,
      });

      this.redis.on('error', (err: Error) => {
        console.error('Redis cache error:', err);
      });

      this.redis.connect().catch((err) => {
        console.error('Failed to connect to Redis:', err);
        this.redis = null;
      });
    } catch (error) {
      console.error('Redis initialization error:', error);
      this.redis = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      
      await this.redis.setex(key, expiry, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Cache a test template
   */
  async cacheTestTemplate(params: {
    subject: string;
    topics: string[];
    difficulty: number;
    questionCount: number;
  }, test: any): Promise<boolean> {
    const key = this.generateTestTemplateKey(params);
    return this.set(key, test, this.testTemplateTTL);
  }

  /**
   * Get cached test template
   */
  async getCachedTestTemplate(params: {
    subject: string;
    topics: string[];
    difficulty: number;
    questionCount: number;
  }): Promise<any | null> {
    const key = this.generateTestTemplateKey(params);
    return this.get(key);
  }

  /**
   * Generate cache key for test template
   */
  private generateTestTemplateKey(params: {
    subject: string;
    topics: string[];
    difficulty: number;
    questionCount: number;
  }): string {
    const sortedTopics = [...params.topics].sort().join(',');
    return `test:template:${params.subject}:${sortedTopics}:${params.difficulty}:${params.questionCount}`;
  }

  /**
   * Invalidate test caches for a subject
   */
  async invalidateTestCaches(subject?: string): Promise<number> {
    const pattern = subject ? `test:template:${subject}:*` : 'test:template:*';
    return this.deletePattern(pattern);
  }

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

export const cacheService = new CacheService();
