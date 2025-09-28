# Helm Charts Creation Instructions for Core Pipeline

## Overview
Create production-ready Helm charts for the NestJS "core-pipeline" application that supports multiple environments (dev, staging, prod) with GitOps/ArgoCD integration.

## Prerequisites
- The NestJS application exposes port 3000
- Health endpoints: `/health` (liveness), `/ok` (readiness)
- Metrics endpoint: `/metrics` (Prometheus)
- Application requires connections to Kafka, PostgreSQL, and Redis

## Required Chart Structure
```
charts/
└── core-pipeline/
    ├── Chart.yaml
    ├── values.yaml
    ├── values-dev.yaml
    ├── values-staging.yaml  
    ├── values-prod.yaml
    └── templates/
        ├── _helpers.tpl
        ├── deployment.yaml
        ├── service.yaml
        ├── configmap.yaml
        ├── secret.yaml
        ├── ingress.yaml
        ├── hpa.yaml
        ├── servicemonitor.yaml
        ├── networkpolicy.yaml
        └── NOTES.txt
```

## Chart.yaml Requirements
- API version: v2
- Type: application
- Include proper metadata and version tracking
- App version should match the Docker image version

## values.yaml Base Configuration

### Image Configuration
- Repository: `ghcr.io/<github-username>/core-pipeline`
- Pull policy: IfNotPresent for production, Always for dev
- Tag: Use Chart.appVersion as default

### Deployment Configuration
- Replica count: 2 (default), 1 (dev), 3+ (prod)
- Update strategy: RollingUpdate
- Pod annotations for Prometheus scraping:
  ```yaml
  prometheus.io/scrape: "true"
  prometheus.io/path: "/metrics"
  prometheus.io/port: "3000"
  ```

### Security Context
- Run as non-root user (UID 1000)
- Read-only root filesystem
- Drop all capabilities
- Set fsGroup for volume permissions

### Probes Configuration
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ok
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Resource Limits
- Dev: 100m CPU / 128Mi memory (requests), 200m / 256Mi (limits)
- Staging: 250m / 256Mi (requests), 500m / 512Mi (limits)
- Prod: 500m / 512Mi (requests), 1000m / 1Gi (limits)

### Service Configuration
- Type: ClusterIP
- Port: 80 → targetPort: 3000
- Named port: "http"

### Ingress Configuration
- Support multiple ingress controllers (nginx, traefik)
- TLS termination with cert-manager
- Host-based routing
- Rate limiting annotations for production

### HPA (Horizontal Pod Autoscaler)
- Enable for staging/prod, disable for dev
- Min replicas: 2 (staging), 3 (prod)
- Max replicas: 10 (staging), 20 (prod)
- Target CPU: 80%
- Target Memory: 80%

### Environment Variables
Required environment variables to configure:

```yaml
env:
  NODE_ENV: "production"  # dev/staging/production
  PORT: "3000"
  LOG_LEVEL: "info"  # debug for dev, info for staging, warn for prod
  METRICS_ENABLED: "true"
  TRACING_ENABLED: "true"
  OTEL_SERVICE_NAME: "core-pipeline"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://tempo:4318"
  
  # External services (use ConfigMap/Secret refs)
  KAFKA_BROKERS: ""  # Comma-separated list
  KAFKA_CLIENT_ID: "core-pipeline"
  KAFKA_GROUP_ID: "core-pipeline-group"
  
  POSTGRES_HOST: ""
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "core-pipeline"
  POSTGRES_USER: ""  # From Secret
  POSTGRES_PASSWORD: ""  # From Secret
  
  REDIS_HOST: ""
  REDIS_PORT: "6379"
  REDIS_PASSWORD: ""  # From Secret
```

## Templates Requirements

### deployment.yaml
- Support for init containers if needed
- Volume mounts for temporary files if needed
- Anti-affinity rules to spread pods across nodes
- Topology spread constraints for AZ distribution
- PodDisruptionBudget reference

### service.yaml
- Expose port 80 → 3000
- Proper label selectors
- Support for headless service if needed

### configmap.yaml
- Non-sensitive configuration
- Environment-specific settings
- Feature flags

### secret.yaml
- Database credentials
- API keys
- Redis password
- Use `stringData` for ease of use
- Support external secret operators (optional)

