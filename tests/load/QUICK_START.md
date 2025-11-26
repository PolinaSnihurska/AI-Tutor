# Load Testing - Quick Start Guide

Get started with load testing in 5 minutes!

## Prerequisites

1. **Install k6**

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

2. **Start all services**

   ```bash
   # From project root
   docker-compose up -d
   
   # Wait for services to be ready (30 seconds)
   sleep 30
   ```

3. **Verify services are running**

   ```bash
   curl http://localhost:3001/health  # Auth service
   curl http://localhost:8000/health  # AI service
   curl http://localhost:3003/health  # Test service
   curl http://localhost:3004/health  # Learning plan service
   curl http://localhost:3005/health  # Analytics service
   ```

## Run Your First Load Test

### Option 1: Run All Tests (Recommended)

```bash
cd tests/load

# Setup test users
node setup-test-users.js

# Run light tests (~10 minutes)
./run-all-tests.sh light
```

### Option 2: Run Individual Tests

```bash
cd tests/load

# Setup test users first
node setup-test-users.js

# Run a quick load test (2 minutes, 100 users)
npm run test:load:light

# Or run AI service test (1 minute, 100 users)
npm run test:ai
```

### Option 3: Custom Test

```bash
cd tests/load

# Run with custom parameters
k6 run --vus 50 --duration 1m scenarios/full-load.js
```

## Understanding Results

After running tests, you'll see output like:

```
✓ AI response status is 200
✓ AI response time < 2s
✓ Test generation time < 1s

checks.........................: 98.50% ✓ 9850  ✗ 150
http_req_duration..............: avg=450ms  p(95)=1.2s
ai_response_time...............: avg=380ms  p(95)=750ms
test_generation_time...........: avg=250ms  p(95)=450ms
cache_hits.....................: 75.00%
```

### Key Metrics

- **checks**: Percentage of successful assertions (should be > 95%)
- **http_req_duration**: Response time (p95 should be < 2s)
- **ai_response_time**: AI service response time (p95 should be < 2s)
- **test_generation_time**: Test generation time (p95 should be < 1s)
- **cache_hits**: Cache hit rate (should be > 70%)

### Pass/Fail

- ✅ **PASS**: All thresholds met, checks > 95%
- ❌ **FAIL**: Any threshold violated or checks < 95%

## Common Issues

### Services Not Running

```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs auth-service
docker-compose logs ai-service

# Restart services
docker-compose restart
```

### Test Users Not Created

```bash
# Manually create test users
cd tests/load
node setup-test-users.js

# Check if users exist
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@loadtest.com","password":"Test123!@#"}'
```

### High Error Rates

1. Check service logs for errors
2. Verify database is running: `docker-compose ps postgres`
3. Verify Redis is running: `docker-compose ps redis`
4. Reduce load: `k6 run --vus 10 --duration 30s scenarios/full-load.js`

## Next Steps

1. **Review detailed results**: Check `tests/load/results/` directory
2. **Read full documentation**: See [README.md](README.md)
3. **Run full tests**: `./run-all-tests.sh full` (for staging/production)
4. **Monitor during tests**: Open Grafana at http://localhost:3000
5. **Optimize performance**: Use results to identify bottlenecks

## Test Scenarios

### Light Tests (Development)
- **Duration**: ~10 minutes
- **Max Users**: 100-200
- **Purpose**: Quick validation during development

### Full Tests (Staging/Production)
- **Duration**: ~25 minutes
- **Max Users**: 1000
- **Purpose**: Comprehensive performance validation

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| AI Response Time | p95 < 2s | ✅ |
| Test Generation | p95 < 1s | ✅ |
| Learning Plan | p95 < 5s | ✅ |
| Analytics Update | p95 < 10s | ✅ |
| Error Rate | < 1% | ✅ |
| Cache Hit Rate | > 70% | ✅ |

## Help

- **Documentation**: [README.md](README.md)
- **Test Summary**: [LOAD_TEST_SUMMARY.md](LOAD_TEST_SUMMARY.md)
- **k6 Docs**: https://k6.io/docs/
- **Issues**: Check service logs and monitoring dashboards

## Quick Commands Reference

```bash
# Setup
node setup-test-users.js

# Run all tests (light)
./run-all-tests.sh light

# Run all tests (full)
./run-all-tests.sh full

# Individual tests
npm run test:load:light    # Quick load test
npm run test:ai            # AI service test
npm run test:database      # Database stress test
npm run test:cache         # Cache effectiveness test

# Custom runs
k6 run --vus 100 --duration 2m scenarios/full-load.js
k6 run --vus 500 --duration 3m scenarios/ai-service.js

# View results
ls -lh results/
cat results/report_*.txt
```

That's it! You're ready to run load tests. 🚀
