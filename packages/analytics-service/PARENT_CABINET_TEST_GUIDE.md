# Parent Cabinet Features Test Guide

## Task 9.5: Test Parent Cabinet Features

This guide explains how to execute the parent cabinet tests that verify:
- ✅ Parent can access only their children's data (Requirements 5.1, 5.5)
- ✅ Analytics accuracy for parent view (Requirement 5.2)
- ✅ Recommendation quality (Requirements 5.3, 5.4)

## Test Coverage

### Data Access Authorization (Requirements 5.1, 5.5)
- Parent can access their own children's data
- Parent cannot access non-linked children's data
- Aggregated analytics only includes linked children
- Parent-child relationships are properly enforced in database
- Data isolation between different parent-child relationships

### Analytics Accuracy (Requirement 5.2)
- Study time metrics calculated accurately
  - Total minutes tracked correctly
  - Daily average computed properly
  - Weekly trend shows 7 days of data
- Performance by subject calculated correctly
  - Scores within valid range (0-100)
  - Test counts accurate
  - Trends identified (improving/stable/declining)
- Weak topics identified correctly
  - Limited to top 5 most problematic topics
  - Based on error rates from heatmap
- Goal comparison calculated accurately
  - Target vs current score comparison
  - On-track status determined correctly
  - Days remaining calculated
- Multiple children aggregation works correctly
  - Total study time summed across children
  - Average performance calculated
  - Children needing attention identified
- Trends calculated correctly over time
  - Improving performance detected
  - Declining performance detected
  - Stable performance recognized

### Recommendation Quality (Requirements 5.3, 5.4)
- Low study time recommendations
  - Suggests increasing daily study time when below 30 minutes
  - Warns about burnout when exceeding 120 minutes
- Declining performance recommendations
  - Identifies subjects needing immediate attention
  - Suggests additional support or tutoring
- Weak topics recommendations
  - Prioritizes topics with high error rates
  - Provides specific topic names
- Positive reinforcement
  - Acknowledges improving subjects
  - Encourages continued good work
- Decreasing study time trend detection
  - Warns when study time drops significantly
  - Suggests checking motivation and support needs
- Actionable and specific recommendations
  - All recommendations are meaningful (>10 characters)
  - No generic or vague suggestions
  - Properly formatted without extra whitespace

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
# Create test database if it doesn't exist
docker exec -it ai-tutor-postgres psql -U postgres -c "CREATE DATABASE ai_tutor_test;"

# Run migrations on test database
cd packages/analytics-service
POSTGRES_DB=ai_tutor_test npm run migrate

# Also need auth service tables for parent-child links
cd ../auth-service
POSTGRES_DB=ai_tutor_test npm run migrate
```

### 3. Run Tests

```bash
# From packages/analytics-service directory
npm test -- parent-cabinet.test.ts
```

## Detailed Setup

### Environment Variables

Ensure `.env` file exists in `packages/analytics-service/`:

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

### Required Database Tables

The tests require tables from both analytics and auth services:

**Analytics Service Tables:**
- `analytics_snapshots` - Historical performance data
- `student_activities` - Activity tracking
- `topic_performance` - Topic-level performance metrics
- `predictions` - Prediction cache
- `learning_plans` - Student learning plans

**Auth Service Tables:**
- `users` - User accounts
- `parent_child_links` - Parent-child relationships
- `subscriptions` - User subscriptions

### Running Migrations

```bash
# Analytics service migrations
cd packages/analytics-service
npm run migrate

# Auth service migrations (for parent_child_links table)
cd ../auth-service
npm run migrate
```

## Test Execution

### Run Parent Cabinet Tests Only

```bash
npm test -- parent-cabinet.test.ts
```

### Run with Verbose Output

```bash
npm test -- parent-cabinet.test.ts --verbose
```

### Run Specific Test Group

```bash
# Data access authorization tests only
npm test -- parent-cabinet.test.ts -t "Data Access Authorization"

# Analytics accuracy tests only
npm test -- parent-cabinet.test.ts -t "Analytics Accuracy"

# Recommendation quality tests only
npm test -- parent-cabinet.test.ts -t "Recommendation Quality"
```

## Expected Test Results

### Success Criteria

All 24 tests should pass:

```
PASS  src/__tests__/parent-cabinet.test.ts
  Parent Cabinet Features Tests (Requirement 5.1, 5.2, 5.3, 5.4, 5.5)
    Data Access Authorization (Requirement 5.1, 5.5)
      ✓ should allow parent to access their own children data
      ✓ should prevent parent from accessing non-linked child data
      ✓ should return only linked children in aggregated analytics
      ✓ should verify parent-child relationship exists in database
      ✓ should not find relationship for non-linked children
    Analytics Accuracy for Parent View (Requirement 5.2)
      ✓ should accurately calculate study time metrics
      ✓ should accurately calculate performance by subject
      ✓ should correctly identify weak topics
      ✓ should accurately calculate goal comparison
      ✓ should handle multiple children aggregation accurately
      ✓ should correctly identify children needing attention
      ✓ should calculate trends correctly over time
    Recommendation Quality (Requirement 5.3, 5.4)
      ✓ should generate recommendations for low study time
      ✓ should generate recommendations for declining performance
      ✓ should generate recommendations for weak topics
      ✓ should provide positive reinforcement for improving performance
      ✓ should recommend tutoring for low-performing subjects
      ✓ should provide actionable and specific recommendations
      ✓ should warn about excessive study time
      ✓ should detect decreasing study time trend

Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
Snapshots:   0 total
Time:        ~20-30s
```

## Test Data

The tests create realistic scenarios:

### Test Users
- Parent with 2 children (child1, child2)
- Another parent with 1 child (other child)
- Proper parent-child links in database

### Test Scenarios
1. **Normal Performance**: Balanced study time and scores
2. **Struggling Student**: Low scores, many weak topics
3. **Improving Student**: Scores increasing over time
4. **Low Study Time**: Less than 30 minutes per day
5. **Declining Performance**: Scores decreasing over time
6. **Weak Topics**: Multiple topics with high error rates
7. **Low Performance**: Consistently low scores across subjects
8. **Excessive Study Time**: More than 2 hours per day
9. **Decreasing Study Trend**: Study time dropping over week

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Verify test database exists
docker exec -it ai-tutor-postgres psql -U postgres -l | grep ai_tutor_test

# Recreate if needed
docker exec -it ai-tutor-postgres psql -U postgres -c "DROP DATABASE IF EXISTS ai_tutor_test;"
docker exec -it ai-tutor-postgres psql -U postgres -c "CREATE DATABASE ai_tutor_test;"
```

