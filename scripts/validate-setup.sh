#!/bin/bash

echo "🔍 Validating AI Tutoring Platform Setup"
echo ""

ERRORS=0

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
  echo "✅ Node.js version: $(node -v)"
else
  echo "❌ Node.js version 20+ required, found: $(node -v)"
  ERRORS=$((ERRORS + 1))
fi

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
  echo "✅ npm version: $(npm -v)"
else
  echo "❌ npm not found"
  ERRORS=$((ERRORS + 1))
fi

# Check Docker
echo "Checking Docker..."
if command -v docker &> /dev/null; then
  echo "✅ Docker version: $(docker --version)"
else
  echo "❌ Docker not found"
  ERRORS=$((ERRORS + 1))
fi

# Check Docker Compose
echo "Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
  echo "✅ Docker Compose version: $(docker-compose --version)"
else
  echo "❌ Docker Compose not found"
  ERRORS=$((ERRORS + 1))
fi

# Check Python
echo "Checking Python..."
if command -v python3 &> /dev/null; then
  echo "✅ Python version: $(python3 --version)"
else
  echo "⚠️  Python3 not found (required for AI service)"
fi

# Check if .env exists
echo "Checking environment configuration..."
if [ -f .env ]; then
  echo "✅ .env file exists"
else
  echo "⚠️  .env file not found (will use defaults)"
fi

# Check if node_modules exists
echo "Checking dependencies..."
if [ -d node_modules ]; then
  echo "✅ Dependencies installed"
else
  echo "❌ Dependencies not installed. Run: npm install"
  ERRORS=$((ERRORS + 1))
fi

# Check Docker services if Docker is running
if docker info &> /dev/null; then
  echo "Checking Docker services..."
  
  if docker-compose ps | grep -q "ai-tutor-postgres"; then
    echo "✅ PostgreSQL container exists"
  else
    echo "⚠️  PostgreSQL container not running. Run: npm run docker:up"
  fi
  
  if docker-compose ps | grep -q "ai-tutor-mongodb"; then
    echo "✅ MongoDB container exists"
  else
    echo "⚠️  MongoDB container not running. Run: npm run docker:up"
  fi
  
  if docker-compose ps | grep -q "ai-tutor-redis"; then
    echo "✅ Redis container exists"
  else
    echo "⚠️  Redis container not running. Run: npm run docker:up"
  fi
else
  echo "⚠️  Docker is not running"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ Setup validation complete! No critical errors found."
  echo ""
  echo "To start development:"
  echo "  1. npm run docker:up    # Start Docker services"
  echo "  2. npm run dev          # Start development servers"
  exit 0
else
  echo "❌ Setup validation failed with $ERRORS error(s)"
  echo "Please fix the errors above and try again."
  exit 1
fi
