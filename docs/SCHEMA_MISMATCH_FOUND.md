# 🔍 Schema Mismatch Diagnosis Results

**Date**: October 3, 2025  
**Issue**: Commissions/Hourly Payouts not showing after upload  
**Root Cause**: **SCHEMA MISMATCH** between code and database

---

## 🎯 The Problem

Your `hourly_payout` table schema has evolved through 3 migrations, but your **Render database might not have the latest schema applied**.

### Schema Evolution Timeline

| Migration | Date | Schema | Status |
|-----------|------|--------|--------|
| 025_commission_import_schema.sql | Sep 29 | `period_label TEXT` | ❌ OLD |
| 027_restructure_hourly_payout.sql | Sep 30 | Added `date_periods JSONB` | ⚠️ INCOMPLETE |
| **038_rebuild_hourly_payout_table.sql** | Oct 2 | **COMPLETE REBUILD** | ✅ CORRECT |

---

## 🔬 What the Diagnosis Found

### Your Code Expects (from `commissionImporter.js` line 575):
```sql
INSERT INTO hourly_payout (
    employee_id, 
    period_month, 
    name_raw, 
    date_periods,      -- ← JSONB column
    total_for_month,
    source_file, 
    sheet_name, 
    created_at, 
    updated_at
) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, ...)
```

### Your API Reads (from `commissions.js` line 287):
```sql
SELECT 
    hp.date_periods,     -- ← JSONB column
    hp.total_for_month,
    hp.name_raw,
    ...
FROM hourly_payout hp
```

### But If Render Has Old Schema (025):
```sql
CREATE TABLE hourly_payout (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    period_month DATE NOT NULL,
    period_label TEXT NOT NULL,    -- ← WRONG! Code expects date_periods
    amount NUMERIC(14,2),
    ...
    CONSTRAINT uq_hourly_payout_period 
        UNIQUE (employee_id, period_month, period_label)  -- ← WRONG constraint
);
```

---

## 💥 Why This Breaks

### Scenario 1: Old Schema (025) on Render
- **Insert fails**: Column `date_periods` doesn't exist
- **Transaction rollbacks**: All data is lost
- **Upload appears to succeed**: But data never commits
- **API query fails**: Column `date_periods` doesn't exist
- **Result**: "No data found" even after upload

### Scenario 2: Partial Schema (027) on Render
- **Insert might succeed**: If `date_periods` was added
- **But**: Old `period_label` constraint still exists
- **Constraint violation**: Can't have multiple rows per month
- **Result**: Only first upload succeeds, later uploads fail silently

### Scenario 3: Correct Schema (038) on Render
- ✅ **Insert succeeds**: Column exists and is JSONB
- ✅ **Unique constraint correct**: One row per name per month
- ✅ **API query succeeds**: Reads the right column
- ✅ **Result**: Data shows up immediately

---

## 🔍 Run The Diagnostic

To check which schema your Render database has:

```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4"

# Run the diagnostic
cd /Users/admin/Documents/GitHub/HR
node scripts/diagnose-hourly-payout-schema.js
```

### What It Checks

1. ✅ Does `hourly_payout` table exist?
2. 📋 What columns does it have?
3. 🔍 Does it have `date_periods` (JSONB) or `period_label` (TEXT)?
4. 📊 How many rows are in the table?
5. 🔗 How many rows have `employee_id` links?
6. 📑 What indexes and constraints exist?

---

## 🔧 The Fix

### If Diagnostic Shows OLD Schema:

```bash
# Option 1: Via psql (recommended)
psql $DATABASE_URL < db/init/038_rebuild_hourly_payout_table.sql

# Option 2: Via Render Dashboard
# 1. Go to your Postgres service → "Connect"
# 2. Copy the "Internal Database URL"
# 3. Use Web Shell or psql to run:
#    \i db/init/038_rebuild_hourly_payout_table.sql
```

⚠️ **WARNING**: This will **DROP** the existing `hourly_payout` table and recreate it. Any existing data will be lost. Re-upload commission files after migration.

### If Diagnostic Shows CORRECT Schema:

Then the schema is not the issue. The problem is likely:
1. **Replica lag** - Set `FORCE_PRIMARY_READS=true`
2. **Missing EXPLAIN** - Use debug tools to check query plans
3. **Filter mismatch** - Use `app_norm()` for text filters

