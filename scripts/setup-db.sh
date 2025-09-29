#!/bin/bash

# Setup local development database

echo "🗄️  Setting up local database..."

# Start PostgreSQL if not running
if ! docker compose ps postgres | grep -q "Up"; then
  echo "Starting PostgreSQL..."
  docker compose up -d postgres
  sleep 5
fi

# Create database if it doesn't exist
echo "Creating database if needed..."
docker compose exec -T postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'core_pipeline_dev'" | grep -q 1 || \
  docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE core_pipeline_dev;"

echo "✅ Database setup complete!"