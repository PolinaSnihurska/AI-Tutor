# Getting Started with AI Tutoring Platform

Welcome to the AI Tutoring Platform! This guide will help you get up and running quickly.

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start Docker services (PostgreSQL, MongoDB, Redis)
npm run docker:up

# 4. Start all development servers
npm run dev
```

Open http://localhost:5173 in your browser!

## 📋 What You Need

- Node.js 20+ and npm 9+
- Docker and Docker Compose
- Python 3.11+ (for AI service)
- A code editor (VS Code recommended)

## 🏗️ Project Structure

```
ai-tutoring-platform/
├── packages/
│   ├── frontend/           # React app (port 5173)
│   ├── api-gateway/        # API Gateway (port 3000)
│   ├── auth-service/       # Authentication (port 3001)
│   ├── user-service/       # User management (port 3002)
│   ├── test-service/       # Tests (port 3003)
│   ├── analytics-service/  # Analytics (port 3004)
│   ├── ai-service/         # AI (port 8000)
│   └── shared-types/       # Shared TypeScript types
├── scripts/                # Utility scripts
└── docker-compose.yml      # Database services
```

## 🔧 Available Commands

### Development
```bash
npm run dev              # Start all services
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint code
npm run format           # Format code
```

### Docker
```bash
npm run docker:up        # Start databases
npm run docker:down      # Stop databases
npm run docker:logs      # View logs
npm run docker:clean     # Remove all data
```

### Utilities
```bash
npm run setup            # Initial setup
npm run validate         # Validate setup
```

## 🌐 Service URLs

Once running, access:

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001/health
- **User Service**: http://localhost:3002/health
- **AI Service**: http://localhost:8000/health
- **Test Service**: http://localhost:3003/health
- **Analytics Service**: http://localhost:3004/health

## 🗄️ Database Access

### PostgreSQL
```bash
psql postgresql://postgres:postgres@localhost:5432/ai_tutor
```

### MongoDB
```bash
mongosh mongodb://mongo:mongo@localhost:27017/ai_tutor?authSource=admin
```

### Redis
```bash
redis-cli -a redis
```

## 📝 Environment Variables

Key variables to configure in `.env`:

```env
# Required for AI features
OPENAI_API_KEY=your-openai-api-key

# Security (generate random strings)
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Optional for payments
STRIPE_SECRET_KEY=your-stripe-key
```

## 🎯 Next Steps

1. **Explore the codebase**
   - Check out `packages/frontend/src/App.tsx`
   - Review `packages/shared-types/src/` for data models

2. **Read the documentation**
   - [README.md](./README.md) - Project overview
   - [SETUP.md](./SETUP.md) - Detailed setup guide
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
   - [Design Document](./.kiro/specs/ai-tutoring-platform/design.md)

3. **Start implementing**
   - Review [tasks.md](./.kiro/specs/ai-tutoring-platform/tasks.md)
   - Pick a task and start coding!

## 🐛 Troubleshooting

### Port already in use
```bash
# Find and kill process
lsof -i :5173
kill -9 <PID>
```

### Docker not starting
```bash
# Check Docker is running
docker info

# View logs
npm run docker:logs

# Restart
npm run docker:down
npm run docker:up
```

### Module not found
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
# Rebuild shared types
cd packages/shared-types
npm run build
```

## 💡 Development Tips

1. **Hot Reload**: Frontend and backend services auto-reload on changes
2. **Monorepo**: Use `turbo` for efficient builds across packages
3. **Types**: Shared types in `packages/shared-types` are used by all services
4. **Docker**: Keep Docker services running during development
5. **Logs**: Use `npm run docker:logs` to debug database issues

## 📚 Learn More

- [Requirements](./.kiro/specs/ai-tutoring-platform/requirements.md) - Feature requirements
- [Design](./.kiro/specs/ai-tutoring-platform/design.md) - System design
- [Tasks](./.kiro/specs/ai-tutoring-platform/tasks.md) - Implementation plan

## 🤝 Need Help?

- Check service health: `http://localhost:<port>/health`
- View Docker logs: `npm run docker:logs`
- Validate setup: `npm run validate`
- Review documentation in `.kiro/specs/`

## ✅ Verify Your Setup

Run the validation script:

```bash
npm run validate
```

This checks:
- ✅ Node.js and npm versions
- ✅ Docker installation
- ✅ Dependencies installed
- ✅ Docker services running
- ✅ Environment configuration

Happy coding! 🎉
