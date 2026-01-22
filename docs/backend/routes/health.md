# Health Check API

> **Source**: `api/src/routes/health.js`

Health check endpoint for monitoring and load balancers.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /health | Health check | No |

## GET /health

Check if the API server is running and healthy.

**Response (healthy):**
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T14:30:00Z",
  "database": "connected",
  "uptime": 86400
}
```

**Response (unhealthy):**
```json
{
  "status": "error",
  "timestamp": "2025-10-20T14:30:00Z",
  "database": "disconnected",
  "error": "Connection refused"
}
```

**HTTP Status Codes:**
- `200`: Healthy
- `503`: Unhealthy

## Usage

### Load Balancer Health Check

Configure your load balancer to hit this endpoint:

```
GET /health
Expected: 200 OK
Timeout: 5s
Interval: 30s
```

### Monitoring

```bash
# Simple check
curl http://localhost:8080/health

# Check from script
if curl -sf http://localhost:8080/health > /dev/null; then
  echo "API is healthy"
else
  echo "API is down!"
fi
```

### Docker Health Check

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## No Authentication

This endpoint does not require authentication so it can be used by:
- Load balancers
- Kubernetes probes
- Monitoring systems
- CI/CD pipelines

---

*Last verified: January 2026*
