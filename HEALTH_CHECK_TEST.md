# Health Check Testing

This document explains how to test the health check endpoints.

## Health Check Endpoints

The application provides three health check endpoints:

1. **`/health/liveness`** - Kubernetes liveness probe (always returns 200 if app is running)
2. **`/health/readiness`** - Kubernetes readiness probe (always returns 200 if app is ready)
3. **`/health`** - Detailed health check (checks memory, disk, etc.)

## Important Notes

✅ **Health checks do NOT depend on Redis**
- The app will start and health checks will pass even if Redis is unavailable
- This prevents crash loops when Redis has authentication issues

⚠️ **Redis Connection Issues**
- If Redis password is incorrect, you'll see `WRONGPASS` errors in logs
- The app will continue running and serving requests
- Bull queue will not work, but the app stays healthy

## Testing Locally

### Option 1: Using the test script

```bash
# If app is running on port 3000
./test-health.sh

# If app is running on a different port
PORT=8080 ./test-health.sh
```

### Option 2: Manual curl tests

```bash
# Liveness check
curl http://localhost:3000/health/liveness

# Readiness check
curl http://localhost:3000/health/readiness

# Full health check
curl http://localhost:3000/health
```

## Expected Responses

### Liveness & Readiness
```json
{
  "status": "ok"
}
```

### Full Health Check
```json
{
  "status": "ok",
  "info": {
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  }
}
```

## Kubernetes Configuration

Your Kubernetes deployment should use these probes:

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30  # Allow 150 seconds for startup
```

## Debugging Startup Issues

Look for these logs to track startup progress:

```
🚨 ATTENTION!!!! APPLICATION STARTUP SEQUENCE BEGINNING 🚨
```

If startup succeeds, you'll see:

```
🚨 ATTENTION!!!! APPLICATION SUCCESSFULLY STARTED 🚨
```

If you see the first message but NOT the second, the app crashed during startup.
