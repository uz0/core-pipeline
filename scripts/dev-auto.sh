#!/bin/bash

# Auto-detect environment and start appropriate mode

echo "🔍 Detecting development environment..."

# Quick check if PostgreSQL is accessible
if pg_isready -h localhost -p 5432 2>/dev/null || \
   docker compose exec -T postgres pg_isready 2>/dev/null; then
  echo "✅ PostgreSQL detected - starting full development mode"
  
  # Ensure database exists
  if command -v psql &> /dev/null; then
    psql -h localhost -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'core_pipeline_dev'" 2>/dev/null | grep -q 1 || \
      psql -h localhost -U postgres -c "CREATE DATABASE core_pipeline_dev;" 2>/dev/null
  elif docker compose ps 2>/dev/null | grep -q "postgres.*Up"; then
    docker compose exec -T postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'core_pipeline_dev'" | grep -q 1 || \
      docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE core_pipeline_dev;"
  fi
  
  npm run start:dev
else
  echo "⚠️  PostgreSQL not detected - starting minimal mode"
  echo "   (Using SQLite, no Redis/Kafka)"
  npm run start:minimal
fi