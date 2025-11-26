# Cache Strategy and Invalidation

This document outlines the caching strategy and invalidation policies for the AI Tutoring Platform.

## Overview

The platform uses Redis for caching to improve performance and reduce load on AI services and databases. Caching is implemented across multiple services with different TTL (Time To Live) policies based on data volatility.

## Cache Types and TTLs

### 1. AI Service Caches

#### Explanation Cache
- **Key Pattern**: `explanation:{hash}`
- **TTL**: 24 hours (86400 seconds)
- **Purpose**: Cache AI-generated explanations for common topics
- **Invalidation**: Manual invalidation when content is updated or improved

#### Test Template Cache
- **Key Pattern**: `test:template:{subject}:{topics}:{difficulty}:{count}`
- **TTL**: 1 week (604800 seconds)
- **Purpose**: Cache AI-generated test templates for reuse
- **Invalidation**: When test quality issues are reported or content is updated

#### Learning Plan Cache
- **Key Pattern**: `learning_plan:{student_id}:{subjects}:{exam_type}:{days}`
- **TTL**: 24 hours (86400 seconds)
- **Purpose**: Cache generated learning plans to avoid regeneration
- **Invalidation**: When student completes tasks or performance changes significantly

### 2. Test Service Caches

#### Test Template Cache
- **Key Pattern**: `test:template:{subject}:{topics}:{difficulty}:{count}`
- **TTL**: 1 week (604800 seconds)
- **Purpose**: Cache test templates for quick test generation
- **Invalidation**: Subject-specific or global invalidation

### 3. Session and Rate Limiting Caches

#### Session Cache
- **Key Pattern**: `session:{user_id}`
- **TTL**: 1 hour (3600 seconds)
- **Purpose**: Store user session data
- **Invalidation**: On logout or token refresh

#### Rate Limit Cache
- **Key Pattern**: `rate_limit:{user_id}:{endpoint}`
- **TTL**: Varies by endpoint (typically 60-3600 seconds)
- **Purpose**: Track API usage for rate limiting
- **Invalidation**: Automatic expiration based on time window

## Cache Invalidation Strategies

### 1. Time-Based Invalidation (TTL)
Most caches use TTL-based expiration. This is the primary invalidation mechanism for:
- AI explanations (24 hours)
- Test templates (1 week)
- Learning plans (24 hours)
- Sessions (1 hour)

### 2. Event-Based Invalidation
Certain events trigger immediate cache invalidation:

#### Content Updates
- When admin updates explanation content → Invalidate related explanation caches
- When test questions are modified → Invalidate test template caches
- When curriculum changes → Invalidate subject-specific caches

#### Student Progress Events
- When student completes a test → Invalidate learning plan cache
- When student performance changes significantly → Invalidate learning plan cache
- When student updates profile → Invalidate session cache

#### System Events
- When AI model is updated → Invalidate all AI-generated content caches
- When cache corruption is detected → Invalidate affected caches

### 3. Manual Invalidation
Admin tools are available for manual cache invalidation:
- Invalidate specific topic explanations
- Invalidate subject-specific test templates
- Invalidate student learning plans
- Clear all caches (emergency use only)

## Cache Invalidation API

### AI Service Endpoints

```python
# Invalidate explanation cache
POST /cache/invalidate/explanation
{
  "topic": "quadratic equations",
  "subject": "mathematics"
}

# Invalidate test templates
POST /cache/invalidate/tests
{
  "subject": "mathematics"  # Optional
}

# Invalidate learning plan
POST /cache/invalidate/learning-plan
{
  "student_id": "user-123"
}

# Get cache statistics
GET /cache/stats
```

### Test Service Endpoints

```typescript
// Invalidate test caches
POST /api/cache/invalidate
{
  "subject": "mathematics"  // Optional
}

// Check cache health
GET /api/cache/health
```

## Cache Performance Monitoring

### Key Metrics
1. **Cache Hit Rate**: Target > 70%
2. **Cache Miss Rate**: Target < 30%
3. **Average Response Time**: 
   - Cache hit: < 10ms
   - Cache miss: < 2000ms (with AI generation)
4. **Memory Usage**: Monitor Redis memory consumption
5. **Eviction Rate**: Should be minimal with proper TTLs

### Monitoring Tools
- Redis INFO command for memory and stats
- Application logs for cache hit/miss rates
- Prometheus metrics for cache performance
- Grafana dashboards for visualization

## Cache Warming Strategies

### 1. Proactive Caching
- Pre-generate and cache common explanations during off-peak hours
- Cache popular test templates based on usage patterns
- Pre-compute learning plans for active students

### 2. Lazy Loading with Background Refresh
- Serve stale cache while refreshing in background
- Update cache asynchronously after serving request
- Prevents cache stampede on popular content

## Cache Failure Handling

### Redis Unavailability
- Application continues to function without cache
- All cache operations fail gracefully
- Logs warnings but doesn't block requests
- Automatic reconnection attempts

### Cache Corruption
- Validate cached data before use
- Fall back to fresh generation if validation fails
- Log corruption events for investigation
- Automatic invalidation of corrupted entries

## Best Practices

### 1. Cache Key Design
- Use consistent naming conventions
- Include version numbers for breaking changes
- Make keys human-readable for debugging
- Use hashing for long or complex keys

### 2. Cache Size Management
- Set appropriate TTLs based on data volatility
- Monitor memory usage and set maxmemory policies
- Use Redis eviction policies (allkeys-lru recommended)
- Regularly review and optimize cache usage

### 3. Cache Consistency
- Invalidate related caches together
- Use cache versioning for gradual rollouts
- Document cache dependencies
- Test invalidation logic thoroughly

### 4. Security
- Don't cache sensitive user data
- Encrypt cache keys if they contain PII
- Use separate Redis instances for different data types
- Implement access controls on cache management endpoints

## Configuration

### Redis Configuration
```
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Application Configuration
```env
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=50
```

## Troubleshooting

### High Cache Miss Rate
1. Check if TTLs are too short
2. Verify cache keys are generated consistently
3. Review invalidation frequency
4. Check for cache evictions due to memory pressure

### Memory Issues
1. Review cache sizes and TTLs
2. Check for memory leaks in application
3. Verify eviction policy is working
4. Consider increasing Redis memory or adding nodes

### Stale Data
1. Review TTL settings
2. Check invalidation logic
3. Verify event-based invalidation is working
4. Consider reducing TTLs for volatile data

## Future Improvements

1. **Distributed Caching**: Implement cache sharding for scalability
2. **Cache Preloading**: Intelligent cache warming based on usage patterns
3. **Multi-Level Caching**: Add application-level cache (in-memory) for hot data
4. **Cache Analytics**: Advanced analytics for cache optimization
5. **Automatic Cache Tuning**: ML-based TTL and eviction policy optimization
