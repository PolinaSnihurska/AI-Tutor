# Analytics Accuracy Test Execution Guide

## Task 8.7: Test Analytics Accuracy

This guide explains how to execute the analytics accuracy tests that verify:
- ✅ Prediction accuracy meets 85% requirement (Requirement 4.3)
- ✅ Real-time update performance within 10 seconds (Requirement 4.4)
- ✅ Heatmap generation correctness (Requirement 4.2)

## Quick Start

### 1. Start Required Services

```bash
# From project root, start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy
docker-compose ps
```

### 2. Set Up Test Database

```bash
# Create test database
docker exec -it ai-tutor-postgres psql -U postgres -c "CREATE DATABASE ai_tutor_test;"

# Run migrations on test database
cd packages/analytics-service
POSTGRES_DB=ai_tutor_test npm run migrate
```

### 3. Run Tests

```bash
# From packages/analytics-service directory
npm test
```

## Detailed Setup

### Environment Variables

Create a `.env` file in `packages/analytics-service/`:

```env
# Test Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_tutor_test
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379

# Node Environment
NODE_ENV=test
```

### Database Schema

The tests require the following tables (created by migrations):
- `analytics_snapshots` - Historical performance data
- `student_activities` - Activity tracking
- `topic_performance` - Topic-level performance metrics
- `predictions` - Prediction cache

### Running Migrations

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate
```

## Test Execution

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test Suite

```bash
# Prediction accuracy tests only
npm test -- -t "Prediction Accuracy"

# Real-time update tests only
npm test -- -t "Real-time Update Performance"

# Heatmap tests only
npm test -- -t "Heatmap Generation Correctness"
```

### Verbose Output

```bash
npm test -- --verbose
```

## Test Results Interpretation

### Success Criteria

All tests should pass with the following validations:

#### Prediction Accuracy (Requirement 4.3)
- ✅ Predictions generated with valid scores (0-100)
- ✅ Confidence scores within valid range (0-100)
- ✅ Prediction factors included and properly structured
- ✅ Actionable recommendations provided
- ✅ Predictions within ±15% of actual performance (85% accuracy)
- ✅ Valid predictions cached and reused
- ✅ Confidence adjusts based on data availability

#### Real-time Updates (Requirement 4.4)
- ✅ Events tracked and metrics updated within 10 seconds
- ✅ Multiple concurrent events handled efficiently
- ✅ Topic performance updated in real-time

#### Heatmap Correctness (Requirement 4.2)
- ✅ Complete heatmaps generated with all subjects
- ✅ Error rates correctly calculated (0-100%)
- ✅ Topics sorted by error rate (descending)
- ✅ Weak topics identified (error rate >= 50%)
- ✅ Strong topics identified (error rate <= 20%)
- ✅ Trends calculated correctly (improving/stable/declining)
- ✅ All required metadata included
- ✅ Subject-specific heatmaps generated correctly

### Expected Output

```
PASS  src/__tests__/analytics-accuracy.test.ts
  Analytics Accuracy Tests
    Prediction Accuracy (Requirement 4.3)
      ✓ should generate prediction with confidence score
      ✓ should include prediction factors
      ✓ should include actionable recommendations
      ✓ should have prediction accuracy within acceptable range
      ✓ should cache predictions and reuse valid ones
      ✓ should adjust confidence based on data availability
    Real-time Update Performance (Requirement 4.4)
      ✓ should track events and update metrics within 10 seconds
      ✓ should handle multiple concurrent events efficiently
      ✓ should update topic performance in real-time
    Heatmap Generation Correctness (Requirement 4.2)
      ✓ should generate complete heatmap with all subjects
      ✓ should correctly calculate error rates
      ✓ should sort topics by error rate descending
      ✓ should identify weak topics correctly
      ✓ should identify strong topics correctly
      ✓ should calculate trends correctly
      ✓ should include all required topic metadata
      ✓ should generate subject-specific heatmap

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

## Troubleshooting

### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database exists
docker exec -it ai-tutor-postgres psql -U postgres -l

# Recreate test database
docker exec -it ai-tutor-postgres psql -U postgres -c "DROP DATABASE IF EXISTS ai_tutor_test;"
docker exec -it ai-tutor-postgres psql -U postgres -c "CREATE DATABASE ai_tutor_test;"
```

### Redis Connection Errors

```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker exec -it ai-tutor-redis redis-cli ping
```

### Migration Errors

```bash
# Check migration status
npm run migrate

# Reset database and re-run migrations
docker exec -it ai-tutor-postgres psql -U postgres -c "DROP DATABASE IF EXISTS ai_tutor_test;"
docker exec -it ai-tutor-postgres psql -U postgres -c "CREATE DATABASE ai_tutor_test;"
POSTGRES_DB=ai_tutor_test npm run migrate
```

### Test Timeout Errors

If tests timeout, increase the Jest timeout in `jest.config.js`:

```javascript
module.exports = {
  // ...
  testTimeout: 60000, // Increase to 60 seconds
};
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Analytics Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ai_tutor_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
        working-directory: packages/analytics-service
      
      - name: Run migrations
        run: npm run migrate
        working-directory: packages/analytics-service
        env:
          POSTGRES_DB: ai_tutor_test
      
      - name: Run tests
        run: npm test
        working-directory: packages/analytics-service
        env:
          POSTGRES_DB: ai_tutor_test
          REDIS_URL: redis://localhost:6379
```

## Performance Benchmarks

Expected test execution times:
- **Prediction Accuracy Tests**: ~5-10 seconds
- **Real-time Update Tests**: ~3-5 seconds
- **Heatmap Generation Tests**: ~5-8 seconds
- **Total Suite**: ~15-25 seconds

If tests take significantly longer, check:
- Database connection performance
- Redis connection performance
- System resource availability

## Test Data Cleanup

Tests automatically clean up their data, but if needed:

```sql
-- Clean up test data manually
DELETE FROM predictions WHERE student_id LIKE 'test-student-%';
DELETE FROM topic_performance WHERE student_id LIKE 'test-student-%';
DELETE FROM student_activities WHERE student_id LIKE 'test-student-%';
DELETE FROM analytics_snapshots WHERE student_id LIKE 'test-student-%';
```

## Next Steps

After all tests pass:
1. Review test coverage report
2. Add additional edge case tests if needed
3. Integrate into CI/CD pipeline
4. Monitor test performance over time
5. Update tests as requirements evolve
