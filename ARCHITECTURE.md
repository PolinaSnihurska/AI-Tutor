# Architecture Overview

## Project Structure

```
ai-tutoring-platform/
├── .kiro/                          # Kiro specs and configuration
│   └── specs/
│       └── ai-tutoring-platform/
│           ├── requirements.md     # Feature requirements
│           ├── design.md          # System design
│           └── tasks.md           # Implementation tasks
│
├── packages/                       # Monorepo packages
│   ├── shared-types/              # Shared TypeScript types
│   │   └── src/
│   │       ├── user.ts
│   │       ├── auth.ts
│   │       ├── subscription.ts
│   │       ├── test.ts
│   │       ├── analytics.ts
│   │       ├── learning.ts
│   │       ├── common.ts
│   │       ├── config.ts
│   │       └── index.ts
│   │
│   ├── api-gateway/               # API Gateway (port 3000)
│   │   └── src/
│   │       └── index.ts           # Proxy configuration
│   │
│   ├── auth-service/              # Authentication service (port 3001)
│   │   └── src/
│   │       └── index.ts
│   │
│   ├── user-service/              # User management (port 3002)
│   │   └── src/
│   │       └── index.ts
│   │
│   ├── test-service/              # Test management (port 3003)
│   │   └── src/
│   │       └── index.ts
│   │
│   ├── analytics-service/         # Analytics (port 3004)
│   │   └── src/
│   │       └── index.ts
│   │
│   ├── ai-service/                # AI service (port 8000)
│   │   ├── main.py
│   │   └── requirements.txt
│   │
│   └── frontend/                  # React frontend (port 5173)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   └── index.css
│       ├── index.html
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── scripts/                       # Utility scripts
│   ├── setup.sh                  # Initial setup
│   ├── dev.sh                    # Start dev environment
│   ├── validate-setup.sh         # Validate configuration
│   └── init-db.sql              # Database initialization
│
├── docker-compose.yml            # Docker services configuration
├── .env.example                  # Environment variables template
├── package.json                  # Root package configuration
├── turbo.json                    # Monorepo build configuration
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.js                  # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── README.md                     # Project overview
├── SETUP.md                      # Setup instructions
└── ARCHITECTURE.md               # This file
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Server State**: TanStack Query
- **Routing**: React Router v6
- **HTTP Client**: Axios

### Backend Services
- **Runtime**: Node.js 20+
- **Framework**: Express
- **Language**: TypeScript
- **API Gateway**: http-proxy-middleware
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Security**: Helmet, CORS

### AI Service
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **AI Integration**: OpenAI API
- **Prompt Management**: LangChain
- **Server**: Uvicorn

### Databases
- **PostgreSQL 16**: Relational data (users, subscriptions, analytics)
- **MongoDB 7**: Document storage (tests, conversations, content)
- **Redis 7**: Caching and session management

### Development Tools
- **Monorepo**: Turborepo
- **Package Manager**: npm workspaces
- **Code Quality**: ESLint, Prettier
- **Containerization**: Docker, Docker Compose

## Service Architecture

### API Gateway (Port 3000)
- Entry point for all client requests
- Routes requests to appropriate microservices
- Handles CORS and security headers
- Rate limiting and request validation

**Routes:**
- `/api/auth/*` → Auth Service (3001)
- `/api/users/*` → User Service (3002)
- `/api/ai/*` → AI Service (8000)
- `/api/tests/*` → Test Service (3003)
- `/api/analytics/*` → Analytics Service (3004)

### Auth Service (Port 3001)
**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Password reset and email verification
- Session management

**Database:** PostgreSQL (users table)

### User Service (Port 3002)
**Responsibilities:**
- User profile management
- Subscription management
- Parent-child linking
- User preferences

**Database:** PostgreSQL (users, subscriptions, parent_child_links)

### AI Service (Port 8000)
**Responsibilities:**
- Topic explanations with GPT-4
- Test question generation
- Learning plan generation
- Answer analysis and feedback
- Performance predictions

**Dependencies:** OpenAI API, LangChain
**Cache:** Redis (for common responses)

### Test Service (Port 3003)
**Responsibilities:**
- Test creation and management
- Test submission and grading
- Adaptive questioning
- Test history and analytics

**Database:** MongoDB (tests collection)

### Analytics Service (Port 3004)
**Responsibilities:**
- Progress tracking
- Performance analytics
- Heatmap generation
- Predictive analytics
- Parent analytics

**Database:** PostgreSQL (analytics_snapshots, test_results)
**Cache:** Redis (real-time metrics)

### Frontend (Port 5173)
**Responsibilities:**
- User interface
- Client-side routing
- State management
- API communication
- Real-time updates

## Data Flow

### Authentication Flow
```
Client → API Gateway → Auth Service → PostgreSQL
                    ↓
                JWT Token
                    ↓
                Client (stored in memory/localStorage)
```

### AI Explanation Flow
```
Client → API Gateway → AI Service → OpenAI API
                    ↓
                Redis Cache (check/store)
                    ↓
                Response to Client
```

### Test Taking Flow
```
Client → API Gateway → Test Service → MongoDB (get test)
                    ↓
            Client (take test)
                    ↓
API Gateway → Test Service → AI Service (grade)
                    ↓
            PostgreSQL (store results)
                    ↓
            Analytics Service (update metrics)
```

## Database Schema

### PostgreSQL Tables
- `users` - User accounts and profiles
- `subscriptions` - Subscription plans and status
- `parent_child_links` - Parent-child relationships
- `learning_plans` - Personalized learning schedules
- `test_results` - Test scores and performance
- `analytics_snapshots` - Daily performance snapshots
- `usage_tracking` - Rate limiting and usage metrics

### MongoDB Collections
- `tests` - Test questions and metadata
- `conversations` - AI chat history
- `content_library` - Educational content

### Redis Keys
- `session:{userId}` - User sessions
- `cache:explanation:{hash}` - Cached AI responses
- `rate_limit:{userId}:{endpoint}` - Rate limiting
- `analytics:realtime:{userId}` - Real-time metrics

## Security

### Authentication
- JWT tokens with 15-minute expiration
- Refresh tokens with 7-day expiration
- Secure password hashing with bcrypt
- Email verification required

### Authorization
- Role-based access control (student, parent, admin)
- Parent-child relationship verification
- Subscription tier enforcement

### Data Protection
- HTTPS/TLS 1.3 for all connections
- Encrypted sensitive data at rest
- CORS configuration
- Helmet security headers
- Input validation with Zod
- SQL injection prevention
- XSS protection

### Rate Limiting
- Per-user limits based on subscription tier
- IP-based limits for authentication endpoints
- Distributed rate limiting with Redis

## Performance

### Caching Strategy
- Redis for session data (1 hour TTL)
- AI response caching (24 hour TTL)
- Test template caching (1 week TTL)
- CDN for static assets

### Optimization
- Database connection pooling
- Query optimization and indexing
- Response compression
- Code splitting and lazy loading
- Image optimization

### Monitoring
- Health check endpoints on all services
- Prometheus metrics collection
- Error tracking with Sentry
- Performance monitoring
- Log aggregation

## Scalability

### Horizontal Scaling
- Stateless services can scale independently
- Load balancing with API Gateway
- Database read replicas
- Redis cluster for distributed caching

### Vertical Scaling
- Resource allocation per service
- Database optimization
- Connection pool tuning

## Development Workflow

### Local Development
1. Start Docker services (PostgreSQL, MongoDB, Redis)
2. Start all microservices with `npm run dev`
3. Frontend hot-reloads on changes
4. Backend services restart on changes

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Pre-commit hooks (optional)

### Testing
- Unit tests with Jest/Vitest
- Integration tests for APIs
- E2E tests with Playwright
- Load testing with k6

## Deployment

### Containerization
- Docker images for each service
- Docker Compose for local development
- Kubernetes for production orchestration

### CI/CD
- GitHub Actions for automation
- Automated testing on PR
- Staging deployment on merge
- Production deployment with approval

### Environments
- **Development**: Local with Docker
- **Staging**: Cloud deployment for testing
- **Production**: Scaled cloud deployment

## Future Enhancements

### Planned Features
- WebSocket for real-time updates
- Mobile applications (React Native)
- Desktop applications (Electron)
- Advanced analytics with ML models
- Content recommendation engine
- Gamification system

### Infrastructure
- Kubernetes orchestration
- Service mesh (Istio)
- Message queue (RabbitMQ/Kafka)
- Advanced monitoring (Grafana)
- A/B testing framework
