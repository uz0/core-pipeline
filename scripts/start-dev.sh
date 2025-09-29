#!/bin/bash

# Start development environment with all dependencies

echo "🚀 Starting Core Pipeline Development Environment..."

# Flag to track if we should use minimal mode
USE_MINIMAL=false

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "⚠️  Docker is not running."
  echo "   Starting in minimal mode (SQLite database, no Redis/Kafka)..."
  USE_MINIMAL=true
else
  # Check if docker-compose services are running
  if ! docker compose ps 2>/dev/null | grep -q "postgres.*Up"; then
    echo "📦 Starting Docker services (PostgreSQL, Redis, Kafka)..."
    docker compose up -d postgres redis kafka 2>/dev/null
    
    if docker compose ps 2>/dev/null | grep -q "postgres.*Up"; then
      # Wait for PostgreSQL to be ready
      echo "⏳ Waiting for PostgreSQL to be ready..."
      for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U postgres 2>/dev/null; then
          echo "✅ PostgreSQL is ready!"
          
          # Create database if it doesn't exist
          echo "🗄️  Creating database if needed..."
          docker compose exec -T postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'core_pipeline_dev'" | grep -q 1 || \
            docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE core_pipeline_dev;" && \
            echo "✅ Database created!"
          
          # Run migrations
          echo "🔄 Running database migrations..."
          npm run migration:run 2>/dev/null || echo "⚠️  Migrations failed or skipped"
          break
        fi
        if [ $i -eq 30 ]; then
          echo "⚠️  PostgreSQL failed to start. Using minimal mode..."
          USE_MINIMAL=true
        else
          echo -n "."
          sleep 1
        fi
      done
    else
      echo "⚠️  Failed to start Docker services."
      echo "   Starting in minimal mode (SQLite database)..."
      USE_MINIMAL=true
    fi
  else
    echo "✅ Docker services are running"
    
    # Ensure database exists
    echo "🗄️  Checking database..."
    docker compose exec -T postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'core_pipeline_dev'" | grep -q 1 || \
      docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE core_pipeline_dev;" && \
      echo "✅ Database created!"
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npm run migration:run 2>/dev/null || echo "⚠️  Migrations skipped"
  fi
fi

# Start the application
if [ "$USE_MINIMAL" = true ]; then
  echo ""
  echo "🚀 Starting in MINIMAL MODE (no external dependencies required)"
  echo "   - Using SQLite database"
  echo "   - Redis features disabled"
  echo "   - Kafka features disabled"
  echo ""
  npm run start:minimal
else
  echo ""
  echo "🚀 Starting in FULL MODE with Docker services"
  echo "   - PostgreSQL database: core_pipeline_dev"
  echo "   - Redis caching enabled"
  echo "   - Kafka messaging enabled"
  echo ""
  npm run start:dev
fi