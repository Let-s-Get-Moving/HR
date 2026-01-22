# Deployment Guide

> **Source**: `config/render.yaml`

This document covers deploying the HR system to production on Render.

## Architecture on Render

```
┌─────────────────────────────────────────┐
│              Render.com                  │
│  ┌─────────────────────────────────┐    │
│  │     Static Site (Frontend)       │    │
│  │     https://hr.onrender.com      │    │
│  └─────────────────────────────────┘    │
│                  │                       │
│                  │ API calls             │
│                  ▼                       │
│  ┌─────────────────────────────────┐    │
│  │     Web Service (API)            │    │
│  │     https://api-hr.onrender.com  │    │
│  └─────────────────────────────────┘    │
│                  │                       │
│                  │ SQL                   │
│                  ▼                       │
│  ┌─────────────────────────────────┐    │
│  │     PostgreSQL (Managed)         │    │
│  │     Internal connection          │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Render Configuration

### render.yaml

```yaml
services:
  # API Service
  - type: web
    name: api-hr
    env: node
    buildCommand: cd api && npm install
    startCommand: cd api && npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: hrcore
          property: connectionString
      - key: NODE_ENV
        value: production

  # Frontend Static Site
  - type: web
    name: hr-frontend
    env: static
    buildCommand: cd web && npm install && npm run build
    staticPublishPath: web/dist
    envVars:
      - key: VITE_API_URL
        value: https://api-hr.onrender.com

databases:
  - name: hrcore
    plan: starter
```

## Deployment Steps

### Initial Setup

1. **Create Render account** at render.com

2. **Connect GitHub repository**

3. **Create PostgreSQL database**
   - Name: hrcore
   - Plan: Starter (or higher)
   - Note the internal connection string

4. **Create Web Service (API)**
   - Connect to your repo
   - Root directory: (leave empty)
   - Build command: `cd api && npm install`
   - Start command: `cd api && npm start`
   - Add environment variables:
     - `DATABASE_URL`: (from database)
     - `NODE_ENV`: production

5. **Create Static Site (Frontend)**
   - Connect to your repo
   - Root directory: (leave empty)
   - Build command: `cd web && npm install && npm run build`
   - Publish directory: `web/dist`
   - Add environment variables:
     - `VITE_API_URL`: https://api-hr.onrender.com

### Subsequent Deployments

Push to the connected branch (usually `main`). Render auto-deploys.

```bash
git push origin main
# Render detects changes and deploys automatically
```

### Manual Deploy

1. Go to Render dashboard
2. Select the service
3. Click "Manual Deploy" → "Deploy latest commit"

## Environment Variables

### API Service

| Variable | Value | Required |
|----------|-------|----------|
| DATABASE_URL | (from database) | Yes |
| NODE_ENV | production | Yes |
| SESSION_SECRET | (generate random) | Recommended |

### Frontend

| Variable | Value | Required |
|----------|-------|----------|
| VITE_API_URL | https://api-hr.onrender.com | Yes |

## Database Migrations

### Option 1: Via psql

```bash
# Get connection string from Render dashboard
export DATABASE_URL="postgresql://user:pass@host:port/dbname?sslmode=require"

# Run migration
psql $DATABASE_URL < db/init/060_new_feature.sql
```

### Option 2: Via API endpoint

```bash
curl -X POST https://api-hr.onrender.com/api/migrate-db
```

### Option 3: Via Render shell

1. Go to API service in Render dashboard
2. Click "Shell"
3. Run: `node deploy-migrations.js`

## Monitoring

### Logs

- Go to service in Render dashboard
- Click "Logs" tab
- Use filters and search

### Health Check

```bash
curl https://api-hr.onrender.com/health
```

### Database

- Go to database in Render dashboard
- View metrics, connections, storage

## Troubleshooting

### Deploy fails

1. Check build logs in Render dashboard
2. Common issues:
   - Missing dependencies in package.json
   - Build script errors
   - Environment variables not set

### API 502 errors

1. Check API logs
2. Verify DATABASE_URL is correct
3. Check if database is accessible
4. Verify API starts without errors locally

### Database connection issues

1. Verify connection string format
2. Include `?sslmode=require` for external connections
3. Check if IP is whitelisted (if applicable)

### Frontend can't reach API

1. Check VITE_API_URL is set correctly
2. Verify CORS allows the frontend domain
3. Check API is running and healthy

## Scaling

### Horizontal Scaling

In Render dashboard:
1. Go to service settings
2. Increase instance count

### Vertical Scaling

Change plan:
- Starter: 512MB RAM
- Standard: 2GB RAM
- Pro: 4GB+ RAM

### Database Scaling

Upgrade database plan for:
- More storage
- More connections
- Better performance

## Backups

### Database Backups

Render provides automatic daily backups for paid database plans.

Manual backup:

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql $DATABASE_URL < backup_20260122.sql
```

## Security Checklist

Before going live:

- [ ] Change default admin password
- [ ] Set strong SESSION_SECRET
- [ ] Verify HTTPS is enforced
- [ ] Check CORS configuration
- [ ] Enable rate limiting
- [ ] Review environment variables for secrets
- [ ] Test authentication flow
- [ ] Verify role-based access works

---

*Last verified: January 2026*
