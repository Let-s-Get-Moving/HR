# Database Migrations

This document covers how to create and run database migrations.

## Migration File Conventions

### Naming

Files in `db/init/` are executed in alphanumeric order:

```
001_schema.sql           # First - core tables
002_seed.sql             # Second - seed data
...
050_payroll_rework.sql   # Later - feature additions
```

Use numbered prefixes to control execution order. Leave gaps for future insertions.

### Structure

```sql
-- Migration: 060_new_feature.sql
-- Description: Add new feature tables
-- Author: Your Name
-- Date: 2026-01-22

-- Check if already applied (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'new_table') THEN
        CREATE TABLE new_table (...);
    END IF;
END $$;

-- Add columns safely
ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_table_field ON new_table(field);
```

### Idempotency

Migrations MUST be idempotent (safe to run multiple times):

```sql
-- Good: Checks before creating
CREATE TABLE IF NOT EXISTS my_table (...);
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS my_column TEXT;
CREATE INDEX IF NOT EXISTS idx_my_table ON my_table(field);

-- Bad: Will fail if already exists
CREATE TABLE my_table (...);
ALTER TABLE my_table ADD COLUMN my_column TEXT;
```

## Running Migrations

### Local Development

Migrations run automatically when the database container starts for the first time. The `db/init/` folder is mounted as `/docker-entrypoint-initdb.d/`.

```bash
# Start fresh (runs all migrations)
docker compose -f config/docker-compose.yml down -v
docker compose -f config/docker-compose.yml up -d
```

To run a new migration on existing data:

```bash
# Option 1: Via docker exec
docker exec -i hr-db-1 psql -U hr -d hrcore < db/init/060_new_feature.sql

# Option 2: Connect directly
psql postgresql://hr:hrpass@localhost:5432/hrcore < db/init/060_new_feature.sql
```

### Production (Render)

Option 1: Direct SQL

```bash
export DATABASE_URL="postgresql://user:pass@host:port/dbname"
psql $DATABASE_URL < db/init/060_new_feature.sql
```

Option 2: API endpoint (requires auth)

```bash
curl -X POST https://api.example.com/api/migrate-db
```

Option 3: Migration script

```bash
cd api
node deploy-migrations.js
```

## Creating New Migrations

### 1. Create the SQL file

```bash
touch db/init/060_new_feature.sql
```

### 2. Write idempotent SQL

```sql
-- Migration: 060_new_feature.sql
-- Description: Add new feature
-- Date: 2026-01-22

-- New table
CREATE TABLE IF NOT EXISTS new_feature (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New column on existing table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS new_field TEXT;

-- New index
CREATE INDEX IF NOT EXISTS idx_new_feature_name ON new_feature(name);
```

### 3. Test locally

```bash
# Apply to local database
docker exec -i hr-db-1 psql -U hr -d hrcore < db/init/060_new_feature.sql

# Verify
docker exec -i hr-db-1 psql -U hr -d hrcore -c "\d new_feature"
```

### 4. Commit and deploy

```bash
git add db/init/060_new_feature.sql
git commit -m "feat: add new_feature table"
git push
```

Then apply to production.

## Common Migration Patterns

### Add a new table

```sql
CREATE TABLE IF NOT EXISTS widgets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    employee_id INTEGER REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_widgets_employee ON widgets(employee_id);
CREATE INDEX IF NOT EXISTS idx_widgets_status ON widgets(status);
```

### Add a column

```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
```

### Add a column with default

```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
```

### Rename a column

```sql
-- Check if old name exists before renaming
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'old_name'
    ) THEN
        ALTER TABLE employees RENAME COLUMN old_name TO new_name;
    END IF;
END $$;
```

### Add a foreign key

```sql
ALTER TABLE widgets 
ADD CONSTRAINT IF NOT EXISTS fk_widgets_employee 
FOREIGN KEY (employee_id) REFERENCES employees(id);
```

### Create an enum type

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
        CREATE TYPE status_enum AS ENUM ('draft', 'pending', 'approved', 'rejected');
    END IF;
END $$;
```

### Add a trigger

```sql
-- Create function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to ensure idempotency)
DROP TRIGGER IF EXISTS trigger_update_timestamp ON widgets;
CREATE TRIGGER trigger_update_timestamp
    BEFORE UPDATE ON widgets
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

## Rollback Strategy

PostgreSQL doesn't have built-in migration rollback. Options:

### 1. Restore from backup

```bash
# Before migration
pg_dump $DATABASE_URL > pre_migration_backup.sql

# After failed migration
psql $DATABASE_URL < pre_migration_backup.sql
```

### 2. Write reverse migration

```sql
-- Migration: 060_new_feature.sql
CREATE TABLE IF NOT EXISTS new_feature (...);

-- Rollback: 060_new_feature_rollback.sql
DROP TABLE IF EXISTS new_feature;
```

### 3. Forward-fix

Often easier to fix issues with another migration than to rollback.

## Troubleshooting

### Migration fails: table already exists

Your migration isn't idempotent. Use `IF NOT EXISTS`:

```sql
CREATE TABLE IF NOT EXISTS my_table (...);
```

### Migration fails: column already exists

Use `IF NOT EXISTS`:

```sql
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS my_column TEXT;
```

### Migration fails: constraint violation

Data doesn't meet new constraint. Options:
1. Clean up data first
2. Add constraint without validation: `NOT VALID`
3. Make constraint permissive initially

### Need to check current schema

```bash
# List tables
psql $DATABASE_URL -c "\dt"

# Describe table
psql $DATABASE_URL -c "\d employees"

# List indexes
psql $DATABASE_URL -c "\di"
```

---

*Last verified: January 2026*