---

## 📊 Expected Diagnostic Output

### ✅ GOOD (Schema 038 Applied):
```
✅ Table hourly_payout exists
   date_periods (JSONB): ✅ EXISTS
   period_label (TEXT):  ✅ Not present
   name_raw (TEXT):      ✅ EXISTS

📊 DIAGNOSIS SUMMARY
✅ Schema is CORRECT (migration 038 applied)
```

### ❌ BAD (Old Schema):
```
✅ Table hourly_payout exists
   date_periods (JSONB): ❌ MISSING
   period_label (TEXT):  ⚠️ EXISTS (OLD SCHEMA)
   name_raw (TEXT):      ❌ MISSING

📊 DIAGNOSIS SUMMARY
❌ Schema is INCORRECT (needs migration 038)
   (Table has period_label - this is the OLD schema from migration 025)
```

---

## 🧪 Test After Fix

1. **Run diagnostic again**:
   ```bash
   node scripts/diagnose-hourly-payout-schema.js
   ```
   Should show: ✅ Schema is CORRECT

2. **Re-upload commission file** via your UI

3. **Check if data appears**:
   ```bash
   # Use debug endpoint
   export SERVICE_URL="https://your-hr-app.onrender.com"
   export DEBUG_TOKEN="your_token"
   
   curl -H "Authorization: Bearer $DEBUG_TOKEN" \
     "$SERVICE_URL/debug/sql-count?upload_id=<upload_id_from_response>"
   ```

4. **Verify in UI**: Go to Bonuses & Commissions → Hourly Payouts

---

## 🎯 Similar Issues

This SAME pattern could affect other tables:

### Check These Too:
- `employee_commission_monthly` - Does it have `name_raw`?
- `agent_commission_us` - Does it have `name_raw`?
- `timecards` - Does it have expected columns?

### Create More Diagnostics:
```bash
# Check all commission-related tables
node scripts/diagnose-commission-tables.js   # (create similar script)
```

---

## 📚 Files Involved

### Schema Files:
- `db/init/025_commission_import_schema.sql` - Original (OLD)
- `db/init/027_restructure_hourly_payout.sql` - Partial fix
- `db/init/038_rebuild_hourly_payout_table.sql` - **CORRECT SCHEMA**

### Code Files:
- `api/src/utils/commissionImporter.js` - Inserts data (expects `date_periods`)
- `api/src/routes/commissions.js` - Reads data (expects `date_periods`)

### Diagnostic:
- `scripts/diagnose-hourly-payout-schema.js` - **RUN THIS FIRST**

---

## 🚨 Prevention

To avoid this in future:

1. **Version check in code**:
   ```javascript
   // At startup, verify schema version
   const schemaCheck = await pool.query(`
     SELECT column_name 
     FROM information_schema.columns 
     WHERE table_name = 'hourly_payout' 
     AND column_name = 'date_periods'
   `);
   if (schemaCheck.rows.length === 0) {
     throw new Error('SCHEMA MISMATCH: hourly_payout missing date_periods column');
   }
   ```

2. **Migration tracking table**:
   ```sql
   CREATE TABLE schema_migrations (
     version INTEGER PRIMARY KEY,
     applied_at TIMESTAMP DEFAULT now()
   );
   ```

3. **Pre-deployment check**:
   ```bash
   # In CI/CD, verify schema before deploy
   node scripts/verify-schema-version.js || exit 1
   ```

---

## 📞 Next Steps

1. **RUN DIAGNOSTIC NOW**:
   ```bash
   node scripts/diagnose-hourly-payout-schema.js
   ```

2. **Apply fix if needed** (see "The Fix" section above)

3. **Re-upload data** and verify it appears

4. **Apply debug tools** (from earlier implementation) to prevent future issues

5. **Add similar diagnostics** for other problematic tables

---

**Priority**: 🔴 **CRITICAL** - This must be fixed before any uploads will work.

**Estimated Fix Time**: 5 minutes (run migration + re-upload)

**Risk**: Migration drops table - ensure you have backup of data or can re-upload

---

Need help? Check the diagnostic output and share it for next steps!

