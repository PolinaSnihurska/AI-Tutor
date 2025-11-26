# Load and Performance Testing

This directory contains comprehensive load and performance tests for the AI Tutoring Platform using k6.

## Overview

These tests validate the system's performance under various load conditions, ensuring it meets the requirements specified in the design document:

- **Requirement 7.1**: AI response time < 2 seconds
- **Requirement 7.2**: Test generation < 1 second  
- **Requirement 7.3**: Analytics updates < 10 seconds
- **Requirement 7.4**: 99.9% uptime
- **Requirement 7.5**: Crash rate < 0.1%

## Test Scenarios

### 1. Full Load Test (`full-load.js`)

Simulates 1000 concurrent users performing various operations across all services.

**Load Profile:**
- Ramp up: 0 → 100 → 500 → 1000 users over 6 minutes
- Sustained: 1000 users for 3 minutes
- Ramp down: 1000 → 0 users over 1 minute

**Operations Tested:**
- 30% AI explanation requests
- 20% Test generation and taking
- 20% Learning plan access
- 20% Analytics viewing
- 10% Mixed workflows

**Key Metrics:**
- Overall response time (p95 < 2s)
- Error rate (< 1%)
- AI response time (p95 < 2s)
- Test generation time (p95 < 1s)
- Learning plan generation (p95 < 5s)
- Analytics updates (p95 < 10s)

**Run:**
```bash
npm run test:load          # Full 1000 user test (5 minutes)
npm run test:load:light    # Light 100 user test (2 minutes)
```

### 2. AI Service Load Test (`ai-service.js`)

Focused load test on the AI service to verify response times under heavy load.

**Load Profile:**
- Ramp up: 0 → 100 → 300 → 500 users over 2.5 minutes
- Sustained: 500 users for 30 seconds
- Ramp down: 500 → 0 users over 30 seconds

**Operations Tested:**
- AI explanations (70% common topics, 30% rare topics)
- Test generation via AI
- Learning plan generation via AI

**Key Metrics:**
- AI response time (p95 < 2s, p99 < 3s)
- Cache hit rate
- Error rate (< 1%)

**Run:**
```bash
npm run test:ai
```

### 3. Database Stress Test (`database-stress.js`)

Tests database performance under heavy concurrent load.

**Load Profile:**
- Ramp up: 0 → 200 → 500 → 800 users over 5 minutes
- Sustained: 800 users for 2 minutes
- Ramp down: 800 → 0 users over 1 minute

**Operations Tested:**
- Heavy read operations (analytics queries with aggregations)
- Write operations (test submissions, learning plan updates)
- Complex queries (joins, time-series data)
- Mixed read/write workloads

**Key Metrics:**
- Query time (p95 < 500ms, p99 < 1s)
- Write time (p95 < 1s)
- Read time (p95 < 300ms)
- Error rate (< 1%)

**Run:**
```bash
npm run test:database
```

### 4. Cache Effectiveness Test (`cache-effectiveness.js`)

Validates caching strategy and effectiveness.

**Test Phases:**
1. **Cache Warming** (1 min, 50 users): Populate cache with popular topics
2. **Cache Hit Testing** (2 min, 200 users): Verify cache hits for popular content
3. **Cache Load Testing** (2 min, 0→500 users): Mixed cached/uncached requests

**Operations Tested:**
- AI explanation caching (80% popular, 20% unique)
- Test template caching
- Cache hit rate measurement
- Response time comparison (cached vs uncached)

**Key Metrics:**
- Cache hit rate (> 70%)
- Cached response time (p95 < 100ms)
- Uncached response time (p95 < 2s)

**Run:**
```bash
npm run test:cache
```

## Prerequisites

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

Or download from: https://k6.io/docs/getting-started/installation/

### 2. Start All Services

Ensure all services are running before executing load tests:

```bash
# Option 1: Using Docker Compose
docker-compose up -d

# Option 2: Start services individually
cd packages/auth-service && npm run dev &
cd packages/ai-service && python -m uvicorn app.main:app --reload &
cd packages/test-service && npm run dev &
cd packages/learning-plan-service && npm run dev &
cd packages/analytics-service && npm run dev &
cd packages/frontend && npm run dev &
```

### 3. Create Test Users

The tests will automatically create test users, but you can pre-create them:

```bash
# Run the setup script
node setup-test-users.js
```

### 4. Configure Environment Variables

Set service URLs if different from defaults:

```bash
export AUTH_SERVICE_URL=http://localhost:3001
export AI_SERVICE_URL=http://localhost:8000
export TEST_SERVICE_URL=http://localhost:3003
export LEARNING_PLAN_SERVICE_URL=http://localhost:3004
export ANALYTICS_SERVICE_URL=http://localhost:3005
```

## Running Tests

### Quick Start

Run all tests in sequence (light load):
```bash
npm run test:all
```

### Individual Tests

```bash
# Full load test with 1000 users
npm run test:load

# Light load test with 100 users (faster)
npm run test:load:light

# AI service focused test
npm run test:ai

# Database stress test
npm run test:database

# Cache effectiveness test
npm run test:cache
```

### Custom Test Runs

Run with custom parameters:

