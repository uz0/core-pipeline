# Core Pipeline

A production-ready NestJS REST API with full observability stack including Prometheus metrics, structured logging for Loki, and distributed tracing for Tempo/OpenTelemetry.

## Features

### Core Infrastructure
- **REST API** with health checks and status endpoints
- **Swagger/OpenAPI** documentation at `/api-docs`
- **Prometheus metrics** endpoint at `/metrics`
- **Structured logging** with Pino (Loki-compatible)
- **Distributed tracing** with OpenTelemetry (Tempo-compatible)
- **Docker** containerization with multi-stage build
- **Kubernetes** ready with liveness/readiness probes
- **Helm charts** for deployment via ArgoCD
- **GitHub Actions** CI/CD pipeline with GHCR integration

### Data Layer (TypeORM + PostgreSQL)
- **Call Entity Management**: Complete CRUD operations for call tracking
- **Repository Pattern**: Clean data access layer with custom repository methods  
- **Migrations**: Database version control with TypeORM migrations
- **Indexes**: Optimized queries with proper database indexing

### Message Streaming (Kafka)
- **Producer/Consumer**: Full Kafka integration for event-driven architecture
- **Multiple Topics**: Support for user-events, system-events, showcase-events, and call-events
- **Batch Processing**: Efficient batch message production
- **Event Storage**: In-memory event tracking and statistics

### Caching & Queuing (Redis + Bull)
- **Redis Caching**: Fast data retrieval with TTL support
- **Bull Queue**: Background job processing with retry mechanisms
- **Pub/Sub**: Real-time event broadcasting
- **Call Processing**: Asynchronous call handling with queue workers

## API Endpoints

### Complete API Documentation

Full interactive API documentation is available at `/api-docs` when the application is running.

### Health & Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with system metrics |
| `/health/liveness` | GET | Kubernetes liveness probe |
| `/health/readiness` | GET | Kubernetes readiness probe |
| `/ok` | GET | Simple status check |
| `/metrics` | GET | Prometheus metrics |
| `/api-docs` | GET | Swagger documentation |

### Kafka Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/kafka/produce` | POST | Produce message to Kafka |
| `/api/kafka/produce-batch` | POST | Produce multiple messages |
| `/api/kafka` | GET | Get all consumed messages |
| `/api/kafka/stats` | GET | Get Kafka statistics |
| `/api/kafka/topics` | GET | Get subscribed topics |
| `/api/kafka/subscribe` | POST | Subscribe to new topic |

### Call Management API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calls` | GET | Get all calls with filtering and pagination |
| `/api/calls/stats` | GET | Get call statistics |
| `/api/calls/:id` | GET | Get specific call by ID |
| `/api/calls` | POST | Create new call |
| `/api/calls/:id` | PATCH | Update call |
| `/api/calls/:id/status/:status` | PATCH | Update call status |
| `/api/calls/:id` | DELETE | Delete call |
| `/api/calls/status/:status` | GET | Get calls by status |
| `/api/calls/recent/:limit` | GET | Get recent calls |

### Redis Operations API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/redis/health` | GET | Check Redis connection status |
| `/api/redis/cache` | POST | Store data in cache |
| `/api/redis/cache/:key` | GET | Retrieve cached data |
| `/api/redis/cache/:key` | DELETE | Delete cached data |
| `/api/redis/exists/:key` | GET | Check if key exists |
| `/api/redis/pubsub/publish` | POST | Publish message to channel |
| `/api/redis/pubsub/subscribe/:channel` | POST | Subscribe to channel |
| `/api/redis/queue/status` | GET | Get queue status |
| `/api/redis/queue` | POST | Add job to queue |
| `/api/redis/test` | POST | Run comprehensive Redis test |

### Showcase Scenarios API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/showcase` | GET | List available showcase scenarios |
| `/api/showcase/basic-flow` | GET | Run basic CRUD flow |
| `/api/showcase/kafka-integration` | GET | Run Kafka integration test |
| `/api/showcase/redis-operations` | GET | Run Redis operations test |
| `/api/showcase/batch-processing` | GET | Run batch processing test |
| `/api/showcase/error-recovery` | GET | Run error recovery test |
| `/api/showcase/performance-test` | GET | Run performance test |
| `/api/showcase/full-integration` | GET | Run full integration test |
| `/api/showcase/run-all` | GET | Run all showcase scenarios |

## Development

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (for containerization)
- Kubernetes cluster (for deployment)

### Quick Start

#### Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/uz0/core-pipeline.git
cd core-pipeline

# Run the setup script
./setup.sh
```

The setup script will:
- Check prerequisites (Node.js 20+, npm 10+)
- Install dependencies
- Create .env file
- Build the application
- Run tests
- Optionally build Docker image

#### Manual Setup

1. **Clone the repository**
```bash
git clone https://github.com/uz0/core-pipeline.git
cd core-pipeline
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# For local development, the defaults should work
```

4. **Run the application**
```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

5. **Access the application**
- API: http://localhost:3000
- Health check: http://localhost:3000/health
- Swagger docs: http://localhost:3000/api-docs
- Metrics: http://localhost:3000/metrics

### Testing

```bash
# Unit tests
npm test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Linting and formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Building

```bash
# Build TypeScript
npm run build

