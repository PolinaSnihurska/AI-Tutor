# Test Service Integration Tests

This directory contains comprehensive integration tests for the test service that verify:

## Test Coverage

### 1. Complete Test Lifecycle (Requirements 3.1, 3.2, 3.3)
- **Test Creation**: Generates tests using AI service
- **Test Taking**: Retrieves tests without answers for students
- **Test Submission**: Submits answers and calculates scores
- **Test Evaluation**: Provides detailed results with explanations

### 2. Adaptive Questioning (Requirement 3.4)
- **Adaptive Test Generation**: Creates tests that adapt to student level
- **Next Question Selection**: Selects appropriate difficulty questions
- **Performance-Based Adjustment**: Adjusts difficulty based on student performance

### 3. Weak Topic Identification (Requirements 3.3, 3.4)
- **Topic Analysis**: Identifies topics where students struggle
- **Accuracy Verification**: Ensures weak topics are correctly identified
- **Topic-Specific Recommendations**: Provides targeted study suggestions

### 4. Test History and Results
- **History Retrieval**: Gets past tests for students
- **Results Tracking**: Retrieves all test results with filtering

### 5. Error Handling
- **Invalid Input Handling**: Validates request data
- **Missing Fields**: Returns appropriate error messages
- **Not Found Errors**: Handles non-existent resources

## Prerequisites

Before running the tests, ensure the following services are running:

1. **MongoDB**: Required for storing tests and results
   ```bash
   docker-compose up mongodb
   ```

2. **AI Service**: Required for test generation (or tests will use mocks)
   ```bash
   cd packages/ai-service
   python -m uvicorn app.main:app --reload --port 8000
   ```

## Running the Tests

### Run all tests
```bash
npm test
```

### Run with coverage
```bash
npm test -- --coverage
```

### Run specific test suite
```bash
npm test -- --testNamePattern="Complete Test Lifecycle"
```

### Run in watch mode
```bash
npm test -- --watch
```

## Test Environment

The tests use a separate test database (`ai_tutor_test`) to avoid affecting development data. The test setup:

- Connects to MongoDB before all tests
- Cleans up test data after each test
- Disconnects from MongoDB after all tests
- Mocks AI service calls to avoid external dependencies

## Test Structure

Each test follows this pattern:

1. **Arrange**: Set up test data and conditions
2. **Act**: Execute the functionality being tested
3. **Assert**: Verify the results match expectations

## Mocking Strategy

The tests mock the AI service to:
- Ensure tests run without external dependencies
- Provide consistent, predictable test data
- Speed up test execution
- Allow testing error scenarios

## Key Test Scenarios

### Complete Test Lifecycle
```typescript
// 1. Generate test
POST /tests/generate
// 2. Get test (without answers)
GET /tests/:testId
// 3. Submit answers
POST /tests/submit
// 4. Get results
GET /tests/result/:resultId
```

### Adaptive Questioning
```typescript
// Generate adaptive test based on student profile
POST /tests/adaptive/generate
// Get next adaptive question
POST /tests/adaptive/next-question
```

### Weak Topic Identification
```typescript
// Submit test with mixed performance
POST /tests/submit
// Verify weak topics are identified
expect(result.weakTopics).toContain('Chemistry')
```

## Troubleshooting

### MongoDB Connection Error
If you see "Failed to connect to MongoDB", ensure MongoDB is running:
```bash
docker-compose up mongodb
```

### Timeout Errors
If tests timeout, increase the timeout in `setup.ts`:
```typescript
jest.setTimeout(60000); // 60 seconds
```

### AI Service Errors
The tests use mocks by default, but if you want to test with the real AI service:
1. Start the AI service
2. Remove or modify the axios mocks in the test file

## Future Improvements

- Add performance benchmarks for test generation
- Add tests for concurrent test submissions
- Add tests for test result analytics
- Add tests for test versioning and updates
