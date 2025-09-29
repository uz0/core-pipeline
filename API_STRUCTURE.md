# API Structure

## Overview

The Core Pipeline API is now consolidated into a single comprehensive showcase controller that provides all functionality for testing and demonstrating system capabilities. This design ensures a clean, minimal API surface while maintaining full access to all features.

## API Endpoints

All endpoints are under the `/api/showcase` prefix, providing a unified interface for:
- Database operations (PostgreSQL + TypeORM)
- Redis operations (caching, pub/sub, queues)
- Kafka messaging
- Integration testing
- Health monitoring

### Base URL
```
http://localhost:3000/api/showcase
```

## Core Infrastructure Endpoints

These endpoints remain at the root level for system monitoring:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API root information |
| GET | `/health` | Health check endpoint |
| GET | `/metrics` | Prometheus metrics endpoint |

## Showcase API Categories

### Overview & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/showcase` | API overview and available endpoints |
| GET | `/api/showcase/health` | Check health of all components |

### Database Operations (Calls)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/showcase/calls` | List all calls |
| POST | `/api/showcase/calls` | Create a new call |
| GET | `/api/showcase/calls/:id` | Get call by ID |
| PUT | `/api/showcase/calls/:id` | Update call |
| DELETE | `/api/showcase/calls/:id` | Delete call |

### Redis Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/showcase/redis/health` | Check Redis connection |
| POST | `/api/showcase/redis/cache` | Store data in cache |
| GET | `/api/showcase/redis/cache/:key` | Get cached data |
| DELETE | `/api/showcase/redis/cache/:key` | Delete cached data |
| POST | `/api/showcase/redis/pubsub` | Publish message to channel |
| GET | `/api/showcase/redis/queue/status` | Get queue status |
| POST | `/api/showcase/redis/queue/add` | Add job to queue |

### Kafka Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/showcase/kafka/produce` | Produce Kafka message |
| GET | `/api/showcase/kafka/messages` | Get consumed messages |
| GET | `/api/showcase/kafka/stats` | Get Kafka statistics |
| GET | `/api/showcase/kafka/topics` | List subscribed topics |

### Integration Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/showcase/test/all-connections` | Test all service connections |
| POST | `/api/showcase/test/basic-flow` | Run basic workflow test |
| POST | `/api/showcase/test/kafka-integration` | Test Kafka integration |
| POST | `/api/showcase/test/redis-operations` | Test Redis operations |
| POST | `/api/showcase/test/batch-processing` | Test batch processing |
| POST | `/api/showcase/test/error-recovery` | Test error handling |
| POST | `/api/showcase/test/performance` | Run performance tests |
| POST | `/api/showcase/test/full-integration` | Full integration test |
| POST | `/api/showcase/test/run-all` | Run all test scenarios |
| GET | `/api/showcase/test/results/:scenario` | Get cached test results |

## Swagger Documentation

Access the interactive API documentation at:
```
http://localhost:3000/api-docs
```

## Architecture Benefits

### Consolidation
- **Single Entry Point**: All feature testing through `/api/showcase`
- **Reduced Complexity**: One controller manages all demonstrations
- **Clear Purpose**: Explicitly for testing and showcasing capabilities

### Clean Architecture
- **Minimal Surface Area**: Fewer public controllers
- **No Duplicates**: Each operation has one clear endpoint
- **Test-Focused**: All endpoints designed for testing connections and functionality

### Maintainability
- **Centralized Logic**: All test scenarios in one place
- **Easy Discovery**: Single controller to explore all features
- **Consistent Interface**: Uniform response structure across all endpoints

## Example Usage

### Test All Connections
```bash
curl -X POST http://localhost:3000/api/showcase/test/all-connections
```

### Create a Call
```bash
curl -X POST http://localhost:3000/api/showcase/calls \
  -H "Content-Type: application/json" \
  -d '{
    "callerId": "user-123",
    "recipientId": "user-456",
    "status": "initiated"
  }'
```

### Store Data in Redis
```bash
curl -X POST http://localhost:3000/api/showcase/redis/cache \
  -H "Content-Type: application/json" \
  -d '{
    "key": "test:data",
    "value": {"foo": "bar"},
    "ttl": 3600
  }'
```

### Produce Kafka Message
```bash
curl -X POST http://localhost:3000/api/showcase/kafka/produce \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "events",
    "key": "event-123",
    "value": {"type": "test", "data": "example"}
  }'
```

## Migration Notes

Previous endpoints have been consolidated:
- `/api/calls/*` → `/api/showcase/calls/*`
- `/api/redis/*` → `/api/showcase/redis/*`
- `/api/kafka/*` → `/api/showcase/kafka/*`

All functionality remains available through the unified showcase interface.