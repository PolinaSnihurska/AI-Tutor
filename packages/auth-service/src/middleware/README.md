# Rate Limiting Middleware

This directory contains rate limiting middleware for the AI Tutoring Platform.

## Available Middleware

### 1. `rateLimiter.ts` - General Rate Limiting

#### `createRateLimiter(config)`
Creates a general-purpose Redis-based rate limiter.

**Usage:**
```typescript
import { createRateLimiter } from './middleware/rateLimiter';

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyPrefix: 'api_limit',
});

app.use('/api', apiLimiter);
```

#### `aiQueryRateLimiter()`
Rate limiter specifically for AI query endpoints based on subscription tier.

**Features:**
- Free tier: 5 queries per day
- Premium/Family tier: Unlimited queries
- Returns upgrade prompt when limit exceeded
- Sets `X-AI-Query-Limit` and `X-AI-Query-Remaining` headers

**Usage:**
```typescript
import { aiQueryRateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/authenticate';

// Apply to AI query endpoints
router.post('/ai/explain', authenticate, aiQueryRateLimiter(), async (req, res) => {
  // Handle AI explanation request
});
```

#### `testGenerationRateLimiter()`
Rate limiter specifically for test generation endpoints based on subscription tier.

**Features:**
- Free tier: 3 tests per day
- Premium/Family tier: Unlimited tests
- Returns upgrade prompt when limit exceeded
- Sets `X-Test-Limit` and `X-Test-Remaining` headers

**Usage:**
```typescript
import { testGenerationRateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/authenticate';

// Apply to test generation endpoints
router.post('/tests/generate', authenticate, testGenerationRateLimiter(), async (req, res) => {
  // Handle test generation request
});
```

### 2. `rateLimitBySubscription.ts` - Subscription-Based Rate Limiting

This middleware checks subscription tier limits and enforces feature access.

**Usage:**
```typescript
import { rateLimitBySubscription } from './middleware/rateLimitBySubscription';
import { authenticate } from './middleware/authenticate';

router.post('/premium-feature', authenticate, rateLimitBySubscription, async (req, res) => {
  // Handle premium feature request
});
```

## Rate Limit Headers

All rate limiters set the following headers in responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: ISO timestamp when the rate limit resets
- `Retry-After`: Seconds until rate limit resets (only when limit exceeded)

For AI queries:
- `X-AI-Query-Limit`: Daily AI query limit
- `X-AI-Query-Remaining`: Remaining AI queries today

For tests:
- `X-Test-Limit`: Daily test generation limit
- `X-Test-Remaining`: Remaining tests today

## Error Responses

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "You have reached your daily limit of 5 AI queries. Upgrade to Premium for unlimited access.",
  "limit": 5,
  "remaining": 0,
  "upgradeUrl": "/subscriptions/upgrade"
}
```

## Redis Fallback

If Redis is unavailable, the rate limiters will:
1. Log a warning
2. Allow the request to proceed
3. Continue normal operation

This ensures the service remains available even if Redis is down.

## Usage Tracking

Usage is tracked in two places:

1. **Redis**: Real-time tracking with automatic expiration
2. **PostgreSQL**: Persistent tracking for analytics and history

The `UsageTrackingService` synchronizes between both systems.

## Configuration

Set the following environment variables:

```env
REDIS_URL=redis://localhost:6379
```

## Testing Rate Limits

Use the `/usage` endpoints to check current usage:

```bash
# Get current usage
curl -H "Authorization: Bearer <token>" http://localhost:3001/usage/current

# Get usage history
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/usage/history?startDate=2024-01-01&endDate=2024-01-31"
```
