# Usage Tracking and Rate Limiting Implementation

## Overview

This document describes the implementation of usage tracking and rate limiting for the AI Tutoring Platform, completing task 4 from the implementation plan.

## What Was Implemented

### 1. Usage Tracking System (Subtask 4.1)

#### Database Migration
- **File**: `src/db/migrations/004_create_usage_tracking_table.sql`
- Creates `usage_tracking` table with fields:
  - `user_id`: Reference to user
  - `date`: Date of usage
  - `ai_queries`: Count of AI queries
  - `tests_taken`: Count of tests taken
  - `study_minutes`: Total study time in minutes
- Includes indexes for performance
- Includes cleanup function for old data (90+ days)

#### Usage Tracking Service
- **File**: `src/services/usageTrackingService.ts`
- Methods:
  - `getTodayUsage()`: Get current day's usage
  - `incrementAIQueries()`: Track AI query usage
  - `incrementTests()`: Track test generation usage
  - `addStudyMinutes()`: Track study time
  - `checkAIQueryLimit()`: Check if user can make AI queries
  - `checkTestLimit()`: Check if user can generate tests
  - `getUsageStats()`: Get usage history for date range

#### Scheduled Jobs Service
- **File**: `src/services/scheduledJobsService.ts`
- Runs daily cleanup job at 2 AM
- Removes usage tracking data older than 90 days
- Graceful start/stop for scheduled jobs

### 2. Rate Limiting with Redis (Subtask 4.2)

#### Redis Client
- **File**: `src/services/redisClient.ts`
- Singleton Redis client with connection pooling
- Automatic reconnection on errors
- Health check functionality
- Graceful shutdown support

#### Rate Limiting Middleware
- **File**: `src/middleware/rateLimiter.ts`
- Three types of rate limiters:

##### 1. General Rate Limiter (`createRateLimiter`)
- Configurable window and request limits
- Redis-based with automatic expiration
- Sets standard rate limit headers

##### 2. AI Query Rate Limiter (`aiQueryRateLimiter`)
- Enforces subscription tier limits:
  - Free: 5 queries/day
  - Premium/Family: Unlimited
- Returns upgrade prompts when limit exceeded
- Sets `X-AI-Query-Limit` and `X-AI-Query-Remaining` headers

##### 3. Test Generation Rate Limiter (`testGenerationRateLimiter`)
- Enforces subscription tier limits:
  - Free: 3 tests/day
  - Premium/Family: Unlimited
- Returns upgrade prompts when limit exceeded
- Sets `X-Test-Limit` and `X-Test-Remaining` headers

#### Usage Routes
- **File**: `src/routes/usageRoutes.ts`
- Endpoints:
  - `GET /usage/current`: Get current usage statistics
  - `GET /usage/history`: Get usage history for date range
  - `POST /usage/track/ai-query`: Manually track AI query
  - `POST /usage/track/test`: Manually track test
  - `POST /usage/track/study-time`: Manually track study time

## Dependencies Added

```json
{
  "ioredis": "^5.3.2",
  "node-cron": "^3.0.3",
  "@types/node-cron": "^3.0.11"
}
```

## Configuration

### Environment Variables
```env
REDIS_URL=redis://localhost:6379
```

### Docker Compose
Redis is already configured in `docker-compose.yml`

## Integration Points

### Main Application
- **File**: `src/index.ts`
- Initializes Redis connection on startup
- Starts scheduled jobs
- Graceful shutdown for Redis and scheduled jobs
- Registers `/usage` routes

### Middleware Usage Example

```typescript
// In AI service routes
import { authenticate } from './middleware/authenticate';
import { aiQueryRateLimiter } from './middleware/rateLimiter';

router.post('/ai/explain', 
  authenticate, 
  aiQueryRateLimiter(), 
  async (req, res) => {
    // Handle AI explanation
  }
);

// In test service routes
import { testGenerationRateLimiter } from './middleware/rateLimiter';

router.post('/tests/generate',
  authenticate,
  testGenerationRateLimiter(),
  async (req, res) => {
    // Handle test generation
  }
);
```

## Features

### Rate Limit Headers
All rate-limited endpoints return:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: When limit resets
- `Retry-After`: Seconds until reset (when exceeded)

### Error Responses
When limits are exceeded:
```json
{
  "success": false,
  "error": "AI query limit exceeded",
  "message": "You have reached your daily limit of 5 AI queries. Upgrade to Premium for unlimited access.",
  "limit": 5,
  "remaining": 0,
  "upgradeUrl": "/subscriptions/upgrade"
}
```

### Fallback Behavior
- If Redis is unavailable, requests proceed normally
- Logs warnings but doesn't block functionality
- Ensures service availability

### Dual Tracking
- **Redis**: Real-time tracking with automatic expiration
- **PostgreSQL**: Persistent tracking for analytics
- Synchronization between both systems

## Testing

### Manual Testing
```bash
# Check current usage
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/usage/current

# Get usage history
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/usage/history?startDate=2024-01-01&endDate=2024-01-31"

# Track AI query
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3001/usage/track/ai-query

# Track test
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3001/usage/track/test
```

### Integration Tests
Existing test suite in `src/__tests__/` can be extended to test rate limiting.

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 1.4**: Free tier AI query limit (5/day)
- **Requirement 1.5**: Premium tier unlimited AI queries
- **Requirement 3.5**: Free tier test limit (3/day)
- **Requirement 3.6**: Premium tier unlimited tests

## Next Steps

To use these rate limiters in other services:

1. Import the middleware in your service
2. Apply to relevant endpoints
3. Ensure authentication middleware runs first
4. Handle rate limit errors in frontend

## Documentation

See `src/middleware/README.md` for detailed usage instructions and examples.
