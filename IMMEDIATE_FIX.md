# 🚨 IMMEDIATE FIX for "Data Appears Then Disappears"

**Root Causes Found:**
1. ✅ 30-second cache on stats endpoint
2. ✅ Routes using single pool (potential replica lag)
3. ✅ No `FORCE_PRIMARY_READS` environment variable

---

## 🔧 Quick Fix (5 minutes)

### Step 1: Set Environment Variable on Render

Go to Render Dashboard → Your Service → Environment → Add:

```bash
FORCE_PRIMARY_READS=true
```

This forces ALL reads to hit the primary database, eliminating replica lag.

### Step 2: Disable Cache Temporarily

Edit `/api/src/routes/timecardUploads.js` line 163:

```javascript
// BEFORE:
const CACHE_DURATION = 30000; // 30 seconds

// AFTER (TEMPORARY FIX):
const CACHE_DURATION = 0; // Disable cache during debugging
```

### Step 3: Deploy

```bash
git add api/src/routes/timecardUploads.js
git commit -m "fix: disable stats cache to debug data visibility"
git push origin main
```

Wait 2-3 minutes for Render to deploy.

---

## 🧪 Test After Deploy

1. **Upload a commission file** with hourly payout data
2. **Immediately refresh** the page
3. **Check if data appears** without waiting

If it works now, the issue was **caching + replica lag**.

---

## 🔍 Alternative: Check if Replica Exists

Run this to see if you have a read replica:

```bash
# In Render dashboard, check if you have:
# 1. A "Primary" Postgres instance
# 2. A separate "Replica" instance

# If YES → replica lag is the issue
# If NO → caching or connection pooling
```

---

## 📊 Permanent Fix (after confirming)

Once we confirm the issue:

1. **Keep `FORCE_PRIMARY_READS=true`** (or set up proper replica lag monitoring)
2. **Re-enable cache** but invalidate on upload:
   ```javascript
   const CACHE_DURATION = 30000; // Re-enable
   
   // Make sure invalidateStatsCache() is called after EVERY upload
   ```
3. **Migrate routes to new pool system** (use the debug tools we built)

---

## 🎯 Expected Behavior After Fix

✅ Upload commission file  
✅ Data appears IMMEDIATELY (no 30-second delay)  
✅ Data stays visible (no disappearing)  
✅ Refresh shows same data (no flicker)

---

## 💡 Why This Happens

### Scenario: Data "Disappears"
1. User uploads file at 10:00:00 AM
2. Data written to **primary database**
3. User refreshes page at 10:00:05 AM
4. API returns **cached stats from 9:59:35 AM** (before upload!)
5. User sees "no data" even though it's in the database
6. User refreshes again at 10:00:35 AM
7. Cache expires, new query hits database
8. Data magically "appears"!

### Scenario: "Sometimes Works"
- If you wait 30+ seconds between upload and refresh → works
- If you refresh immediately after upload → cached old data
- **Appears random** but it's just cache timing!

---

## 🚨 Critical Next Step

**After setting `FORCE_PRIMARY_READS=true` and deploying:**

```bash
# Test the debug endpoint we built earlier:
export SERVICE_URL="https://your-hr-app.onrender.com"
export DEBUG_TOKEN="<your_token>"

# Run probe (should return sql_count: 5)
curl -X POST -H "Authorization: Bearer $DEBUG_TOKEN" \
  "$SERVICE_URL/admin/probe" | jq

# If this returns 5, your database is working perfectly
# If this returns < 5, there's a deeper issue
```

---

**DEPLOY THIS FIX NOW** and test!

