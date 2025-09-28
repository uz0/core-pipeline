# Core Pipeline

A production-ready NestJS REST API with full observability stack including Prometheus metrics, structured logging for Loki, and distributed tracing for Tempo/OpenTelemetry.

## Features

- **REST API** with health checks and status endpoints
- **Swagger/OpenAPI** documentation at `/api-docs`
- **Prometheus metrics** endpoint at `/metrics`
- **Structured logging** with Pino (Loki-compatible)
- **Distributed tracing** with OpenTelemetry (Tempo-compatible)
- **Docker** containerization with multi-stage build
- **Kubernetes** ready with liveness/readiness probes
- **Helm charts** for deployment via ArgoCD
- **GitHub Actions** CI/CD pipeline with GHCR integration

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with system metrics |
| `/health/liveness` | GET | Kubernetes liveness probe |
| `/health/readiness` | GET | Kubernetes readiness probe |
| `/ok` | GET | Simple status check |
| `/metrics` | GET | Prometheus metrics |
| `/api-docs` | GET | Swagger documentation |

## Development

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (for containerization)
- Kubernetes cluster (for deployment)

### Installation

```bash
npm install
```

### Running the application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

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
docker build -t ghcr.io/<your-org>/core-pipeline:latest .
```

### Running with Docker

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  ghcr.io/<your-org>/core-pipeline:latest
```

### Multi-platform build

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/<your-org>/core-pipeline:latest \
  --push .
```

## Kubernetes Deployment

### Using Helm

```bash
# Install to development environment
helm install core-pipeline ./charts \
  -f charts/values-dev.yaml \
  --namespace development

# Install to production environment
helm install core-pipeline ./charts \
  -f charts/values-prod.yaml \
  --namespace production
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
   - Updates Helm values with new image tags
   - Triggers ArgoCD sync (when configured)

### Required GitHub Secrets

The pipeline uses GitHub's built-in `GITHUB_TOKEN` for GHCR authentication. No additional secrets are required for basic operation.

For production deployments, you may want to add:
- `ARGOCD_TOKEN` - For triggering ArgoCD syncs
- `SLACK_WEBHOOK` - For deployment notifications

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