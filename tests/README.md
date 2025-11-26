# AI Tutoring Platform - Integration and E2E Tests

This directory contains comprehensive integration and end-to-end tests for the AI Tutoring Platform.

## Test Structure

```
tests/
├── integration/           # Integration tests for critical flows
│   ├── user-onboarding.integration.test.ts
│   ├── learning-plan-flow.integration.test.ts
│   ├── test-taking-flow.integration.test.ts
│   ├── subscription-payment-flow.integration.test.ts
│   └── setup.ts
├── e2e/                  # End-to-end tests with Playwright
│   ├── specs/
│   │   ├── student-journey.spec.ts
│   │   └── parent-journey.spec.ts
│   └── playwright.config.ts
├── load/                 # Load and performance tests with k6
│   ├── scenarios/
│   │   ├── full-load.js
│   │   ├── ai-service.js
│   │   ├── database-stress.js
│   │   └── cache-effectiveness.js
│   ├── setup-test-users.js
│   ├── run-all-tests.sh
│   ├── README.md
│   └── QUICK_START.md
├── package.json
├── jest.integration.config.js
└── README.md
```

## Integration Tests

Integration tests validate the interaction between multiple services and components.

### Test Coverage

1. **User Registration and Onboarding** (`user-onboarding.integration.test.ts`)
   - Complete student registration flow
   - Parent registration and child linking
   - Subscription setup during onboarding
   - Profile configuration
   - Requirements: 9.1, 9.2, 11.1, 11.2, 11.3

2. **Learning Plan Generation and Task Completion** (`learning-plan-flow.integration.test.ts`)
   - AI-powered learning plan generation (<5s)
   - Daily task management
   - Weekly goal tracking
   - Reminder system
   - Plan adaptation based on progress
   - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

3. **Test-Taking and Result Generation** (`test-taking-flow.integration.test.ts`)
   - Test generation (<1s)
   - Test-taking process
   - Answer submission and evaluation
   - Detailed feedback and explanations
   - Weak topic identification
   - Adaptive questioning
   - Analytics integration
   - Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3

4. **Subscription Upgrade and Payment** (`subscription-payment-flow.integration.test.ts`)
   - Subscription tier management
   - Payment processing with Stripe
   - Feature access control
   - Subscription lifecycle (upgrade, downgrade, cancel)
   - Rate limiting based on tier
   - Requirements: 11.1, 11.2, 11.3, 11.4, 11.5

### Running Integration Tests

```bash
# Install dependencies
cd tests
npm install

# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- user-onboarding.integration.test.ts

# Run with coverage
npm run test:integration -- --coverage
```

### Prerequisites

Before running integration tests, ensure all services are running:

```bash
# Start all services with Docker Compose
docker-compose up -d

# Or start services individually
cd packages/auth-service && npm run dev
cd packages/test-service && npm run dev
cd packages/learning-plan-service && npm run dev
cd packages/analytics-service && npm run dev
cd packages/ai-service && python -m uvicorn app.main:app --reload
```

### Environment Variables

Set these environment variables before running tests:

```bash
export AUTH_SERVICE_URL=http://localhost:3001
export TEST_SERVICE_URL=http://localhost:3003
export LEARNING_PLAN_SERVICE_URL=http://localhost:3004
export ANALYTICS_SERVICE_URL=http://localhost:3005
export AI_SERVICE_URL=http://localhost:8000
```

## E2E Tests

End-to-end tests validate the complete user experience through the browser.

### Test Coverage

1. **Student User Journey** (`student-journey.spec.ts`)
   - Registration and onboarding
   - AI chat interaction
   - Test generation and taking
   - Learning plan management
   - Analytics viewing
   - Student cabinet access
   - Subscription upgrade
   - Mobile responsiveness
   - Error handling
   - Requirements: 8.1, 8.2, 8.3, 1.1, 2.1, 3.1, 4.1

2. **Parent User Journey** (`parent-journey.spec.ts`)
   - Parent registration
   - Child account linking
   - Parent dashboard
   - Child analytics viewing
   - Study time reports
   - Weak topics and recommendations
   - Parental controls configuration
   - Activity log monitoring
   - Notifications
   - Goal comparison
   - Family plan upgrade
   - Multiple children management
   - Requirements: 8.1, 8.2, 8.3, 5.1, 5.2, 5.3, 5.4, 5.5

### Running E2E Tests

