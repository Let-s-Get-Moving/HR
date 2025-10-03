# Debug & Performance Tools for Render Postgres

This guide helps diagnose and fix "Schrödinger's data" issues (data appears/disappears) and performance problems in the HR system running on Render.

## 🎯 What This Solves

1. **Data visibility issues** - Uploads succeed but data doesn't appear in UI
2. **Database connection confusion** - Are we hitting the right database?
3. **Replica lag** - Read replicas showing stale data
4. **Filter mismatches** - Unicode dashes, spaces, quotes causing silent failures
5. **Performance bottlenecks** - Slow queries without visibility into why

## 🔧 Setup

### 1. Add Environment Variables in Render

Go to your Render service → Environment → Add the following:

```bash
DEBUG_DATA_DRIFT=true           # Enable debug endpoints
DEBUG_TOKEN=<generate_a_long_random_string>  # curl -s https://www.random.org/strings/?num=1&len=32&format=plain
FORCE_PRIMARY_READS=true        # Start with true to eliminate replica lag
```

**Generate a secure token:**
```bash
# On Mac/Linux:
openssl rand -base64 32

# Or use:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Apply Database Migrations

The normalization function and indexes need to be applied to your Render Postgres database:

```bash
# From the project root, run:
cd api
node scripts/apply-debug-migrations.js
```

This will apply:
- `db/init/36_normalization_function.sql` - The `app_norm()` function
- `db/init/37_performance_indexes.sql` - Performance indexes

Or apply manually via Render Dashboard:
1. Go to your Postgres service → "Connect" → Internal Database URL
2. Use `psql` to connect and paste the SQL from those files

### 3. Deploy Your Service

After adding env vars and deploying:
```bash
git add .
git commit -m "feat(debug): Add Render Postgres diagnostics & performance tools"
git push origin main
```

Render will auto-deploy. Wait for deployment to complete (~2-3 minutes).

## 🧪 Testing on Render

Replace `<YOUR_SERVICE>` with your actual Render service URL and `<YOUR_TOKEN>` with your `DEBUG_TOKEN`.

```bash
# Set these for convenience:
export SERVICE_URL="https://hr-api.onrender.com"  # Your actual URL
export DEBUG_TOKEN="your_debug_token_here"
export AUTH="Authorization: Bearer $DEBUG_TOKEN"
```

### Test 1: DB Passport (Verify Connection Identity)

**What it does:** Shows which database/host you're actually connected to.

```bash
curl -sS -H "$AUTH" "$SERVICE_URL/debug/db-passport" | jq
```

**Expected output:**
```json
{
  "write": {
    "database": "hrcore_42l4",
    "host": "10.x.x.x",
    "port": 5432,
    "pg_version": "PostgreSQL 15.3",
    "db_now": "2025-10-03T...",
    "app_time": "2025-10-03T...",
    "force_primary_reads": "true",
    "database_url_host": "dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com"
  },
  "read": { ... },
  "same_database": true
}
```

✅ **Success criteria:**
- `write.database` and `read.database` are the same
- `same_database` is `true`
- `database_url_host` matches your Render Postgres hostname

### Test 2: Admin Probe (Insert + Read Test)

**What it does:** Inserts 5 test rows on the write pool, then reads them back on the read pool.

```bash
curl -sS -X POST -H "$AUTH" "$SERVICE_URL/admin/probe" | jq
```

**Expected output:**
```json
{
  "success": true,
  "upload_id": "debug_probe_lx3k5_a1b2c3",
  "sql_count": 5,
  "expected": 5,
  "db_write": {
    "database": "hrcore_42l4",
    "host": "10.x.x.x",
    "port": 5432
  },
  "db_read": {
    "database": "hrcore_42l4",
    "host": "10.x.x.x",
    "port": 5432
  },
  "force_primary_reads": "true"
}
```

✅ **Success criteria:**
- `success` is `true`
- `sql_count` equals `5`
- `db_write` and `db_read` point to the same database

❌ **If sql_count < 5:**
- You have replica lag or a transaction commit issue
- Keep `FORCE_PRIMARY_READS=true`
- Check your ingestion code for missing `COMMIT` statements

### Test 3: SQL Count (Verify Specific Upload)

**What it does:** Counts rows for a specific `upload_id` (use one from the probe or a real upload).

```bash
# Use the upload_id from the probe test above:
UPLOAD_ID="debug_probe_lx3k5_a1b2c3"  # Replace with actual ID
curl -sS -H "$AUTH" "$SERVICE_URL/debug/sql-count?upload_id=$UPLOAD_ID" | jq
```

**Expected output:**
```json
{
  "upload_id": "debug_probe_lx3k5_a1b2c3",
  "count": 5,
  "timestamp": "2025-10-03T..."
}
```

✅ **Success criteria:**
- `count` matches expected number of rows

### Test 4: EXPLAIN Plans (Performance Analysis)

**What it does:** Shows the query execution plan for pre-registered slow queries.

```bash
# List available queries:
curl -sS -H "$AUTH" "$SERVICE_URL/debug/query-registry" | jq

