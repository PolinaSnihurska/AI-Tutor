# Setup Guide

This guide will help you set up the AI Tutoring Platform development environment.

## Quick Start

```bash
# 1. Run setup script
./scripts/setup.sh

# 2. Update environment variables
# Edit .env with your API keys and configuration

# 3. Start Docker services
npm run docker:up

# 4. Start development servers
npm run dev
```

## Detailed Setup

### 1. Prerequisites

Ensure you have the following installed:

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **Docker** and **Docker Compose**
- **Python** 3.11+ (for AI service)
- **Git**

Verify installations:

```bash
node --version  # Should be v20.x.x or higher
npm --version   # Should be 9.x.x or higher
docker --version
python3 --version
```

### 2. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd ai-tutoring-platform

# Install dependencies
npm install
```

This will install dependencies for all packages in the monorepo.

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` and configure:

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `JWT_SECRET` - Random secret for JWT tokens
- `JWT_REFRESH_SECRET` - Random secret for refresh tokens

**Optional (for production):**
- `STRIPE_SECRET_KEY` - Stripe payment integration
- `SMTP_*` - Email service configuration
- `SENTRY_DSN` - Error tracking

### 4. Start Docker Services

Start PostgreSQL, MongoDB, and Redis:

```bash
npm run docker:up
```

Verify services are running:

```bash
docker-compose ps
```

All services should show "healthy" status.

### 5. Initialize Database

The PostgreSQL database will be automatically initialized with the schema from `scripts/init-db.sql` when the container starts.

To manually connect and verify:

```bash
# PostgreSQL
psql postgresql://postgres:postgres@localhost:5432/ai_tutor

# MongoDB
mongosh mongodb://mongo:mongo@localhost:27017/ai_tutor?authSource=admin

# Redis
redis-cli -a redis
```

### 6. Start Development Servers

Start all services in development mode:

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **User Service**: http://localhost:3002
- **AI Service**: http://localhost:8000
- **Test Service**: http://localhost:3003
- **Analytics Service**: http://localhost:3004

### 7. Verify Setup

Open your browser and navigate to:
- Frontend: http://localhost:5173
- API Gateway Health: http://localhost:3000/health

You should see the application running.

## Development Workflow

### Running Individual Services

```bash
# Frontend only
cd packages/frontend
npm run dev

# Auth service only
cd packages/auth-service
npm run dev

# AI service only
cd packages/ai-service
python3 -m uvicorn main:app --reload --port 8000
```

### Code Quality

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Run tests
npm run test
```

### Database Management

**View logs:**
```bash
npm run docker:logs
```

**Reset databases:**
```bash
npm run docker:down
docker volume rm ai-tutoring-platform_postgres_data
docker volume rm ai-tutoring-platform_mongodb_data
docker volume rm ai-tutoring-platform_redis_data
npm run docker:up
```

**Backup database:**
```bash
docker exec ai-tutor-postgres pg_dump -U postgres ai_tutor > backup.sql
```

**Restore database:**
```bash
cat backup.sql | docker exec -i ai-tutor-postgres psql -U postgres ai_tutor
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using port
lsof -i :5173  # or any other port

# Kill process
kill -9 <PID>
```

### Docker Services Not Starting

```bash
# Check Docker is running
docker info

# View service logs
docker-compose logs postgres
docker-compose logs mongodb
docker-compose logs redis

# Restart services
npm run docker:down
npm run docker:up
```

### Module Not Found Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules
npm install
```

### TypeScript Errors

```bash
# Rebuild shared types
cd packages/shared-types
npm run build

# Rebuild all packages
cd ../..
npm run build
```

## Environment Variables Reference

### Database Configuration

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ai_tutor
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_tutor

# MongoDB
MONGO_USER=mongo
MONGO_PASSWORD=mongo
MONGO_DB=ai_tutor
MONGO_HOST=localhost
MONGO_PORT=27017
MONGODB_URI=mongodb://mongo:mongo@localhost:27017/ai_tutor?authSource=admin

# Redis
REDIS_PASSWORD=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://:redis@localhost:6379
```

### Service Ports

```env
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
AI_SERVICE_PORT=8000
TEST_SERVICE_PORT=3003
ANALYTICS_SERVICE_PORT=3004
API_GATEWAY_PORT=3000
```

### Security

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### External Services

```env
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
EMAIL_FROM=noreply@ai-tutor.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## Next Steps

After setup is complete:

1. Review the [README.md](./README.md) for project overview
2. Check the [design document](./.kiro/specs/ai-tutoring-platform/design.md) for architecture details
3. Review the [requirements](./.kiro/specs/ai-tutoring-platform/requirements.md)
4. Start implementing tasks from [tasks.md](./.kiro/specs/ai-tutoring-platform/tasks.md)

## Getting Help

- Check existing documentation in `.kiro/specs/`
- Review service logs: `npm run docker:logs`
- Check service health endpoints: `http://localhost:<port>/health`
