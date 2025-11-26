# AI Service Testing Guide

## Quick Start

To run the AI service response quality tests:

```bash
cd packages/ai-service

# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Ensure Redis is running
docker-compose up -d redis

# Run the tests
./run_tests.sh
```

## What Gets Tested

The test suite validates three key areas as specified in Task 5.4:

### 1. ✅ Response Times (<2s requirement)
- Simple topic explanations
- Complex topic explanations  
- Examples generation
- **Requirements**: 1.1, 7.1

### 2. ✅ Explanation Quality
- Required fields present
- Content is substantial and meaningful
- Examples are included and well-structured
- Related topics are suggested
- Content adapts to student level

### 3. ✅ Caching Mechanism
- Cached responses are significantly faster
- Cache keys are unique per request
- Cache respects student level differences

## Test Execution Options

### Run all tests
```bash
python3 -m pytest tests/test_response_quality.py -v
```

### Run specific test class
```bash
# Only response time tests
python3 -m pytest tests/test_response_quality.py::TestResponseTimes -v

# Only caching tests
python3 -m pytest tests/test_response_quality.py::TestCachingMechanism -v

# Only quality tests
python3 -m pytest tests/test_response_quality.py::TestExplanationQuality -v
```

### Run with detailed output
```bash
python3 -m pytest tests/test_response_quality.py -v -s
```

### Run with coverage report
```bash
python3 -m pytest tests/test_response_quality.py --cov=app --cov-report=html
open htmlcov/index.html
```

## Expected Test Output

When tests pass successfully, you'll see:

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

## Troubleshooting

### "401 Unauthorized" Error
**Problem**: OpenAI API key is missing or invalid

**Solution**:
```bash
export OPENAI_API_KEY="sk-your-actual-key"
```

### Redis Connection Error
**Problem**: Redis is not running

**Solution**:
```bash
# Start Redis with Docker Compose
docker-compose up -d redis

# Or start Redis locally
redis-server
```

### Import Errors
**Problem**: Dependencies not installed

**Solution**:
```bash
pip install -r requirements.txt
```

### Slow Response Times
**Problem**: Tests fail due to >2s response times

**Possible causes**:
- Network latency
- OpenAI API load
- Cold start (first request)

**Solution**: Run tests again. First run may be slower due to cold start.

## Test Files

- `tests/test_response_quality.py` - Main test suite (17 tests)
- `tests/conftest.py` - Test fixtures and configuration
- `tests/README.md` - Detailed test documentation
- `pytest.ini` - Pytest configuration
- `run_tests.sh` - Automated test runner

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Test AI Service
  run: |
    cd packages/ai-service
    pip install -r requirements.txt
    pytest tests/test_response_quality.py -v
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    REDIS_URL: redis://localhost:6379
```

## Performance Benchmarks

| Test Type | Target | Typical |
|-----------|--------|---------|
| Simple explanation | <2s | 1.2-1.5s |
| Complex explanation | <2s | 1.5-1.9s |
| Cached response | N/A | 0.02-0.05s |
| Health check | <0.5s | 0.01-0.05s |

## Notes

- Tests make real OpenAI API calls (~$0.01 per full test run)
- Response times may vary based on network and API load
- Caching tests require Redis to be running
- First test run may be slower due to cold start

## Support

For issues or questions:
1. Check `tests/README.md` for detailed documentation
2. Review `TEST_IMPLEMENTATION_SUMMARY.md` for implementation details
3. Check test output for specific error messages
