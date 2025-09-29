#!/bin/bash

# Deploy to Development Environment
# Usage: ./scripts/deploy-development.sh

set -e

echo "🚀 Starting development deployment..."

# Configuration
ENVIRONMENT="development"
DOMAIN="core-pipeline.dev.theedgestory.org"
ENV_FILE=".env.development"
COMPOSE_FILE="docker-compose.yml"
PORT=3001

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    print_info "Creating from example..."
    cp .env.example $ENV_FILE
    print_warning "Please update $ENV_FILE with appropriate values"
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)
export PORT=$PORT  # Override port for development

print_status "Environment variables loaded"

# Pull latest code
print_status "Pulling latest code from repository..."
git pull origin develop || git pull origin main

# Build Docker image with development settings
print_status "Building Docker image for development..."
docker-compose -f $COMPOSE_FILE build app

# Stop current containers
print_status "Stopping current containers..."
docker-compose -f $COMPOSE_FILE down

# Start services with development configuration
print_status "Starting services..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Run database migrations
print_status "Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T app npm run migration:run || print_warning "Migrations might have already been applied"

# Install development dependencies (if running locally)
if [ "$1" == "--local" ]; then
    print_status "Installing development dependencies..."
    npm install
    
    print_status "Running in local development mode..."
    npm run start:dev &
    DEV_PID=$!
    
    print_info "Development server PID: $DEV_PID"
    echo $DEV_PID > .dev.pid
fi

# Health check
print_status "Performing health check..."
MAX_RETRIES=30
RETRY_COUNT=0
HEALTH_URL="https://$DOMAIN/health"

# Use localhost for local development
if [ "$1" == "--local" ]; then
    HEALTH_URL="http://localhost:$PORT/health"
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f $HEALTH_URL > /dev/null 2>&1; then
        print_status "Health check passed!"
        break
    else
        print_warning "Health check failed, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Health check failed after $MAX_RETRIES attempts!"
    exit 1
fi

# Clean up old Docker images
print_status "Cleaning up old Docker images..."
docker image prune -f

# Verify deployment
print_status "Verifying deployment..."
echo "----------------------------------------"
echo "Deployment Information:"
echo "  Environment: $ENVIRONMENT"
echo "  URL: https://$DOMAIN"
echo "  Swagger: https://$DOMAIN/api-docs"
echo "  Health: https://$DOMAIN/health"
echo "  Metrics: https://$DOMAIN/metrics"
echo ""
echo "Development Tools:"
echo "  Kafka UI: https://$DOMAIN/kafka-ui"
echo "  Jaeger: https://$DOMAIN/jaeger"
echo "----------------------------------------"

# Test critical endpoints
print_status "Testing critical endpoints..."

# Test main API
API_URL="https://$DOMAIN/api/showcase"
if [ "$1" == "--local" ]; then
    API_URL="http://localhost:$PORT/api/showcase"
fi

if curl -f $API_URL > /dev/null 2>&1; then
    print_status "Main API endpoint is accessible"
else
    print_error "Main API endpoint is not accessible"
fi

# Test Swagger (always enabled in development)
SWAGGER_URL="https://$DOMAIN/api-docs"
if [ "$1" == "--local" ]; then
    SWAGGER_URL="http://localhost:$PORT/api-docs"
fi

if curl -f $SWAGGER_URL > /dev/null 2>&1; then
    print_status "Swagger documentation is accessible"
else
    print_error "Swagger documentation is not accessible"
fi

# Show container status
print_status "Container status:"
docker-compose -f $COMPOSE_FILE ps

# Show recent logs
print_status "Recent application logs:"
docker-compose -f $COMPOSE_FILE logs --tail=50 app

# Development-specific checks
print_info "Running development-specific checks..."

# Check if hot-reload is working (for local development)
if [ "$1" == "--local" ]; then
    print_info "Hot-reload is enabled. Changes will be reflected automatically."
    print_info "Watching for file changes..."
fi

# Show database connection info
print_info "Database connection:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_DATABASE"

# Show Redis connection info
print_info "Redis connection:"
echo "  Host: $REDIS_HOST"
echo "  Port: $REDIS_PORT"

# Show Kafka connection info
print_info "Kafka connection:"
echo "  Broker: $KAFKA_BROKER"

echo ""
print_status "🎉 Development deployment completed successfully!"
echo "Access the application at: https://$DOMAIN"

if [ "$1" == "--local" ]; then
    echo "Local development server: http://localhost:$PORT"
    echo ""
    print_info "To stop the local development server, run: kill \$(cat .dev.pid)"
fi