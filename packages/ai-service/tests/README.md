# AI Service Test Suite

This test suite validates the AI service response quality according to requirements 1.1 and 7.1.

## Test Coverage

### 1. Response Time Tests (`TestResponseTimes`)
- ✅ Simple topic explanation response time (<2s requirement)
- ✅ Complex topic explanation response time (<2s requirement)
- ✅ Examples endpoint response time (<2s requirement)

### 2. Explanation Quality Tests (`TestExplanationQuality`)
- ✅ Explanation contains all required fields
- ✅ Explanation content is not empty and substantial
- ✅ Explanation includes practical examples
- ✅ Explanation includes related topics
- ✅ Explanation adapts to different student levels
- ✅ Examples endpoint generates quality examples

### 3. Caching Mechanism Tests (`TestCachingMechanism`)
- ✅ Cached responses are significantly faster than initial requests
- ✅ Cache keys are unique for different requests
- ✅ Cache respects student level differences

### 4. Health and Status Tests (`TestHealthAndStatus`)
- ✅ Health endpoint responds quickly
- ✅ Root endpoint returns service information

### 5. Error Handling Tests (`TestErrorHandling`)
- ✅ Invalid student level is rejected
- ✅ Missing required fields are rejected
- ✅ Empty topic is rejected

## Prerequisites

Before running the tests, ensure you have:

1. **Python 3.11+** installed
2. **Required dependencies** installed:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment variables** configured:
   - `OPENAI_API_KEY`: Valid OpenAI API key
   - `REDIS_URL`: Redis connection URL (default: redis://:redis@localhost:6379)

4. **Redis server** running:
   ```bash
   docker-compose up -d redis
   ```

## Running the Tests

### Run all tests:
```bash
cd packages/ai-service
python3 -m pytest tests/test_response_quality.py -v
```

### Run specific test class:
```bash
python3 -m pytest tests/test_response_quality.py::TestResponseTimes -v
```

### Run with coverage:
```bash
python3 -m pytest tests/test_response_quality.py --cov=app --cov-report=html
```

### Run only fast tests (skip slow API calls):
```bash
python3 -m pytest tests/test_response_quality.py -m "not slow" -v
```

## Expected Results

When all tests pass, you should see output similar to:

```
tests/test_response_quality.py::TestResponseTimes::test_explanation_response_time_simple_topic PASSED
✓ Simple topic response time: 1.23s

tests/test_response_quality.py::TestResponseTimes::test_explanation_response_time_complex_topic PASSED
✓ Complex topic response time: 1.87s

tests/test_response_quality.py::TestCachingMechanism::test_cached_response_faster_than_first PASSED
✓ First request: 1.456s
✓ Cached request: 0.023s
✓ Speed improvement: 63.3x faster

========================= 17 passed in 15.23s =========================
```

## Test Requirements Validation

### Requirement 1.1: AI Response Time
- **Requirement**: AI Tutor SHALL provide a response within 2 seconds
- **Validation**: Tests measure actual response times and assert < 2.0 seconds
- **Tests**: `TestResponseTimes` class

### Requirement 7.1: System Performance
- **Requirement**: AI Tutor SHALL respond to queries within 2 seconds under normal load
- **Validation**: Tests verify response times meet performance requirements
- **Tests**: `TestResponseTimes` class

### Caching Mechanism
- **Validation**: Tests verify cached responses are significantly faster
- **Tests**: `TestCachingMechanism` class

## Troubleshooting

### OpenAI API Key Error
If you see `401 Unauthorized` errors:
```bash
export OPENAI_API_KEY="your-actual-api-key"
```

### Redis Connection Error
If you see Redis connection errors:
```bash
# Start Redis with Docker
docker-compose up -d redis

# Or set custom Redis URL
export REDIS_URL="redis://localhost:6379"
```

### Import Errors
If you see module import errors:
```bash
# Install dependencies
pip install -r requirements.txt

# Ensure you're in the correct directory
cd packages/ai-service
```

## Notes

- Tests make real API calls to OpenAI, which may incur costs
- Response times may vary based on network conditions and OpenAI API load
- Cached response tests require Redis to be running
- Some tests may take longer on first run due to cold start
