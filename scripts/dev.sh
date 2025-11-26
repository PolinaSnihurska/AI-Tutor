#!/bin/bash

# Start development environment
echo "🚀 Starting AI Tutoring Platform Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Start Docker services
echo "📦 Starting Docker services (PostgreSQL, MongoDB, Redis)..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - MongoDB: localhost:27017"
echo "  - Redis: localhost:6379"
echo ""
echo "To start the application services, run:"
echo "  npm run dev"
echo ""
echo "To stop Docker services, run:"
echo "  npm run docker:down"
