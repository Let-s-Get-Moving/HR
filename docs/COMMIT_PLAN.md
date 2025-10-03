# Commit Plan: Render Postgres Data Visibility & Performance Fix

This document outlines the commit strategy for implementing database visibility fixes and performance improvements.

## 🎯 Goal

Fix "Schrödinger's data" issues (data appears/disappears), prove we're hitting the right database, and add performance instrumentation for the HR system deployed on Render.

## 📋 Commit Sequence

### Commit 1: Database pools with primary/replica support
```bash
git add api/src/db/pools.js
git commit -m "feat(db): add render-safe pg pools with primary/replica routing and timing

- Add primaryPool and replicaPool with SSL enforcement
- Add readerPool() function to choose correct read pool
- Add timedQuery() for performance logging (when DEBUG_DATA_DRIFT=true)
- Support FORCE_PRIMARY_READS env var to eliminate replica lag
- Configurable connection timeouts and pool sizes
- All pools auto-detect Render and enable SSL"
```

### Commit 2: Database passport for connection verification
```bash
git add api/src/db/passport.js
git commit -m "feat(debug): add db passport helper for connection identity verification

- dbPassport() returns current database, host, port, user, version
- Shows app time vs db time for clock skew detection
- Includes force_primary_reads status
- Displays connection URL host for debugging
- Used by /debug/db-passport endpoint"
```

### Commit 3: Debug endpoints (token-guarded)
```bash
git add api/src/server.js
git commit -m "feat(debug): add token-guarded debug endpoints for data visibility testing

- GET /debug/db-passport - verify database connection identity
- POST /admin/probe - one-shot insert+read test (5 rows)
- GET /debug/sql-count?upload_id=X - count rows by upload_id
- GET /debug/explain/:key - safe EXPLAIN for pre-registered queries
- GET /debug/query-registry - list available explain queries
- All endpoints require DEBUG_TOKEN in Authorization header
- Only active when DEBUG_DATA_DRIFT=true
- Includes security event logging for failed auth attempts"
```

### Commit 4: Query registry for safe EXPLAIN
```bash
git add api/src/debug/queryRegistry.js
git commit -m "feat(debug): add query registry for safe EXPLAIN analysis

- Pre-registered queries: timecards, commissions, payroll, employees
- Prevents SQL injection (no raw user input)
- Each query has description and param documentation
- listQueryKeys() helper for discovery
- Used by /debug/explain/:key endpoint"
```

### Commit 5: Normalization SQL function
```bash
git add db/init/36_normalization_function.sql
git commit -m "feat(sql): add app_norm() function for text normalization

- Normalizes Unicode dashes (en dash, em dash) to ASCII hyphen
- Normalizes curly quotes to straight quotes
- Lowercases and trims whitespace
- Handles null input gracefully
- IMMUTABLE and PARALLEL SAFE for index usage
- Fixes 'HR – West' vs 'HR - West' filter mismatches
- Commented examples for generated columns (optional optimization)"
```

### Commit 6: Performance indexes
```bash
git add db/init/37_performance_indexes.sql
git commit -m "perf(sql): add performance indexes for common query patterns

- Date range indexes: payroll, timecards (period_start, period_end)
- Employee lookup indexes: employee_id on payroll/timecards/commissions
- Composite indexes: employee + date for common dashboard queries
- Trigram indexes: fuzzy name search on employees (first_name, last_name)
- Upload tracking: upload_id indexes on timecards/commissions
- Unique index: employees.email (case-insensitive)
- Status filters: employees.status
- All indexes use CONCURRENTLY to avoid locking
- Partial indexes (WHERE clauses) to reduce size
- probe_table for debug endpoint testing
- Includes index monitoring queries in comments"
```

### Commit 7: Migration script
```bash
git add api/scripts/apply-debug-migrations.js
git chmod +x api/scripts/apply-debug-migrations.js
git commit -m "feat(scripts): add migration script for debug/performance updates

- Applies 36_normalization_function.sql and 37_performance_indexes.sql
- Shows timing and success/failure for each migration
- Verifies app_norm() function works after installation
- Counts created indexes for confirmation
- Graceful error handling with detailed output
- Exits with non-zero code on failure for CI/CD"
```

### Commit 8: Query helpers and migration guide
```bash
git add api/src/utils/queryHelpers.js
git commit -m "feat(utils): add query helpers and migration guide for new pool system

- fetchTimecardsByGroup(): normalized group filter example
- searchEmployeesByName(): trigram fuzzy search example
- insertTimecards(): explicit transaction pattern
- fetchPayrollByPeriod(): date range with optional group filter
- verifyUploadVisibility(): confirm data after ingestion
- buildNormalizedFilter(): SQL injection-safe WHERE builder
- Includes MIGRATION_CHECKLIST with step-by-step guide
- Documents old vs new query patterns"
```

