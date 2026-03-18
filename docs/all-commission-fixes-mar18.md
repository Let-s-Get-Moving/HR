# All Commission System Fixes - March 18, 2026

## Summary

Fixed all remaining issues with the commission draft system. Changes are **NOT COMMITTED** per user request.

---

## Issues Fixed

### 1. Commission Structure Now Loads from Database Settings ✅

**Problem**: Commission rates were HARDCODED in the code, ignoring the configurable settings in the `application_settings` table.

**Impact**: 
- Admins couldn't change commission rates without code changes
- Manager commission structure wasn't configurable

**Fix**: Complete rewrite of `commissionRateCalculator.js`:
- Loads agent thresholds (7 tiers) from DB
- Loads manager buckets (6 tiers) from DB  
- Loads vacation package value from DB
- Caches settings for 1 minute (60s TTL)
- Fallback to hardcoded values if DB query fails

**Migration Required**: `db/migrations/add-commission-structure-settings.sql` must be run on production DB.

---

### 2. Fixed Async/Await for Rate Calculations ✅

**Problem**: Made rate calculation functions async (to load from DB) but forgot to await them, causing:
- `commission_pct=undefined%` in logs
- "Gathering data..." stuck in UI forever
- Manager commission calculations returning Promise objects

**Fix**: Added `await` to all rate calculation calls:
- Line 213: `await computeAgentRate()`
- Line 254: `await calculateManagerCommission()`
- Line 478: Made `calculateManagerCommission()` async
- Line 491: `await computeManagerBucketRate()`

---

### 3. Fixed CORS PATCH Method (Again) ✅

**Problem**: Despite commit `5615921` claiming to fix CORS for PATCH, the code had actually REMOVED `PATCH` from allowed methods. This blocked auto-saving of manual input fields.

**Error**: 
```
Access to fetch at '.../line-items/304' has been blocked by CORS policy: 
Method PATCH is not allowed by Access-Control-Allow-Methods
```

**Fix**: Re-added `PATCH` to CORS allowed methods in:
- `api/src/middleware/security-simple.js` (line 309)
- `api/src/middleware/security.js` (line 377)

---

### 4. Sam Lopka's Fixed Rate Preserved ✅

**Verified**: Code already checks `employees.sales_manager_fixed_pct` field (line 479) and uses it for Sam Lopka's 0.7% fixed rate. This logic remains intact.

---

### 5. Revenue Add-ons/Deductions = 0 (Pending Deployment) ⏳

**Problem**: Revenue adjustments from commission directives (splits, transfers) are showing as 0.

**Previous Fixes** (committed in `99d2cd5`):
- Fixed status filter to `LIKE '%closed%'` instead of strict `IN ('completed', 'closed')`
- Added comprehensive debug logging to trace why directives are skipped
- Fixed SmartMoving API crash when `branch` is `null`

**What to Check After Deployment**:
1. Look for `[calculateAdjustments]` logs showing skip reasons:
   ```
   [calculateAdjustments] Processed X, skipped Y, adjustments for Z employees
   [calculateAdjustments] Skip reasons: {noSubtotal: X, noTransferAmount: Y, ...}
   ```
2. Verify directives are being matched (check `sales_lead_status_quotes` table)
3. Verify SmartMoving API is returning valid subtotals (check cache table)

---

## Files Modified (NOT COMMITTED)

1. **api/src/utils/commissionRateCalculator.js** (Major rewrite)
   - Loads from `application_settings` table
   - Added caching with 60s TTL
   - Made functions async

2. **api/src/utils/commissionDraftEngine.js**
   - Line 213: Added `await` for `computeAgentRate()`
   - Line 254: Added `await` for `calculateManagerCommission()`
   - Line 478: Made `calculateManagerCommission()` async
   - Line 491: Added `await` for `computeManagerBucketRate()`

3. **api/src/middleware/security-simple.js**
   - Line 309: Re-added `PATCH` to CORS allowed methods

4. **api/src/middleware/security.js**
   - Line 377: Re-added `PATCH` to CORS allowed methods

---

## Expected Results After Deployment

### Commission Rates
- Agent commission: 3.5% - 6.0% based on DB settings (7 tiers)
- Manager commission: 0.25% - 0.45% based on DB settings (6 buckets)
- Sam Lopka: Fixed 0.7% (from `employees.sales_manager_fixed_pct`)
- Vacation package: $5000 (configurable in DB)

### UI Display
- Rate % column: Shows valid percentage (e.g., "4.5%")
- Revenue add-ons/deductions: Shows actual values (if directives exist)
- Total due: Calculated correctly
- No more "Gathering data..." stuck forever

### Auto-Save
- Manual input fields save without CORS errors
- PATCH requests work properly

---

## Testing After Deployment

1. **Check Settings Load**:
   ```bash
   # In Render logs, look for:
   [commissionRateCalculator] Loaded 7 agent thresholds, 6 manager thresholds
   ```

2. **Create Fresh Draft**:
   - Upload all 3 reports
   - Wait for enrichment to complete
   - Check logs for detailed skip reasons

3. **Verify Calculations**:
   - Agent commission rates match settings
   - Manager commission rates match settings
   - Sam Lopka shows 0.7% fixed rate
   - Revenue adjustments are applied (if directives exist)

4. **Test Auto-Save**:
   - Edit a manual input field (e.g., Spiff Bonus)
   - Verify no CORS errors in browser console
   - Verify value saves immediately

---

## Database Migration Required

Run on production database:

```bash
PGPASSWORD=bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn \
psql -h dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com \
     -U hr hrcore_42l4 \
     -f db/migrations/add-commission-structure-settings.sql
```

This inserts:
- 7 agent commission thresholds (keys: `sales_agent_threshold_1` through `sales_agent_threshold_7`)
- 1 vacation package value (key: `sales_agent_vacation_package_value`)
- 6 manager commission buckets (keys: `sales_manager_threshold_1` through `sales_manager_threshold_6`)

---

## Deployment Checklist

- [ ] Migration applied to production DB
- [ ] Code changes deployed to Render
- [ ] Fresh draft created (Draft #9)
- [ ] Enrichment completes without errors
- [ ] Commission rates show valid percentages
- [ ] No CORS errors in browser console
- [ ] Auto-save works for manual input fields
- [ ] Revenue add-ons/deductions calculated (if directives exist)

---

## Notes

- All changes staged but **NOT COMMITTED** per user request
- Previous fixes (commits `99d2cd5`, `5615921`) should also be deployed
- User will test with deployment after these fixes
- If revenue adjustments are still 0, check the detailed debug logs for skip reasons