# Get EXPLAIN plan for a specific query:
curl -sS -H "$AUTH" "$SERVICE_URL/debug/explain/timecardsByGroupAndRange?p1=HR%20-%20West&p2=2025-09-01&p3=2025-10-01"
```

**Expected output:**
```
Limit  (cost=... rows=...)
  -> Index Scan using idx_timecards_group_norm_period on timecards (cost=...)
        Index Cond: ((app_norm(group_name) = 'hr-west') AND ...)
        Buffers: shared hit=42
```

✅ **Success criteria:**
- Should show "Index Scan" not "Seq Scan" for large tables
- `cost` should be reasonable (< 1000 for common queries)
- If you see "Seq Scan", you need more indexes

## 📊 Performance Monitoring

### Query Timing Logs

When `DEBUG_DATA_DRIFT=true`, every query logs timing info:

```json
{"kind":"sql","ms":"12.3","rows":42,"shape":"text,timestamp,timestamp","meta":{"op":"timecard_fetch"}}
```

Monitor your Render logs for slow queries (> 500ms).

### Check Applied Indexes

After applying the index migration, verify they exist:

```bash
# Connect to your Render Postgres via psql, then:
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

### Find Unused Indexes

After running in production for a while:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,  -- Number of times used
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

Drop unused indexes to save space and improve write performance.

## 🔍 Debugging Data Visibility Issues

### Issue: Upload succeeds but UI shows "No data"

**Diagnosis steps:**

1. **Check upload endpoint returns success:**
   ```bash
   # Your upload should return an upload_id
   # Example: { "success": true, "upload_id": "abc123", "count": 50 }
   ```

2. **Verify SQL count matches:**
   ```bash
   curl -sS -H "$AUTH" "$SERVICE_URL/debug/sql-count?upload_id=abc123" | jq
   # Should return: { "count": 50 }
   ```

3. **If count is 0:**
   - Transaction was rolled back (add explicit `COMMIT`)
   - Writing to wrong database (check `/debug/db-passport`)
   - Filter mismatch (see normalization section below)

4. **If count is correct but UI shows nothing:**
   - Frontend not refetching after upload
   - Filter mismatch (Unicode dashes, spaces, quotes)
   - Date range filter excluding data

### Issue: Data appears, then disappears

**Likely causes:**

1. **Replica lag** (if `FORCE_PRIMARY_READS=false`)
   - Solution: Set `FORCE_PRIMARY_READS=true`

2. **Long-running transaction not committed**
   - Check your ingestion code for `BEGIN` without `COMMIT`
   - Keep transactions short (< 5 seconds)

3. **Filter normalization needed**
   - User types "HR – West" (en dash)
   - Database has "HR - West" (hyphen)
   - They don't match! → Use `app_norm()` in WHERE clauses

## 🔠 Text Normalization

### The Problem

These all look the same to humans but are different to Postgres:
```
"HR - West"   (ASCII hyphen, regular space)
"HR – West"   (Unicode en dash U+2013)
"HR—West"     (Unicode em dash U+2014)
"HR -West"    (different spacing)
"hr-west"     (different case)
```

### The Solution: `app_norm()`

The `app_norm()` function normalizes all variations:

```sql
SELECT app_norm('HR – West');  -- Returns: 'hr-west'
SELECT app_norm('HR - West');  -- Returns: 'hr-west'
SELECT app_norm('hr-west');    -- Returns: 'hr-west'
```

### Usage in Queries

**❌ Before (breaks on Unicode differences):**
```javascript
const { rows } = await pool.query(
  `SELECT * FROM timecards WHERE group_name = $1`,
  [groupName]
);
```

**✅ After (handles all variations):**
```javascript
import { timedQuery, readerPool } from '../db/pools.js';

const { rows } = await timedQuery(
  readerPool(),
  `SELECT * FROM timecards WHERE app_norm(group_name) = app_norm($1)`,
  [groupName],
  { op: 'fetch_timecards', group: groupName }
);
```

### Optional: Generated Columns (Faster)

