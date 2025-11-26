# AI Tutoring Platform

An intelligent educational ecosystem that combines personalized learning, automatic content generation, adaptive explanations, and detailed analytics.

## Project Structure

```
ai-tutoring-platform/
├── packages/
│   ├── shared-types/       # Shared TypeScript types and interfaces
│   ├── auth-service/       # Authentication and authorization service
│   ├── user-service/       # User profile and subscription management
│   ├── ai-service/         # AI-powered explanations and content generation (Python)
│   └── frontend/           # React web application
├── scripts/                # Database initialization and utility scripts
├── docker-compose.yml      # Local development environment
└── turbo.json             # Monorepo build configuration
```

## Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- Docker and Docker Compose
- Python 3.11+ (for AI service)

## Getting Started

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Development Services

Start Docker containers (PostgreSQL, MongoDB, Redis):

```bash
npm run docker:up
```

### 4. Run Development Servers

```bash
npm run dev
```

This will start all services in development mode:
- Frontend: http://localhost:5173
- Auth Service: http://localhost:3001
- User Service: http://localhost:3002
- AI Service: http://localhost:8000

### 5. Stop Docker Services

```bash
npm run docker:down
```

## Development

### Available Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all packages
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

### Working with Individual Packages

Navigate to a specific package and run commands:

```bash
cd packages/frontend
npm run dev
```

### Database Access

**PostgreSQL:**
```bash
psql postgresql://postgres:postgres@localhost:5432/ai_tutor
```

**MongoDB:**
```bash
mongosh mongodb://mongo:mongo@localhost:27017/ai_tutor?authSource=admin
```

**Redis:**
```bash
redis-cli -a redis
```

## Architecture

The platform follows a microservices architecture:

- **Frontend**: React 18 with TypeScript, Redux Toolkit, TanStack Query
- **Backend Services**: Node.js with Express, TypeScript
- **AI Service**: Python FastAPI with OpenAI integration
- **Databases**: PostgreSQL (relational), MongoDB (documents), Redis (cache)

## Environment Configuration

The platform supports multiple deployment stages:
- `development` - Local development with hot reload
- `staging` - Pre-production testing environment
- `production` - Production deployment

Configure environment-specific variables in `.env` files.

## Testing

Run tests for all packages:

```bash
npm run test
```

Run tests for a specific package:

```bash
cd packages/auth-service
npm run test
```

## Code Quality

The project uses:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Turbo** for monorepo management

Format code before committing:

```bash
npm run format
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - All rights reserved