# Build Docker image
docker build -t core-pipeline:latest .
```

## Configuration

The application uses environment variables for configuration. All settings have sensible defaults for development.

### Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment (development/production) |

### Logging Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |
| `LOG_PRETTY` | `false` | Pretty print logs (for development) |

### Metrics Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_ENABLED` | `true` | Enable Prometheus metrics |
| `METRICS_PREFIX` | `core_pipeline` | Metrics prefix |

### Tracing Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TRACING_ENABLED` | `true` | Enable OpenTelemetry tracing |
| `OTEL_SERVICE_NAME` | `core-pipeline` | Service name for traces |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP endpoint |
| `SERVICE_VERSION` | `1.0.0` | Service version for tracing |

### External Services Configuration

#### Kafka

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses (comma-separated) |
| `KAFKA_CLIENT_ID` | `core-pipeline` | Kafka client ID |
| `KAFKA_GROUP_ID` | `core-pipeline-group` | Kafka consumer group ID |

#### PostgreSQL

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `core_pipeline` | PostgreSQL database name |

#### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | ` ` | Redis password |

## Docker

### Building the image

```bash
# Build for local testing
docker build -t core-pipeline:latest .

# Build for GitHub Container Registry
docker build -t ghcr.io/uz0/core-pipeline:latest .
```

### Running with Docker

```bash
# Run with default configuration
docker run -p 3000:3000 core-pipeline:latest

# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  ghcr.io/uz0/core-pipeline:latest

# Run with .env file
docker run -p 3000:3000 \
  --env-file .env \
  ghcr.io/uz0/core-pipeline:latest
```

### Multi-platform build

```bash
# Create and use buildx builder
docker buildx create --use

# Build and push multi-platform image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/uz0/core-pipeline:latest \
  --push .
```

## Kubernetes Deployment

The Helm charts for this application are maintained in a separate repository: [core-charts](https://github.com/uz0/core-charts)

### ArgoCD Deployment

This application is deployed using ArgoCD. The ArgoCD Application manifests are available in the core-charts repository:
- Development: `dev-core-pipeline.yaml`
- Production: `prod-core-pipeline.yaml`

### Manual Helm Deployment

```bash
# Clone the charts repository
git clone https://github.com/uz0/core-charts.git
cd core-charts

# Install to development environment
helm install core-pipeline ./charts/core-pipeline \
  -f ./charts/core-pipeline/values-dev.yaml \
  --namespace dev-core \
  --create-namespace

# Install to production environment
helm install core-pipeline ./charts/core-pipeline \
  -f ./charts/core-pipeline/values-prod.yaml \
  --namespace prod-core \
  --create-namespace
```

### Health Probes

The application provides dedicated endpoints for Kubernetes probes:

- **Liveness Probe**: `/health/liveness` - Indicates if the application is running
- **Readiness Probe**: `/health/readiness` - Indicates if the application is ready to serve traffic

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yaml`) provides:

1. **Test & Lint**: Runs on all PRs and pushes
   - Installs dependencies
   - Runs linter
   - Executes tests with coverage

2. **Build & Push**: Runs on pushes to main branches
   - Builds multi-platform Docker images
   - Pushes to GitHub Container Registry (GHCR)
   - Tags images appropriately

3. **Deploy**: Separate jobs for dev and prod environments
   - Updates Helm values in core-charts repository
   - Creates GitHub deployment records
   - ArgoCD automatically syncs the changes

### Required GitHub Secrets

The pipeline uses GitHub's built-in `GITHUB_TOKEN` for:
- GHCR (GitHub Container Registry) authentication
- Updating the core-charts repository

**Note**: Ensure the `GITHUB_TOKEN` has write permissions to the core-charts repository.

### Optional Secrets

For enhanced deployments, you may want to add:
- `ARGOCD_TOKEN` - For triggering ArgoCD syncs programmatically
- `SLACK_WEBHOOK` - For deployment notifications
- `CHARTS_DEPLOY_KEY` - If using a separate deploy key for core-charts repository

## Observability

### Metrics (Prometheus)

Access metrics at `http://localhost:3000/metrics`

Available metrics:
- HTTP request duration histogram
- HTTP request count by status code
- HTTP error count by error type
- Node.js runtime metrics (memory, CPU, GC)

### Logging (Loki)

Structured JSON logs are output to stdout, ready for collection by Loki.

Log format includes:
- Timestamp
- Level
- Message
- Context
- Service metadata
- Request/response details

### Tracing (Tempo/OpenTelemetry)

Distributed tracing captures:
- HTTP requests with timing
- Database queries (when implemented)
- External service calls
- Custom spans for business logic

## Production Deployment

### Environment-specific configurations

- **Development**: Single replica, debug logging, relaxed resource limits
- **Production**: Multiple replicas, info logging, autoscaling, TLS

### Security Considerations

- Application runs as non-root user (UID 1001)
- Read-only root filesystem
- Security context with dropped capabilities
- Health check endpoints don't expose sensitive data
- Secrets management via Kubernetes secrets

### Monitoring Setup

1. **Prometheus**: Scrapes `/metrics` endpoint
2. **Loki**: Collects stdout logs via Promtail/Fluent Bit
3. **Tempo**: Receives traces via OTLP
4. **Grafana**: Visualizes all telemetry data

## License

MIT