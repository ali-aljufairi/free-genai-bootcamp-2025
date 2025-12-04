# Next.js Kubernetes Optimization with Watt

This document describes the optimizations made to the Next.js frontend deployment for improved performance in Kubernetes using [Platformatic Watt](https://blog.platformatic.dev/93-faster-nextjs-in-your-kubernetes).

## Summary of Changes

### The Problem

Running Next.js in Kubernetes with traditional approaches (single-CPU pods or PM2 cluster) results in:
- **Poor latency**: ~155-182ms median response times
- **Low reliability**: ~92-94% success rate under load
- **Wasted resources**: Over-provisioning to handle uneven load distribution

### The Solution: Watt with SO_REUSEPORT

Watt leverages Linux kernel's `SO_REUSEPORT` feature to distribute connections across multiple Node.js workers with **zero coordination overhead**.

**Expected Improvements:**
| Metric | Before (Single-CPU) | After (Watt) | Improvement |
|--------|---------------------|--------------|-------------|
| Median Latency | ~155ms | ~11.6ms | **93% faster** |
| P95 Latency | ~1000ms | ~235ms | **76% faster** |
| Success Rate | ~94% | ~99.8% | **Near-perfect** |
| Throughput | ~972 req/s | ~997 req/s | **+2.5%** |

## Files Changed

### 1. `frontend/watt.json` (New)
Watt configuration file for the Next.js application.

### 2. `frontend/Dockerfile` (Modified)
- Changed base image from `bun:slim` to `node:22-slim` for Watt compatibility
- Installed `watt` and `@platformatic/next` globally
- Changed entrypoint to use `watt start --workers ${WORKERS}`

### 3. `k8s/service.yaml` (Modified)
- Changed from 1 replica × 1 CPU to **2 replicas × 2 CPUs** (4 total workers)
- Added `WORKERS=2` environment variable
- Added comprehensive health checks (liveness, readiness, startup probes)
- Increased memory allocation to handle multiple workers

## Architecture

### Before: Single-CPU Pods
```
[Load Balancer]
       │
   ┌───┴───┐
   │       │
[Pod 1] [Pod 2] ... (many small pods)
   │       │
[Node]  [Node]   (isolated event loops)
```

### After: Watt Multi-Worker Pods
```
[Kubernetes Service]
       │
   ┌───┴───┐
   │       │
[Pod 1] [Pod 2]  (fewer, larger pods)
   │       │
[Watt]  [Watt]   (orchestrates workers)
   │       │
┌──┴──┐ ┌──┴──┐
│     │ │     │
[W1][W2][W1][W2]  (SO_REUSEPORT workers)
```

**Two-Layer Load Balancing:**
1. **Layer 1**: Kubernetes Service distributes across pods
2. **Layer 2**: Kernel distributes across Watt workers using SO_REUSEPORT hash

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `WORKERS` | 2 | Number of Watt workers per pod |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |

### Scaling Guidelines

| Total CPUs Needed | Pods | CPUs/Pod | Workers/Pod |
|-------------------|------|----------|-------------|
| 2 | 1 | 2000m | 2 |
| 4 | 2 | 2000m | 2 |
| 6 | 3 | 2000m | 2 |
| 8 | 2 | 4000m | 4 |

**Rule of thumb**: Set `WORKERS` equal to CPU limit per pod.

## Health Checks

The deployment includes three types of probes:

### Startup Probe
- Allows up to 150 seconds for initial startup
- 30 attempts × 5 second intervals
- Prevents premature termination during cold start

### Readiness Probe
- Checks if pod can receive traffic
- Every 10 seconds
- Removes pod from service if unhealthy

### Liveness Probe
- Checks if pod is alive
- Every 15 seconds
- Restarts pod if unhealthy

## Deployment

### Build and Push Image

```bash
cd lang-portal/frontend
docker build -t ghcr.io/ali-aljufairi/lang-portal-frontend:v2.0.0 .
docker push ghcr.io/ali-aljufairi/lang-portal-frontend:v2.0.0
```

### Deploy to Kubernetes

```bash
# Update image tag in service.yaml, then:
kubectl apply -f k8s/service.yaml
```

### Verify Deployment

```bash
# Check pods are running with correct resources
kubectl get pods -n sorami -l app=lang-portal-frontend

# Check logs for Watt startup
kubectl logs -n sorami -l app=lang-portal-frontend --tail=50

# Check worker distribution
kubectl top pods -n sorami -l app=lang-portal-frontend
```

## Monitoring

### Key Metrics to Watch

1. **CPU Usage per Pod**: Should be evenly distributed across workers
2. **Response Latency**: P50 should be under 50ms, P95 under 300ms
3. **Success Rate**: Should be >99%
4. **Memory Usage**: Watch for memory leaks in long-running workers

### Prometheus Metrics (if enabled)

Watt exposes metrics at the management API endpoint (disabled by default for security).

## Troubleshooting

### High Latency
- Check if `WORKERS` matches CPU allocation
- Verify pods have sufficient memory
- Check for event loop blocking in Next.js SSR

### Worker Crashes
- Watt automatically restarts failed workers without pod termination
- Check logs for crash reasons: `kubectl logs -n sorami <pod-name>`

### Uneven Load Distribution
- This is expected with hash-based distribution
- Long-term average should be balanced
- Consider increasing replicas if individual pods are overloaded

## References

- [93% Faster Next.js in Kubernetes](https://blog.platformatic.dev/93-faster-nextjs-in-your-kubernetes)
- [Watt Documentation](https://docs.platformatic.dev/)
- [Next.js in K8s Guide](https://docs.platformatic.dev/docs/guides/deployment/nextjs-in-k8s)
- [GitHub: k8s-watt-performance-demo](https://github.com/platformatic/k8s-watt-performance-demo)
