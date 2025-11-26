# Rate Limiting Load Tests

This document describes the load tests for the rate limiting system and how to run them.

## Prerequisites

Before running the load tests, ensure the following services are running:

1. **PostgreSQL Database**
2. **Redis** (optional, but recommended for full testing)

### Starting Services

```bash
# From the project root
docker-compose up -d postgres redis

# Wait for services to be healthy
docker-compose ps
```

### Running Database Migrations

```bash
# From the project root
cd packages/auth-service
npm run migrate
```

## Running the Tests

```bash
# Run all load tests
npm test -- rate-limit-load.test.ts --runInBand

# Run with verbose output
npm test -- rate-limit-load.test.ts --runInBand --verbose

# Run specific test suite
npm test -- rate-limit-load.test.ts -t "Free Tier Rate Limits"
```

## Test Coverage

The load tests verify the following scenarios:

### 1. Free Tier Rate Limits
- **AI Query Limit**: Enforces 5 queries per day under concurrent load
- **Test Limit**: Enforces 3 tests per day under concurrent load
- **Sequential Requests**: Handles rapid sequential requests correctly
- **Rate Limit Headers**: Returns correct remaining count in headers

### 2. Premium Tier Rate Limits
- **Unlimited AI Queries**: Allows unlimited queries under high load (50+ concurrent)
- **Unlimited Tests**: Allows unlimited test generation under high load (30+ concurrent)
- **Performance**: Maintains performance with unlimited access

### 3. Mixed Load Scenarios
- **Concurrent Mixed Tiers**: Handles free and premium users simultaneously
- **Tier Isolation**: Ensures one tier's usage doesn't affect another

### 4. Database Consistency Under Load
- **Accurate Counting**: Maintains accurate usage counts under concurrent requests
- **No Race Conditions**: Prevents double-counting or missed increments
- **Transaction Safety**: Ensures database operations are atomic

### 5. Redis Failover Scenarios
- **Graceful Degradation**: Handles Redis unavailability without crashing
- **Recovery**: Recovers from temporary Redis connection issues
- **Fallback Behavior**: Falls back to database-only rate limiting if needed

### 6. Performance Under Load
- **Response Time**: All requests complete within acceptable time (<5s for 20 concurrent)
- **Average Latency**: Average response time stays under 500ms
- **Throughput**: System handles expected load without degradation

## Expected Results

### Free Tier
- Exactly 5 AI queries allowed per day
- Exactly 3 tests allowed per day
- 429 status code when limit exceeded
- Upgrade prompt in error response
- Accurate remaining count in headers

### Premium Tier
- Unlimited queries and tests
- All requests succeed (200 status)
- -1 in remaining count header (indicates unlimited)
- No rate limit errors

### Performance Metrics
- 20 concurrent requests complete in <5 seconds
- Average response time <500ms
- No database deadlocks or race conditions
- Accurate usage tracking in database

## Troubleshooting

### Database Connection Errors

If you see `role "postgres" does not exist`:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Redis Connection Errors

If Redis tests fail:
```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Test Timeouts

If tests timeout:
- Increase timeout in test configuration
- Check database performance
- Verify network connectivity
- Check for resource constraints

## Load Test Parameters

Current test parameters:
- **Free tier concurrent requests**: 10 (AI), 8 (tests)
- **Premium tier concurrent requests**: 50 (AI), 30 (tests)
- **Mixed load**: 10 free + 20 premium concurrent
- **Sequential rapid requests**: 7 requests
- **Performance test**: 20 concurrent requests

These parameters can be adjusted in the test file to simulate different load scenarios.

## Continuous Integration

For CI/CD pipelines, ensure:
1. Database and Redis services are available
2. Migrations are run before tests
3. Tests run with `--runInBand` flag to avoid conflicts
4. Cleanup happens after tests complete

Example CI configuration:
```yaml
- name: Start services
  run: docker-compose up -d postgres redis
  
- name: Wait for services
  run: docker-compose exec -T postgres pg_isready -U postgres
  
- name: Run migrations
  run: cd packages/auth-service && npm run migrate
  
- name: Run load tests
  run: cd packages/auth-service && npm test -- rate-limit-load.test.ts --runInBand
```
