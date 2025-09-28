# Core Pipeline

A production-ready NestJS application with comprehensive observability, containerization, and GitOps deployment capabilities.

## Features

- **REST API** with health check endpoints
- **OpenAPI/Swagger** documentation
- **Prometheus metrics** for monitoring
- **Structured logging** with Pino (Loki-compatible)
- **Distributed tracing** with OpenTelemetry (Tempo-ready)
- **Docker containerization** with multi-stage builds
- **GitHub Actions CI/CD** pipeline with GHCR integration
- **Kubernetes deployment** ready with Helm charts
- **GitOps ready** for ArgoCD integration

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run start:dev
```

3. Access the application:
- API: http://localhost:3000
- Swagger Documentation: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health
- Readiness Check: http://localhost:3000/ok
- Prometheus Metrics: http://localhost:3000/metrics

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Linting

```bash
npm run lint
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Kubernetes liveness probe endpoint |
| `/ok` | GET | Kubernetes readiness probe endpoint |
| `/metrics` | GET | Prometheus metrics endpoint |
| `/api-docs` | GET | Swagger/OpenAPI documentation |

## Environment Variables

### Application Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |

### Observability

| Variable | Description | Default |
|----------|-------------|---------|
| `METRICS_ENABLED` | Enable Prometheus metrics | `true` |
| `TRACING_ENABLED` | Enable OpenTelemetry tracing | `true` |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name | `core-pipeline` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint | `http://localhost:4318` |

### External Services

| Variable | Description | Default |
|----------|-------------|---------|
| `KAFKA_BROKERS` | Kafka broker addresses (comma-separated) | `localhost:9092` |
| `KAFKA_CLIENT_ID` | Kafka client identifier | `core-pipeline` |
| `KAFKA_GROUP_ID` | Kafka consumer group ID | `core-pipeline-group` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | PostgreSQL database name | `core-pipeline` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | _(optional)_ |

## Docker

### Building the Image

```bash
docker build -t core-pipeline:latest .
```

### Running the Container

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  core-pipeline:latest
```

## CI/CD Pipeline

The GitHub Actions workflow (`/.github/workflows/ci-cd.yaml`) provides:

1. **Testing & Linting** - Runs on all branches
2. **Docker Build & Push** - Pushes to GitHub Container Registry (GHCR)
3. **Helm Values Update** - Updates image tags for ArgoCD sync
4. **Security Scanning** - Trivy vulnerability scanning

### GitHub Secrets Required

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- No additional secrets needed for GHCR (uses GITHUB_TOKEN)

## Kubernetes Deployment

### Using Helm

1. Update values in `charts/core-pipeline/values.yaml` or environment-specific files
2. Deploy to Kubernetes:

```bash
# Development environment
helm install core-pipeline ./charts/core-pipeline -f ./charts/core-pipeline/values-dev.yaml

# Production environment
helm install core-pipeline ./charts/core-pipeline -f ./charts/core-pipeline/values-prod.yaml
```

### GitOps with ArgoCD

1. Point ArgoCD to this repository
2. Configure automatic sync for the `charts/core-pipeline` directory
3. CI/CD pipeline will update image tags automatically

## Observability Integration

### Prometheus

Metrics are exposed at `/metrics` endpoint. Configure Prometheus to scrape:

```yaml
scrape_configs:
  - job_name: 'core-pipeline'
    static_configs:
      - targets: ['core-pipeline:3000']
```

### Loki

Structured JSON logs are output to stdout/stderr and can be collected by Promtail or similar log collectors.

### Tempo/OpenTelemetry

Configure the OTLP endpoint to point to your Tempo instance:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
```

## Development vs Production

### Development Environment
- Single replica
- Debug logging
- Minimal resource requirements
- Dev database/cache/queue connections

### Production Environment
- Multiple replicas with auto-scaling
- Structured JSON logging
- Production-grade resource limits
- TLS/SSL enabled
- Production database/cache/queue connections

## Project Structure

```
core-pipeline/
├── src/
│   ├── config/          # Configuration module
│   ├── health/          # Health check endpoints
│   ├── metrics/         # Prometheus metrics
│   ├── tracing/         # OpenTelemetry setup
│   ├── app.module.ts    # Main application module
│   └── main.ts          # Application entry point
├── test/                # Test files
├── charts/              # Helm charts for Kubernetes
├── .github/             # GitHub Actions workflows
├── Dockerfile           # Container definition
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## License

MIT