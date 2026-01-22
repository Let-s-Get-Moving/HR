# Local Development

This guide covers setting up and running the HR system locally.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for running scripts outside containers)
- Git

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd HR

# Start all services
docker compose -f config/docker-compose.yml up -d

# Access points:
# Web App:  http://localhost:5173
# API:      http://localhost:8080
# Adminer:  http://localhost:8081
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| web | 5173 | React frontend (Vite dev server) |
| api | 8080 | Express API server |
| db | 5432 | PostgreSQL database |
| adminer | 8081 | Database admin UI |

## Docker Compose Configuration

### Production config: `config/docker-compose.yml`

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: hr
      POSTGRES_PASSWORD: hrpass
      POSTGRES_DB: hrcore
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: config/Dockerfile
    environment:
      DATABASE_URL: postgresql://hr:hrpass@db:5432/hrcore
      NODE_ENV: development
    ports:
      - "8080:8080"
    depends_on:
      - db

  web:
    build:
      context: ./web
      dockerfile: Dockerfile.dev
    environment:
      VITE_API_URL: http://localhost:8080
    ports:
      - "5173:5173"
    volumes:
      - ./web/src:/app/src
    depends_on:
      - api

  adminer:
    image: adminer
    ports:
      - "8081:8080"
    depends_on:
      - db
```

## Starting and Stopping

```bash
# Start all services (detached)
docker compose -f config/docker-compose.yml up -d

# Start with logs visible
docker compose -f config/docker-compose.yml up

# Stop all services
docker compose -f config/docker-compose.yml down

# Stop and remove volumes (fresh database)
docker compose -f config/docker-compose.yml down -v

# Restart a specific service
docker compose -f config/docker-compose.yml restart api
```

## Viewing Logs

```bash
# All services
docker compose -f config/docker-compose.yml logs -f

# Specific service
docker compose -f config/docker-compose.yml logs -f api

# Last N lines
docker compose -f config/docker-compose.yml logs --tail=100 api
```

## Database Access

### Via Adminer (recommended)

1. Open http://localhost:8081
2. Login:
   - System: PostgreSQL
   - Server: db
   - Username: hr
   - Password: hrpass
   - Database: hrcore

### Via psql

```bash
# From host machine
psql postgresql://hr:hrpass@localhost:5432/hrcore

# From inside container
docker exec -it hr-db-1 psql -U hr -d hrcore
```

### Run SQL file

```bash
docker exec -i hr-db-1 psql -U hr -d hrcore < db/init/new_migration.sql
```

## Hot Reload

### Frontend

The web container mounts `./web/src` so changes are reflected immediately (Vite hot reload).

### Backend

Currently requires container restart for changes:

```bash
docker compose -f config/docker-compose.yml restart api
```

For faster iteration, you can run the API directly:

```bash
cd api
npm install
DATABASE_URL=postgresql://hr:hrpass@localhost:5432/hrcore node src/server.js
```

## Running Without Docker

### Database

Either use the Docker database:

```bash
docker compose -f config/docker-compose.yml up -d db
```

Or install PostgreSQL locally and create the database:

```bash
createdb hrcore
psql -d hrcore -f db/init/001_schema.sql
# ... run all migrations
```

### API

```bash
cd api
npm install
export DATABASE_URL=postgresql://hr:hrpass@localhost:5432/hrcore
npm run dev
```

### Frontend

```bash
cd web
npm install
export VITE_API_URL=http://localhost:8080
npm run dev
```

## Common Tasks

### Reset Database

```bash
# Stop services, remove volume, restart
docker compose -f config/docker-compose.yml down -v
docker compose -f config/docker-compose.yml up -d
```

### Run Migrations

```bash
# Copy migration to init folder and rebuild
docker compose -f config/docker-compose.yml down
docker compose -f config/docker-compose.yml up -d

# Or run directly
docker exec -i hr-db-1 psql -U hr -d hrcore < db/init/new_migration.sql
```

### Install New Dependencies

```bash
# API
cd api
npm install new-package
docker compose -f config/docker-compose.yml build api
docker compose -f config/docker-compose.yml up -d api

# Web
cd web
npm install new-package
docker compose -f config/docker-compose.yml build web
docker compose -f config/docker-compose.yml up -d web
```

### Run Tests

```bash
# API tests
cd api
npm test

# Web tests
cd web
npm test

# Integration tests
cd tests
node comprehensive-test.js
```

## Troubleshooting

### Container won't start

Check logs:

```bash
docker compose -f config/docker-compose.yml logs api
```

Common issues:
- Port already in use: Stop other services or change ports
- Database not ready: Wait and restart API

### Database connection refused

1. Check database is running:
   ```bash
   docker compose -f config/docker-compose.yml ps db
   ```
2. Check connection string in environment
3. Try connecting directly:
   ```bash
   docker exec -it hr-db-1 psql -U hr -d hrcore
   ```

### Frontend can't reach API

1. Check API is running and healthy:
   ```bash
   curl http://localhost:8080/health
   ```
2. Check CORS configuration
3. Check VITE_API_URL environment variable

### Changes not reflected

- Frontend: Should hot reload automatically. Try hard refresh.
- Backend: Restart the api container.
- Database: Run migrations manually.

## Environment Variables

### API

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | - | PostgreSQL connection string |
| PORT | 8080 | API server port |
| NODE_ENV | development | Environment |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:8080 | API URL |

---

*Last verified: January 2026*
