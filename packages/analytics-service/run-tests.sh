#!/bin/bash

# Analytics Service Test Runner
# This script sets up the test environment and runs the analytics accuracy tests

set -e

echo "🚀 Analytics Accuracy Test Runner"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# Start required services
echo ""
echo "📦 Starting required services..."
cd ../..
docker-compose up -d postgres redis

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
if docker exec ai-tutor-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL is ready"
else
    echo -e "${RED}❌ PostgreSQL is not ready${NC}"
    exit 1
fi

# Check Redis
if docker exec ai-tutor-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis is ready"
else
    echo -e "${RED}❌ Redis is not ready${NC}"
    exit 1
fi

# Create test database if it doesn't exist
echo ""
echo "🗄️  Setting up test database..."
docker exec ai-tutor-postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'ai_tutor_test'" | grep -q 1 || \
    docker exec ai-tutor-postgres psql -U postgres -c "CREATE DATABASE ai_tutor_test;"

echo -e "${GREEN}✓${NC} Test database ready"

# Run migrations
echo ""
echo "🔄 Running database migrations..."
cd packages/analytics-service
export POSTGRES_DB=ai_tutor_test
npm run migrate

echo -e "${GREEN}✓${NC} Migrations complete"

# Run tests
echo ""
echo "🧪 Running analytics accuracy tests..."
echo "======================================"
echo ""

npm test

# Check test result
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Test Coverage:"
    echo "  ✓ Prediction accuracy (Requirement 4.3)"
    echo "  ✓ Real-time update performance (Requirement 4.4)"
    echo "  ✓ Heatmap generation correctness (Requirement 4.2)"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check database connection"
    echo "  2. Verify migrations ran successfully"
    echo "  3. Check Redis connection"
    echo "  4. Review test output above"
    echo ""
    exit 1
fi
