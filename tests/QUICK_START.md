# Quick Start Guide - Integration and E2E Tests

## Prerequisites

1. **Node.js 20+** and **npm 9+** installed
2. **Python 3.11+** installed (for AI service)
3. **Docker and Docker Compose** installed (for databases)

## Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install test dependencies
cd tests
npm install
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL, MongoDB, and Redis
docker-compose up -d postgres mongodb redis
```

### 3. Run Database Migrations

```bash
# Auth service migrations
cd packages/auth-service
npm run migrate

# Analytics service migrations
cd ../analytics-service
npm run migrate

# Learning plan service migrations
cd ../learning-plan-service
npm run migrate
```

## Running Integration Tests

### Start All Backend Services

```bash
# Terminal 1: Auth Service
cd packages/auth-service
npm run dev

# Terminal 2: Test Service
cd packages/test-service
npm run dev

# Terminal 3: Learning Plan Service
cd packages/learning-plan-service
npm run dev

# Terminal 4: Analytics Service
cd packages/analytics-service
npm run dev

# Terminal 5: AI Service
cd packages/ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Run Integration Tests

```bash
# In a new terminal
cd tests
npm run test:integration
```

## Running E2E Tests

### Start All Services (Backend + Frontend)

```bash
# Start backend services (see above)

# Terminal 6: Frontend
cd packages/frontend
npm run dev
```

### Install Playwright Browsers (First Time Only)

```bash
cd tests
npm run playwright:install
```

### Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile
```

## Quick Commands

```bash
# Run all tests
cd tests && npm run test:all

# Run integration tests only
cd tests && npm run test:integration

# Run E2E tests only
cd tests && npm run test:e2e

# Debug E2E tests
cd tests && npm run test:e2e:debug

# View E2E test report
cd tests && npx playwright show-report
```

## Environment Variables

Create a `.env` file in the `tests` directory:

```env
# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
TEST_SERVICE_URL=http://localhost:3003
LEARNING_PLAN_SERVICE_URL=http://localhost:3004
ANALYTICS_SERVICE_URL=http://localhost:3005
AI_SERVICE_URL=http://localhost:8000

# Frontend URL
BASE_URL=http://localhost:3000

# Database URLs
DATABASE_URL=postgresql://user:password@localhost:5432/ai_tutor_dev
MONGODB_URI=mongodb://user:password@localhost:27017/ai_tutor_dev
REDIS_URL=redis://localhost:6379

# API Keys
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Using Docker Compose (Recommended)

### Start Everything with Docker

```bash
# Start all services
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
sleep 30

# Run integration tests
cd tests && npm run test:integration

# Run E2E tests
cd tests && npm run test:e2e
```

### Stop Everything

```bash
docker-compose down
```

## Troubleshooting

### Services Not Starting

```bash
# Check service health
curl http://localhost:3001/health  # Auth service
curl http://localhost:3003/health  # Test service
curl http://localhost:8000/health  # AI service

# Check Docker containers
docker-compose ps
docker-compose logs [service-name]
```

### Database Connection Errors

```bash
# Reset databases
docker-compose down -v
docker-compose up -d postgres mongodb redis

# Re-run migrations
cd packages/auth-service && npm run migrate
cd packages/analytics-service && npm run migrate
cd packages/learning-plan-service && npm run migrate
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001  # Replace with your port

# Kill process
kill -9 <PID>
```

### Playwright Browser Issues

```bash
# Reinstall browsers
cd tests
npx playwright install --with-deps
```

### Tests Timing Out

- Increase timeout in test configuration
- Check if all services are running
- Verify network connectivity
- Check service logs for errors

## Test Output

### Integration Tests
- Console output with test results
- Coverage report in `tests/coverage/integration/`
- JUnit XML in `tests/test-results/`

### E2E Tests
- Console output with test results
- HTML report in `tests/playwright-report/`
- Screenshots in `tests/test-results/` (on failure)
- Videos in `tests/test-results/` (on failure)

## Next Steps

1. Review test results and coverage
2. Fix any failing tests
3. Add more test cases as needed
4. Integrate tests into CI/CD pipeline
5. Set up automated test runs on PR

## Support

For issues or questions:
- Check the main `tests/README.md` for detailed documentation
- Review service logs for backend issues
- Check browser console for frontend issues
- Open an issue in the project repository