```bash
# Install Playwright browsers
npm run playwright:install

# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# Run specific test file
npx playwright test student-journey.spec.ts
```

### Cross-Browser Testing

E2E tests run on multiple browsers to ensure compatibility:

- **Desktop**: Chrome, Firefox, Safari (WebKit)
- **Mobile**: Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)

### Prerequisites

1. Frontend application must be running:
```bash
cd packages/frontend
npm run dev
```

2. All backend services must be running (see Integration Tests prerequisites)

### Test Reports

After running E2E tests, view the HTML report:

```bash
npx playwright show-report
```

## Load and Performance Tests

Comprehensive load tests using k6 to validate system performance under stress.

### Test Coverage

1. **Full Load Test** (`load/scenarios/full-load.js`)
   - Simulates 1000 concurrent users
   - Tests all services under realistic load
   - Validates response times and error rates
   - Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

2. **AI Service Load Test** (`load/scenarios/ai-service.js`)
   - Focused testing of AI service
   - 500 concurrent users
   - Cache effectiveness validation
   - Requirements: 7.1

3. **Database Stress Test** (`load/scenarios/database-stress.js`)
   - 800 concurrent database operations
   - Read/write performance testing
   - Complex query validation
   - Requirements: 7.2, 7.3

4. **Cache Effectiveness Test** (`load/scenarios/cache-effectiveness.js`)
   - Cache hit rate validation (>70%)
   - Response time comparison
   - Cache warming and load testing
   - Requirements: 7.1, 7.2

### Running Load Tests

```bash
cd tests/load

# Install k6
brew install k6  # macOS

# Setup test users
node setup-test-users.js

# Run all tests (light mode, ~10 minutes)
./run-all-tests.sh light

# Run all tests (full mode, ~25 minutes)
./run-all-tests.sh full

# Run individual tests
npm run test:load:light    # Quick load test
npm run test:ai            # AI service test
npm run test:database      # Database stress test
npm run test:cache         # Cache effectiveness test
```

### Quick Start

See [load/QUICK_START.md](load/QUICK_START.md) for a 5-minute getting started guide.

### Documentation

- [Load Test README](load/README.md) - Comprehensive documentation
- [Load Test Summary](load/LOAD_TEST_SUMMARY.md) - Implementation details
- [Quick Start Guide](load/QUICK_START.md) - Get started in 5 minutes

## Performance Requirements

The tests validate these performance requirements:

- **AI Response Time**: <2 seconds (Requirement 7.1)
- **Test Generation**: <1 second (Requirement 7.2)
- **Learning Plan Generation**: <5 seconds (Requirement 2.1)
- **Analytics Update**: <10 seconds (Requirement 4.4)
- **Page Load**: <3 seconds (Requirement 10.5)
- **Concurrent Users**: 1000+ (Requirement 7.4)
- **Error Rate**: <1% (Requirement 7.4)
- **Cache Hit Rate**: >70% (Requirements 7.1, 7.2)

## CI/CD Integration

These tests are integrated into the CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: |
    cd tests
    npm install
    npm run test:integration

- name: Run E2E Tests
  run: |
    cd tests
    npm run playwright:install
    npm run test:e2e
```

## Troubleshooting

### Integration Tests

**Services not responding:**
```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3003/health
curl http://localhost:8000/health

# Check Docker containers
docker-compose ps
docker-compose logs [service-name]
```

**Database connection errors:**
```bash
# Reset test databases
docker-compose down -v
docker-compose up -d
```

### E2E Tests

**Browser not launching:**
```bash
# Reinstall browsers
npx playwright install --with-deps
```

**Tests timing out:**
- Increase timeout in `playwright.config.ts`
- Check if services are running
- Verify network connectivity

**Screenshots and videos:**
- Failed test screenshots: `test-results/`
- Test videos: `test-results/` (only on failure)

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Realistic Data**: Use realistic test data that mimics production scenarios
4. **Error Handling**: Test both success and failure scenarios
5. **Performance**: Monitor test execution time and optimize slow tests
6. **Flakiness**: Avoid flaky tests by using proper waits and assertions

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate comments and documentation
3. Ensure tests are deterministic and not flaky
4. Update this README with new test coverage
5. Verify tests pass locally before committing

## Support

For issues or questions about tests:
- Check test logs and error messages
- Review service logs for backend issues
- Consult the main project documentation
- Open an issue in the project repository
