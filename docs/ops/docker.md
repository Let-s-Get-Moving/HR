# Docker Configuration

> **Source**: `config/`

This document covers the Docker setup for the HR system.

## Files

| File | Purpose |
|------|---------|
| `config/docker-compose.yml` | Main compose file |
| `config/docker-compose.dev.yml` | Development overrides |
| `config/Dockerfile` | API container |
| `web/Dockerfile` | Frontend production build |
| `web/Dockerfile.dev` | Frontend development server |

## Images

### API (config/Dockerfile)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm ci --only=production

COPY api/ .

EXPOSE 8080
CMD ["node", "src/server.js"]
```

### Frontend Development (web/Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

### Frontend Production (web/Dockerfile)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Docker Compose

### Service Dependencies

```
web → api → db
adminer → db
```

### Networks

All services on default bridge network. Services communicate via service names (e.g., `db`, `api`).

### Volumes

| Volume | Mount | Purpose |
|--------|-------|---------|
| postgres_data | /var/lib/postgresql/data | Database persistence |
| ./db/init | /docker-entrypoint-initdb.d | Auto-run migrations |
| ./web/src | /app/src | Hot reload (dev) |

## Building Images

```bash
# Build all
docker compose -f config/docker-compose.yml build

# Build specific service
docker compose -f config/docker-compose.yml build api

# Build with no cache
docker compose -f config/docker-compose.yml build --no-cache api
```

## Common Commands

```bash
# Start services
docker compose -f config/docker-compose.yml up -d

# Stop services
docker compose -f config/docker-compose.yml down

# View logs
docker compose -f config/docker-compose.yml logs -f api

# Execute command in container
docker exec -it hr-api-1 sh

# Copy file to container
docker cp myfile.sql hr-db-1:/tmp/

# View resource usage
docker stats
```

## Container Names

Default naming: `{directory}-{service}-{number}`

| Service | Container Name |
|---------|---------------|
| db | hr-db-1 |
| api | hr-api-1 |
| web | hr-web-1 |
| adminer | hr-adminer-1 |

## Health Checks

API health endpoint: `GET /health`

```bash
# Check if API is healthy
curl http://localhost:8080/health

# In compose file
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Resource Limits

Not currently configured. For production, consider adding:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Troubleshooting

### Out of disk space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup
docker system prune -a
```

### Container keeps restarting

Check logs:

```bash
docker compose -f config/docker-compose.yml logs api
```

Common causes:
- Missing environment variable
- Database not ready
- Port conflict

### Build fails

```bash
# Clear build cache
docker builder prune

# Rebuild from scratch
docker compose -f config/docker-compose.yml build --no-cache
```

---

*Last verified: January 2026*
