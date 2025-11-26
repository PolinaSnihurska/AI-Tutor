#!/bin/bash

# AI Service Test Runner
# This script runs the response quality tests for the AI service

set -e

echo "=================================="
echo "AI Service Response Quality Tests"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: Must be run from packages/ai-service directory"
    exit 1
fi

# Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set"
    echo "   Tests will fail without a valid API key"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for Redis
echo "Checking Redis connection..."
if ! redis-cli -u "${REDIS_URL:-redis://:redis@localhost:6379}" ping > /dev/null 2>&1; then
    echo "⚠️  Warning: Cannot connect to Redis"
    echo "   Cache tests may fail"
    echo "   Start Redis with: docker-compose up -d redis"
    echo ""
fi

# Install dependencies if needed
echo "Checking dependencies..."
python3 -m pip install -q pytest pytest-asyncio pytest-cov 2>/dev/null || true

echo ""
echo "Running tests..."
echo ""

# Run tests with verbose output
python3 -m pytest tests/test_response_quality.py -v --tb=short "$@"

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed (exit code: $exit_code)"
fi

exit $exit_code
