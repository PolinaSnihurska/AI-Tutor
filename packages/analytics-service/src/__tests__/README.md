# Analytics Service Tests

## Overview

This directory contains comprehensive tests for the analytics service, specifically testing analytics accuracy as required by task 8.7.

## Test Coverage

### 1. Prediction Accuracy Tests (Requirement 4.3)
- **Prediction Generation**: Verifies that predictions are generated with valid confidence scores (0-100 range)
- **Prediction Factors**: Ensures predictions include detailed factors explaining the prediction
- **Recommendations**: Validates that actionable recommendations are provided
- **Accuracy Validation**: Tests that predictions are within ±15% of actual performance (85% accuracy requirement)
- **Caching**: Verifies that valid predictions are cached and reused
- **Confidence Adjustment**: Tests that confidence scores adjust based on data availability

### 2. Real-time Update Performance Tests (Requirement 4.4)
- **Update Speed**: Verifies that events are tracked and metrics updated within 10 seconds
- **Concurrent Events**: Tests handling of multiple concurrent events efficiently
- **Topic Performance**: Validates real-time topic performance updates

### 3. Heatmap Generation Correctness Tests (Requirement 4.2)
- **Complete Heatmap**: Verifies generation of complete heatmaps with all subjects
- **Error Rate Calculation**: Validates error rates are correctly calculated (0-100 range)
- **Topic Sorting**: Ensures topics are sorted by error rate (descending)
- **Weak Topics**: Tests identification of weak topics (error rate >= 50%)
- **Strong Topics**: Tests identification of strong topics (error rate <= 20%)
- **Trend Calculation**: Validates trend detection (improving/stable/declining)
- **Metadata Completeness**: Ensures all required topic metadata is included
- **Subject-specific Heatmaps**: Tests generation of subject-specific heatmaps

## Running the Tests

### Prerequisites

1. **PostgreSQL Database**: Ensure PostgreSQL is running with the test database
   ```bash
   # Create test database
   createdb ai_tutor_test
   
   # Run migrations
   npm run migrate
   ```

2. **Redis**: Ensure Redis is running for caching tests
   ```bash
   redis-server
   ```

3. **Environment Variables**: Set up test environment variables
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_tutor_test"
   export REDIS_URL="redis://localhost:6379"
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test analytics-accuracy.test.ts

# Run in watch mode
npm test -- --watch
```

## Test Data

The tests create realistic test data including:
- **Analytics Snapshots**: 30 days of historical performance data
- **Topic Performance**: Multiple subjects with varied error rates
- **Student Activities**: Test completions, study sessions, and other activities
- **Predictions**: Cached predictions with validity periods

All test data uses student IDs prefixed with `test-student-` to avoid conflicts with real data and is cleaned up after tests complete.

## Test Scenarios

### Prediction Accuracy Scenarios
1. **Known Performance**: Creates data with known 75% average to validate prediction accuracy
2. **Minimal Data**: Tests prediction with only 3 snapshots (low confidence expected)
3. **Extensive Data**: Tests prediction with 30 snapshots and many activities (high confidence expected)

### Heatmap Scenarios
1. **Multiple Subjects**: Mathematics, Science, English with varied topics
2. **Varied Performance**: Topics with different error rates (0-100%)
3. **Trend Data**: Topics showing improving, stable, and declining trends

### Real-time Update Scenarios
1. **Single Event**: Tests tracking a single event within time limits
2. **Concurrent Events**: Tests handling 10 concurrent events
3. **Topic Updates**: Tests real-time topic performance updates

## Success Criteria

All tests must pass to meet the requirements:

- ✅ **Prediction Accuracy**: Predictions within ±15% of actual performance (85% accuracy)
- ✅ **Real-time Updates**: Metrics updated within 10 seconds
- ✅ **Heatmap Correctness**: Accurate error rates, proper sorting, correct trend detection
- ✅ **Data Integrity**: All required fields present and valid
- ✅ **Performance**: Tests complete within reasonable time (< 30 seconds)

## Notes

- Tests use mocked Redis client to avoid external dependencies during unit testing
- Database tests require actual PostgreSQL connection for integration testing
- Tests are designed to be idempotent and can be run multiple times
- All test data is automatically cleaned up to prevent pollution