### ingress.yaml
- Conditional creation based on `ingress.enabled`
- Support for multiple hosts
- TLS configuration with cert-manager
- Proper annotations for:
  - Rate limiting
  - CORS
  - Request body size
  - Timeouts

### hpa.yaml
- Conditional based on `autoscaling.enabled`
- Support for both CPU and memory metrics
- Custom metrics support (optional)

### servicemonitor.yaml
- For Prometheus Operator integration
- Conditional creation
- Proper endpoint configuration
- Metric relabeling if needed

### networkpolicy.yaml
- Ingress rules for pod-to-pod communication
- Egress rules for external services
- Conditional creation based on `networkPolicy.enabled`

## Environment-Specific Values Files

### values-dev.yaml
```yaml
replicaCount: 1
image:
  pullPolicy: Always
ingress:
  enabled: true
  hostname: core-pipeline-dev.example.com
autoscaling:
  enabled: false
resources:
  limits:
    cpu: 200m
    memory: 256Mi
env:
  NODE_ENV: development
  LOG_LEVEL: debug
```

### values-staging.yaml
```yaml
replicaCount: 2
ingress:
  enabled: true
  hostname: core-pipeline-staging.example.com
  tls: true
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
env:
  NODE_ENV: staging
  LOG_LEVEL: info
```

### values-prod.yaml
```yaml
replicaCount: 3
ingress:
  enabled: true
  hostname: core-pipeline.example.com
  tls: true
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
env:
  NODE_ENV: production
  LOG_LEVEL: warn
```

## ArgoCD Integration Requirements

1. **Application Manifest Support**
   - Include ArgoCD application manifests in `argocd/` directory
   - Support for ApplicationSets
   - Sync policies and hooks

2. **GitOps Workflow**
   - Image tag updates via CI/CD
   - Separate config repo support (optional)
   - Automated sync with health checks

3. **Multi-Environment Support**
   - Use ArgoCD projects for environment separation
   - RBAC policies per environment
   - Progressive rollout support

## Testing Requirements

Create test values file (`values-test.yaml`) for chart testing:
- Minimal resources
- All features enabled for testing
- Mock external service endpoints

## Helm Hooks (Optional)
- Pre-install: Database migration Job
- Post-install: Smoke tests Job
- Pre-upgrade: Backup Job
- Post-upgrade: Verification Job

## Chart Documentation
Include comprehensive README.md with:
- Installation instructions
- Configuration options table
- Example values for common scenarios
- Troubleshooting guide
- Upgrade notes

## Validation Rules
- Use JSON Schema for values validation
- Required fields validation
- Type checking for configuration values
- Range validation for replicas and resources

## Best Practices to Follow
1. Use `helm lint` to validate charts
2. Test with `helm template` before deployment
3. Use `--dry-run` for installation testing
4. Version all changes properly
5. Keep secrets separate from ConfigMaps
6. Use helper templates to reduce duplication
7. Include NOTES.txt with post-installation instructions
8. Support both Helm 3.x versions
9. Add labels for better resource management:
   - `app.kubernetes.io/name`
   - `app.kubernetes.io/instance`
   - `app.kubernetes.io/version`
   - `app.kubernetes.io/component`
   - `app.kubernetes.io/managed-by`

## CI/CD Integration
The Helm charts should support:
- Automated image tag updates via sed/yq
- GitHub Actions for chart validation
- Chart version bumping on changes
- Chart publishing to OCI registry (optional)

## Monitoring & Observability Integration
Ensure compatibility with:
- Prometheus Operator CRDs
- Grafana dashboard ConfigMaps
- Alert rules for critical metrics
- Loki for log aggregation
- Tempo for trace collection

## Success Criteria
- [ ] Charts pass `helm lint` without warnings
- [ ] Successful deployment to all environments
- [ ] Prometheus metrics are scraped correctly
- [ ] Ingress routes work with TLS
- [ ] HPA scales based on load
- [ ] Logs are structured and collected
- [ ] Traces are exported to Tempo
- [ ] ArgoCD can sync without manual intervention
- [ ] Resource limits prevent OOM kills
- [ ] Zero-downtime deployments work

## Notes for Implementation
- Start with the basic templates and iterate
- Test in a local Kubernetes cluster first (minikube/kind)
- Ensure all external service configurations are parameterized
- Document any assumptions or dependencies
- Consider using Helm unittest plugin for testing
- Keep chart complexity manageable - avoid over-engineering