### Commit 9: Debug documentation
```bash
git add README_DEBUG.md
git commit -m "docs: add comprehensive debug guide for Render Postgres issues

- Setup instructions for environment variables
- curl test commands for all debug endpoints
- Troubleshooting guide for data visibility issues
- Text normalization examples and usage patterns
- Transaction best practices with code examples
- Configuration tuning recommendations
- Performance monitoring queries
- Security notes and best practices
- Related files reference"
```

### Commit 10: Update main README (optional)
```bash
git add README.md
git commit -m "docs: update README with debug and performance features

- Link to README_DEBUG.md
- Document new environment variables
- Add troubleshooting section reference
- Note performance improvements"
```

## 🚀 Push and Deploy

After all commits:

```bash
# Review all changes
git log --oneline -10

# Push to remote
git push origin main

# Render will auto-deploy
# Watch logs in Render dashboard
```

## ✅ Post-Deploy Verification

After Render deploys (2-3 minutes):

```bash
export SERVICE_URL="https://your-service.onrender.com"
export DEBUG_TOKEN="your_debug_token"
export AUTH="Authorization: Bearer $DEBUG_TOKEN"

# 1. Verify DB connection
curl -sS -H "$AUTH" "$SERVICE_URL/debug/db-passport" | jq

# 2. Run probe test
curl -sS -X POST -H "$AUTH" "$SERVICE_URL/admin/probe" | jq

# 3. Check for sql_count = 5
# If not 5, check logs for transaction/commit issues
```

## 📝 Alternative: Squash Commits

If you prefer a single commit for cleaner history:

```bash
# After making all changes:
git add api/src/db/ api/src/debug/ api/src/utils/queryHelpers.js api/scripts/apply-debug-migrations.js db/init/36_*.sql db/init/37_*.sql README_DEBUG.md COMMIT_PLAN.md api/src/server.js

git commit -m "feat: add render postgres data visibility and performance fixes

Implements comprehensive solution for 'Schrödinger's data' issues:

Database pools & routing:
- Primary/replica pool management with SSL
- timedQuery() with performance logging
- FORCE_PRIMARY_READS env var support

Debug endpoints (token-guarded):
- /debug/db-passport - connection identity
- /admin/probe - insert+read test
- /debug/sql-count - upload verification
- /debug/explain/:key - safe query plans
- /debug/query-registry - available queries

Performance improvements:
- app_norm() SQL function for text normalization
- Indexes for date ranges, employee lookups, fuzzy search
- Trigram extension for ILIKE optimization
- Composite indexes for common query patterns

Developer tools:
- Migration script (apply-debug-migrations.js)
- Query helpers with examples
- Comprehensive debug documentation

Fixes:
- Unicode dash/quote mismatches in filters
- Replica lag visibility issues
- Missing transaction commits
- Slow queries without instrumentation
- No visibility into which DB is being hit

Environment variables:
- DEBUG_DATA_DRIFT=true (enable debug endpoints)
- DEBUG_TOKEN=<token> (protect debug endpoints)
- FORCE_PRIMARY_READS=true (eliminate replica lag)

See README_DEBUG.md for complete usage guide."
```

## 🔄 Rollback Plan

If issues arise after deployment:

```bash
# Option 1: Revert the commits
git revert HEAD~9..HEAD  # Revert last 9 commits
git push origin main

# Option 2: Disable debug mode (leaves indexes in place)
# In Render dashboard → Environment:
DEBUG_DATA_DRIFT=false

# Option 3: Remove specific indexes (if causing issues)
# Connect via psql and:
DROP INDEX CONCURRENTLY IF EXISTS idx_name;
```

## 📊 Success Metrics

After deployment, verify:

1. ✅ `/debug/db-passport` returns same database for read/write
2. ✅ `/admin/probe` returns `sql_count: 5`
3. ✅ Real uploads visible immediately (no "flicker")
4. ✅ Query logs show timing info
5. ✅ Slow queries use indexes (check with `/debug/explain/...`)
6. ✅ No regression in existing functionality

## 🎓 Commit Message Convention

Following conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `perf:` - Performance improvement
- `docs:` - Documentation only
- `refactor:` - Code restructure, no behavior change
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks

Scope examples:
- `(db)` - Database layer
- `(sql)` - SQL migrations/queries
- `(debug)` - Debug tools
- `(utils)` - Utility functions
- `(scripts)` - Scripts/tooling
- `(docs)` - Documentation

---

**Ready to commit?** Follow the sequence above or use the squash commit approach. Either way, test thoroughly on Render after deployment!