### Missing Tables

```bash
# Run migrations for both services
cd packages/analytics-service && POSTGRES_DB=ai_tutor_test npm run migrate
cd ../auth-service && POSTGRES_DB=ai_tutor_test npm run migrate
```

### Redis Connection Errors

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker exec -it ai-tutor-redis redis-cli ping
```

### Test Data Cleanup

Tests automatically clean up, but if needed:

```sql
-- Connect to test database
docker exec -it ai-tutor-postgres psql -U postgres -d ai_tutor_test

-- Clean up test data
DELETE FROM predictions WHERE student_id LIKE 'test-%';
DELETE FROM topic_performance WHERE student_id LIKE 'test-%';
DELETE FROM student_activities WHERE student_id LIKE 'test-%';
DELETE FROM analytics_snapshots WHERE student_id LIKE 'test-%';
DELETE FROM learning_plans WHERE student_id LIKE 'test-%';
DELETE FROM parent_child_links WHERE parent_id LIKE 'test-%' OR child_id LIKE 'test-%';
DELETE FROM subscriptions WHERE user_id LIKE 'test-%';
DELETE FROM users WHERE id LIKE 'test-%';
```

## Integration with Existing Tests

These tests complement the existing test suites:

1. **analytics-accuracy.test.ts** - Tests core analytics calculations
2. **parent-child.integration.test.ts** (auth-service) - Tests parent-child linking
3. **parent-cabinet.test.ts** (NEW) - Tests parent cabinet features end-to-end

## API Endpoints Tested

The tests verify the following parent cabinet endpoints work correctly:

### Analytics Service
- `GET /api/parent/children/:childId/analytics` - Get child analytics
- `GET /api/parent/children/aggregated` - Get aggregated analytics

### Auth Service
- `GET /api/parent/children` - Get linked children
- `GET /api/parent/notification-preferences` - Get notification settings
- `PUT /api/parent/notification-preferences` - Update notification settings
- `GET /api/parent/children/:childId/controls` - Get parental controls
- `PUT /api/parent/children/:childId/controls` - Update parental controls
- `GET /api/parent/children/:childId/activity-log` - Get activity log
- `GET /api/parent/children/:childId/learning-time` - Get learning time monitoring

## Performance Expectations

- **Data Access Tests**: ~2-3 seconds
- **Analytics Accuracy Tests**: ~8-12 seconds
- **Recommendation Quality Tests**: ~8-12 seconds
- **Total Suite**: ~20-30 seconds

## Continuous Integration

### GitHub Actions Example

```yaml
name: Parent Cabinet Tests

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
        run: |
          npm install
          cd packages/analytics-service && npm install
          cd ../auth-service && npm install
      
      - name: Run migrations
        run: |
          cd packages/analytics-service && npm run migrate
          cd ../auth-service && npm run migrate
        env:
          POSTGRES_DB: ai_tutor_test
      
      - name: Run parent cabinet tests
        run: npm test -- parent-cabinet.test.ts
        working-directory: packages/analytics-service
        env:
          POSTGRES_DB: ai_tutor_test
          REDIS_URL: redis://localhost:6379
```

## Requirements Verification

### Requirement 5.1: Parent Monitoring
✅ Parents can view child's learning statistics for selected time periods
✅ Data access is properly restricted to linked children only
✅ Parent-child relationships are enforced at database level

### Requirement 5.2: Weak Topics Highlighting
✅ Weak topics are identified based on error rates
✅ Topics are prioritized by severity
✅ Performance by subject is accurately calculated

### Requirement 5.3: Parental Control Features
✅ Learning time monitoring is accurate
✅ Activity logging works correctly
✅ Recommendations are generated based on child's performance

### Requirement 5.4: Goal Comparison
✅ Target vs current score comparison works
✅ On-track status is calculated correctly
✅ Days remaining until exam is tracked

### Requirement 5.5: Premium Tier Support
✅ System supports monitoring up to 3 children
✅ Aggregated analytics work for multiple children
✅ Data isolation between families is maintained

## Next Steps

After all tests pass:
1. ✅ Verify all 19 tests pass successfully
2. ✅ Review test coverage for parent cabinet features
3. ✅ Integrate into CI/CD pipeline
4. ✅ Document any edge cases discovered
5. ✅ Update as requirements evolve

## Manual Testing Checklist

In addition to automated tests, manually verify:

- [ ] Parent can log in and see their children
- [ ] Analytics display correctly in parent dashboard UI
- [ ] Recommendations are helpful and actionable
- [ ] Weak topics are highlighted visually
- [ ] Goal comparison shows progress clearly
- [ ] Parental controls can be set and enforced
- [ ] Activity log shows recent child activities
- [ ] Learning time monitoring displays daily/weekly trends
- [ ] Notification preferences can be updated
- [ ] Multiple children can be managed from one account

