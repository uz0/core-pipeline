# Deployment Guide

## Overview

This guide covers deployment of the Core Pipeline application in both development and production environments. The application includes PostgreSQL, Redis, Kafka, and comprehensive observability tools.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development)
- npm 9+ (for local development)

### System Requirements

- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4 CPU cores
- **Storage**: 10GB free space

## Development Deployment

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/uz0/core-pipeline.git
cd core-pipeline
```

2. **Copy environment variables**
```bash
cp .env.example .env
```

3. **Start development services**
```bash
# Start only infrastructure services
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Run database migrations
npm run migration:run

# Start the application
npm run start:dev
```

4. **Access the application**
- Application: http://localhost:3000
- Swagger API Docs: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health
- Metrics: http://localhost:3000/metrics

### Development Services

The `docker-compose.dev.yml` includes:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Kafka (port 9092)
- Zookeeper (port 2181)

## Production Deployment

### Using Docker Compose

1. **Prepare environment**
```bash
# Create production .env file
cp .env.example .env.production
# Edit .env.production with production values
```

2. **Build and deploy**
```bash
# Build the application image
docker-compose build

# Start all services
docker-compose up -d

# Check service health
docker-compose ps
```

3. **Run database migrations**
```bash
docker-compose exec app npm run migration:run
```

### Production URLs

- Application: http://localhost:3000
- Swagger API Docs: http://localhost:3000/api-docs (if enabled)
- Kafka UI: http://localhost:8080
- Jaeger UI: http://localhost:16686
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### Using Docker (Standalone)

1. **Build the image**
```bash
docker build -t core-pipeline:latest .
```

2. **Run the container**
```bash
docker run -d \
  --name core-pipeline \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e REDIS_HOST=your-redis-host \
  -e KAFKA_BROKER=your-kafka-broker \
  core-pipeline:latest
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| **Application** |
| NODE_ENV | Environment mode | development | Yes |
| PORT | Application port | 3000 | No |
| ENABLE_SWAGGER | Enable Swagger in production | false | No |
| **Database** |
| DB_HOST | PostgreSQL host | localhost | Yes |
| DB_PORT | PostgreSQL port | 5432 | No |
| DB_USERNAME | Database username | postgres | Yes |
| DB_PASSWORD | Database password | postgres | Yes |
| DB_DATABASE | Database name | core_pipeline | Yes |
| **Redis** |
| REDIS_HOST | Redis host | localhost | Yes |
| REDIS_PORT | Redis port | 6379 | No |
| **Kafka** |
| KAFKA_BROKER | Kafka broker address | localhost:9092 | Yes |
| KAFKA_CLIENT_ID | Kafka client ID | core-pipeline | No |
| KAFKA_CONSUMER_GROUP | Consumer group ID | core-pipeline-group | No |
| **Observability** |
| OTEL_SERVICE_NAME | Service name for tracing | core-pipeline | No |
| OTEL_EXPORTER_OTLP_ENDPOINT | OpenTelemetry endpoint | http://localhost:4318 | No |

### Swagger Configuration

Swagger is automatically enabled in development mode. For production:

1. **Enable via environment variable**
```bash
ENABLE_SWAGGER=true
```

2. **Access Swagger UI**
```
http://your-domain/api-docs
```

## API Documentation

### Available Endpoints

All endpoints are consolidated under `/api/showcase`:

#### Overview & Health
- `GET /api/showcase` - API overview
- `GET /api/showcase/health` - Health check for all components

#### Database Operations
- `GET /api/showcase/calls` - List all calls
- `POST /api/showcase/calls` - Create a new call
- `GET /api/showcase/calls/:id` - Get call by ID
- `PUT /api/showcase/calls/:id` - Update call
- `DELETE /api/showcase/calls/:id` - Delete call

#### Redis Operations
- `GET /api/showcase/redis/health` - Check Redis connection
- `POST /api/showcase/redis/cache` - Store data in cache
- `GET /api/showcase/redis/cache/:key` - Get cached data
- `POST /api/showcase/redis/pubsub` - Publish message
- `GET /api/showcase/redis/queue/status` - Queue status

#### Kafka Operations
- `POST /api/showcase/kafka/produce` - Produce message
- `GET /api/showcase/kafka/messages` - Get messages
- `GET /api/showcase/kafka/stats` - Kafka statistics

#### Integration Tests
- `POST /api/showcase/test/all-connections` - Test all connections
- `POST /api/showcase/test/basic-flow` - Run basic flow test
- `POST /api/showcase/test/full-integration` - Full integration test

### Testing Connections

Test all service connections:
```bash
curl -X POST http://localhost:3000/api/showcase/test/all-connections
```

Expected response:
```json
{
  "success": true,
  "duration": 150,
  "results": {
    "database": { "connected": true, "details": "Successfully created and deleted test record" },
    "redis": { "connected": true, "details": "Successfully stored, retrieved, and deleted test data" },
    "kafka": { "connected": true, "details": "Successfully produced test message" }
  }
}
```

## Monitoring

### Health Checks

The application includes comprehensive health checks:

```bash
# Application health
curl http://localhost:3000/health

# Component-specific health
curl http://localhost:3000/api/showcase/health
```

### Metrics

Prometheus metrics are available at:
```bash
curl http://localhost:3000/metrics
```

### Distributed Tracing

Jaeger UI provides distributed tracing:
- URL: http://localhost:16686
- Service name: `core-pipeline`

### Dashboards

Grafana dashboards are available at:
- URL: http://localhost:3001
- Default credentials: admin/admin

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres pg_isready
```

#### Redis Connection Failed
```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

#### Kafka Connection Failed
```bash
# Check if Kafka is running
docker-compose ps kafka

# List topics
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### Logs

#### View application logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

### Reset Services

#### Clear all data and restart
```bash
# Stop all services
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Security Considerations

### Production Checklist

- [ ] Change default passwords
- [ ] Use environment-specific .env files
- [ ] Enable HTTPS with proper certificates
- [ ] Restrict Swagger access in production
- [ ] Configure firewall rules
- [ ] Enable database SSL connections
- [ ] Use secrets management (e.g., Docker Secrets, Kubernetes Secrets)
- [ ] Regular security updates for base images

### Recommended Production Settings

```env
NODE_ENV=production
ENABLE_SWAGGER=false
DB_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
```

## Scaling

### Horizontal Scaling

The application supports horizontal scaling:

```yaml
# docker-compose.override.yml
services:
  app:
    deploy:
      replicas: 3
```

### Load Balancing

Add a load balancer (e.g., nginx):

```nginx
upstream app {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://app;
    }
}
```

## Backup and Recovery

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres core_pipeline > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres core_pipeline < backup.sql
```

### Redis Backup

Redis uses AOF persistence by default. Backup the volume:

```bash
# Backup
docker run --rm -v typeorm_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data

# Restore
docker run --rm -v typeorm_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/uz0/core-pipeline/issues
- Documentation: https://github.com/uz0/core-pipeline/wiki