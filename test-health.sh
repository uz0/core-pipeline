#!/bin/bash

# Test health check endpoints
# This script tests the health endpoints without Redis dependency

echo "🚨 ATTENTION!!!! TESTING HEALTH CHECK ENDPOINTS 🚨"
echo "=================================================="
echo ""

PORT=${PORT:-3000}
BASE_URL="http://localhost:${PORT}"

echo "Testing liveness endpoint..."
curl -s -o /dev/null -w "Liveness: HTTP %{http_code}\n" "${BASE_URL}/health/liveness" || echo "❌ Liveness check failed"
echo ""

echo "Testing readiness endpoint..."
curl -s -o /dev/null -w "Readiness: HTTP %{http_code}\n" "${BASE_URL}/health/readiness" || echo "❌ Readiness check failed"
echo ""

echo "Testing main health endpoint..."
curl -s -o /dev/null -w "Health: HTTP %{http_code}\n" "${BASE_URL}/health" || echo "❌ Health check failed"
echo ""

echo "Full liveness response:"
curl -s "${BASE_URL}/health/liveness" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/health/liveness"
echo ""

echo "Full readiness response:"
curl -s "${BASE_URL}/health/readiness" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/health/readiness"
echo ""

echo "=================================================="
echo "✅ Health check tests complete"