For frequently-filtered columns, add a normalized generated column:

```sql
ALTER TABLE timecards 
ADD COLUMN group_norm text 
GENERATED ALWAYS AS (app_norm(group_name)) STORED;

CREATE INDEX idx_timecards_group_norm ON timecards (group_norm);
```

Then query becomes:
```sql
WHERE group_norm = app_norm($1)  -- Uses the index!
```

## 🚀 Transaction Best Practices

### ❌ Bad: Long transaction

```javascript
const client = await pool.connect();
await client.query('BEGIN');
// ... lots of work ...
await client.query('INSERT ...');  // Hours later
await client.query('COMMIT');  // Finally!
client.release();
```

**Problems:**
- Holds locks for hours
- Other queries blocked
- Data invisible to other connections

### ✅ Good: Short, explicit transaction

```javascript
import { primaryPool } from '../db/pools.js';

async function ingestRows(rows, uploadId) {
  const client = await primaryPool.connect();
  try {
    await client.query('BEGIN');
    
    // Batch inserts (keep < 5 seconds total)
    for (const row of rows) {
      await client.query(
        `INSERT INTO timecards (upload_id, employee_id, hours) 
         VALUES ($1, $2, $3)
         ON CONFLICT (upload_id, employee_id) DO UPDATE SET hours = EXCLUDED.hours`,
        [uploadId, row.employee_id, row.hours]
      );
    }
    
    await client.query('COMMIT');  // Make visible immediately!
    return { success: true, count: rows.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();  // Return connection to pool
  }
}
```

## 🎛️ Configuration Tuning

### When to use `FORCE_PRIMARY_READS=true`

**Enable (true) when:**
- You don't have a read replica
- Replica lag is causing data visibility issues
- Debugging data disappearance issues
- Small to medium traffic (< 1000 req/min)

**Disable (false) when:**
- You have a read replica with < 1 second lag
- High read traffic needs to be distributed
- All visibility issues are resolved

### When to use `DEBUG_DATA_DRIFT=true`

**Enable (true) when:**
- Actively debugging data issues
- Need query timing logs
- Testing new features

**Disable (false) when:**
- Production (adds ~5-10ms per query for logging)
- Logs are too noisy
- Issue is resolved

## 📝 Troubleshooting

### "Debug mode disabled" error

**Problem:** `DEBUG_DATA_DRIFT` is not set or is `false`.

**Solution:**
```bash
# In Render dashboard → Environment:
DEBUG_DATA_DRIFT=true
```

### "Invalid debug token" error

**Problem:** `DEBUG_TOKEN` doesn't match or isn't set.

**Solution:**
```bash
# Generate a new token:
openssl rand -base64 32

# Add to Render → Environment:
DEBUG_TOKEN=<your_generated_token>

# Use in requests:
curl -H "Authorization: Bearer <your_generated_token>" ...
```

### "connection failed" in db-passport

**Problem:** Database connection string is invalid.

**Solution:**
1. Check `DATABASE_URL` in Render dashboard
2. Should look like: `postgresql://user:pass@host.render.com/dbname`
3. Verify host is reachable: `ping host.render.com`

### EXPLAIN returns empty plan

**Problem:** Query key doesn't exist or table doesn't have data.

**Solution:**
```bash
# List available queries:
curl -H "$AUTH" "$SERVICE_URL/debug/query-registry" | jq

# Make sure you're using a valid key
```

## 🔒 Security Notes

1. **Never expose DEBUG_TOKEN** - It's as sensitive as a database password
2. **Disable debug endpoints in production** - Set `DEBUG_DATA_DRIFT=false` once issues are resolved
3. **Rotate DEBUG_TOKEN periodically** - Generate a new one every few months
4. **Monitor failed auth attempts** - Check logs for `debug_auth_fail` security events
5. **Use HTTPS only** - Render provides this by default

## 📚 Related Files

- `/api/src/db/pools.js` - Primary/replica pool management with timing
- `/api/src/db/passport.js` - Connection identity verification
- `/api/src/debug/queryRegistry.js` - Pre-registered queries for EXPLAIN
- `/api/src/server.js` - Debug endpoint implementations
- `/db/init/36_normalization_function.sql` - `app_norm()` SQL function
- `/db/init/37_performance_indexes.sql` - Performance indexes

## 🎓 Learning Resources

- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Render Postgres Docs](https://render.com/docs/databases)
- [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

---

**Need help?** Check the logs in Render dashboard → your service → Logs tab. Look for entries with `"kind":"sql"` or `"kind":"sql_error"`.