```bash
# Custom VUs and duration
k6 run --vus 500 --duration 3m scenarios/full-load.js

# With specific environment variables
k6 run --env AUTH_SERVICE_URL=http://staging.example.com:3001 scenarios/full-load.js

# Output results to file
k6 run --out json=results/test-results.json scenarios/full-load.js

# Run with cloud output (requires k6 cloud account)
k6 run --out cloud scenarios/full-load.js
```

## Interpreting Results

### Key Metrics to Monitor

**Response Times:**
- `http_req_duration`: Overall HTTP request duration
- `ai_response_time`: AI service response time
- `test_generation_time`: Test generation time
- `learning_plan_time`: Learning plan generation time
- `analytics_update_time`: Analytics update time

**Throughput:**
- `http_reqs`: Total number of HTTP requests
- `request_count`: Custom counter for specific operations
- `iterations`: Number of VU iterations completed

**Errors:**
- `http_req_failed`: Percentage of failed HTTP requests
- `errors`: Custom error rate metric

**Cache:**
- `cache_hits`: Cache hit rate
- `cached_response_time`: Response time for cached requests
- `uncached_response_time`: Response time for uncached requests

### Success Criteria

Tests pass if:
- ✅ p95 response time < 2s for AI requests
- ✅ p95 response time < 1s for test generation
- ✅ p95 response time < 5s for learning plan generation
- ✅ p95 response time < 10s for analytics updates
- ✅ Error rate < 1%
- ✅ Cache hit rate > 70%
- ✅ Database query time p95 < 500ms

### Sample Output

```
     ✓ AI response status is 200
     ✓ AI response time < 2s
     ✓ Test generation time < 1s

     checks.........................: 98.50% ✓ 9850  ✗ 150
     data_received..................: 125 MB 2.1 MB/s
     data_sent......................: 45 MB  750 kB/s
     http_req_duration..............: avg=450ms  min=50ms  med=380ms  max=2.5s  p(90)=850ms  p(95)=1.2s
     http_req_failed................: 0.50%  ✓ 50    ✗ 9950
     http_reqs......................: 10000  166.67/s
     ai_response_time...............: avg=380ms  min=100ms med=350ms  max=1.8s  p(95)=750ms
     test_generation_time...........: avg=250ms  min=80ms  med=220ms  max=950ms p(95)=450ms
     cache_hits.....................: 75.00% ✓ 7500  ✗ 2500
```

## Monitoring During Tests

### Real-time Monitoring

Monitor services during load tests:

```bash
# Watch service logs
docker-compose logs -f auth-service
docker-compose logs -f ai-service

# Monitor system resources
htop
docker stats

# Monitor database
docker exec -it postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis
docker exec -it redis redis-cli INFO stats
```

### Grafana Dashboards

If monitoring stack is running, view real-time metrics:
- http://localhost:3000 (Grafana)
- Default credentials: admin/admin

Key dashboards:
- System Overview
- Service Performance
- Database Performance
- Cache Statistics

## Troubleshooting

### Tests Failing

**High error rates:**
- Check if all services are running: `docker-compose ps`
- Check service logs: `docker-compose logs [service-name]`
- Verify database connections
- Check Redis connectivity

**Slow response times:**
- Monitor CPU/memory usage: `docker stats`
- Check database query performance
- Verify cache is working
- Check network latency

**Connection refused errors:**
- Verify service URLs in environment variables
- Check if services are listening on correct ports
- Verify firewall rules

### Resource Constraints

If running on limited hardware:

```bash
# Reduce concurrent users
k6 run --vus 100 --duration 2m scenarios/full-load.js

# Increase ramp-up time
# Edit scenario stages in test files

# Run tests sequentially instead of in parallel
npm run test:ai
# Wait for completion
npm run test:database
```

### Database Performance Issues

```bash
# Check database connections
docker exec -it postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker exec -it postgres psql -U postgres -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Analyze table statistics
docker exec -it postgres psql -U postgres -c "ANALYZE;"
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  workflow_dispatch:      # Manual trigger

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run load tests
        run: |
          cd tests/load
          npm run test:load:light
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: tests/load/results/
```

## Best Practices

1. **Gradual Ramp-up**: Always ramp up load gradually to avoid overwhelming services
2. **Realistic Scenarios**: Model tests after actual user behavior patterns
3. **Monitor Resources**: Watch CPU, memory, and database during tests
4. **Baseline First**: Establish baseline performance before making changes
5. **Test Regularly**: Run load tests regularly to catch performance regressions
6. **Clean Data**: Clean up test data between runs to maintain consistency
7. **Document Results**: Keep records of test results for comparison

## Performance Targets

Based on requirements:

| Metric | Target | Requirement |
|--------|--------|-------------|
| AI Response Time | p95 < 2s | 7.1 |
| Test Generation | p95 < 1s | 7.2 |
| Learning Plan Generation | p95 < 5s | 2.1 |
| Analytics Update | p95 < 10s | 4.4 |
| Error Rate | < 1% | 7.4 |
| Cache Hit Rate | > 70% | 7.1, 7.2 |
| Database Query Time | p95 < 500ms | 7.3 |
| Concurrent Users | 1000+ | 7.4 |

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)
- [k6 Cloud](https://k6.io/cloud/) - For distributed load testing

## Support

For issues or questions:
1. Check service logs
2. Review test output and metrics
3. Consult the main project documentation
4. Open an issue in the project repository
