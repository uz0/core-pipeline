#!/bin/bash

# Deploy to Production Environment
# Usage: ./scripts/deploy-production.sh

set -e

echo "🚀 Starting production deployment..."

# Configuration
ENVIRONMENT="production"
DOMAIN="core-pipeline.theedgestory.org"
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   print_warning "This script should not be run as root"
   exit 1
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

print_status "Environment variables loaded"

# Pull latest code
print_status "Pulling latest code from repository..."
git pull origin main

# Build Docker image
print_status "Building Docker image..."
docker-compose -f $COMPOSE_FILE build --no-cache app

# Stop current containers
print_status "Stopping current containers..."
docker-compose -f $COMPOSE_FILE down

# Backup database (optional)
print_status "Creating database backup..."
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
docker-compose -f $COMPOSE_FILE run --rm postgres pg_dump -U $DB_USERNAME $DB_DATABASE > backups/$BACKUP_FILE || print_warning "Database backup failed"

# Start services
print_status "Starting services..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Run database migrations
print_status "Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T app npm run migration:run

# Health check
print_status "Performing health check..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
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
    print_error "Rolling back deployment..."
    docker-compose -f $COMPOSE_FILE down
    # Restore from previous image if available
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
echo "----------------------------------------"

# Test critical endpoints
print_status "Testing critical endpoints..."

# Test main API
if curl -f https://$DOMAIN/api/showcase > /dev/null 2>&1; then
    print_status "Main API endpoint is accessible"
else
    print_error "Main API endpoint is not accessible"
fi

# Test Swagger (if enabled)
if curl -f https://$DOMAIN/api-docs > /dev/null 2>&1; then
    print_status "Swagger documentation is accessible"
else
    print_warning "Swagger documentation is not accessible (may be disabled)"
fi

# Show container status
print_status "Container status:"
docker-compose -f $COMPOSE_FILE ps

# Show recent logs
print_status "Recent application logs:"
docker-compose -f $COMPOSE_FILE logs --tail=50 app

echo ""
print_status "🎉 Production deployment completed successfully!"
echo "Access the application at: https://$DOMAIN"