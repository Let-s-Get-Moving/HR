# Commission Draft System - Bug Fixes Completed

## Date: March 18, 2026

## Critical Bugs Fixed

### 1. Undefined Commission Rate (CRITICAL) ✅
**Problem:** `commission_pct=undefined%` causing Rate % column to show "Gathering data..." forever

**Root Cause:** `computeAgentRate()` returns `{ pct, vacationValue }` but code was accessing `rateInfo.rate` (wrong property name)

**Fix:** Changed all occurrences of `rateInfo.rate` to `rateInfo.pct` in:
- Line 214: `const commissionEarned = round2(totalRevenue * rateInfo.pct / 100);`
- Line 216: Log statement
- Line 230: UPDATE query parameter

**Files Modified:** `api/src/utils/commissionDraftEngine.js`

---

### 2. Directive Matching Failures (110 Skipped) ✅
**Problem:** All 110 directives were being skipped (`Processed 0, skipped 110`)

**Root Cause:** Unable to diagnose without detailed logging

**Fix:** Added comprehensive debug logging to `calculateAdjustments()`:
- Log skip reasons breakdown (noSubtotal, noTransferAmount, noOriginalEmployee, noTargetEmployee, apiError)
- Log first 5 directives with full details (quote_id, directive_type, sales_person, target, subtotal, employee IDs)
- Log sample nicknames in lookup map (first 10 entries)
- Log individual skip events with reason

**Files Modified:** `api/src/utils/commissionDraftEngine.js`

**Next Steps:** Deploy and create fresh draft to see detailed logs explaining why directives are skipped

---

### 3. Old Commission System Removal ✅
**Problem:** Old `salesCommissionCalculator.js` (832 lines) contained dead code using deprecated tables:
- `sales_booked_opportunities_quotes` (old revenue source)
- `sales_agent_commissions` (old storage)
- `sales_manager_commissions` (old storage)

**New System Uses:**
- `commission_drafts` table
- `commission_line_items` table
- SmartMoving API for quote subtotals

**Fix:**
1. Extracted pure math functions to new file: `commissionRateCalculator.js`
   - `computeAgentRate()` - pure commission rate calculation
   - `computeManagerBucketRate()` - pure bucket rate lookup
   - `MANAGER_BUCKETS` - bucket definitions
2. Updated import in `commissionDraftEngine.js` to use new file
3. Renamed old file to `salesCommissionCalculator.js.OLD-DEPRECATED` (to prevent accidental usage)

**Files Created:** `api/src/utils/commissionRateCalculator.js`
**Files Modified:** `api/src/utils/commissionDraftEngine.js`
**Files Deprecated:** `api/src/utils/salesCommissionCalculator.js.OLD-DEPRECATED`

---

### 4. Status Filter Verification ✅
**Verified:** Line 157 in `commissionDraftEngine.js` correctly uses:
```sql
WHERE (ls.status_norm LIKE '%closed%' OR ls.status_norm LIKE '%completed%')
```

This handles status values like "Closed - Customer Booked", "Closed - Customer Changed Mind", etc.

---

## Expected Results After Deploy

### Immediate Fixes:
1. **Rate % column** will show actual numeric values (e.g., "15%", "20%", "15%") instead of "Gathering data..."
2. **Commission earned** will calculate correctly (totalRevenue * rate / 100)
3. **UPDATE queries** will succeed and populate commission_pct field

### Diagnostic Improvements:
1. **Detailed skip logging** will show exactly why directives are being skipped:
   - If SmartMoving API calls are failing (noSubtotal)
   - If nickname matching is failing (noOriginalEmployee, noTargetEmployee)
   - If transfer amounts are 0 (noTransferAmount)

### Code Quality:
1. **No more old system confusion** - clear separation between rate calculation (pure math) and data operations
2. **Deprecated code isolated** - old 832-line file renamed to prevent accidental usage

---

## Testing Instructions

### Step 1: Wait for Render Deploy
- Monitor Render dashboard for "Live" status
- Expected: ~2-3 minutes

### Step 2: Delete Existing Drafts
- Delete draft #7 (has old bugs)
- Start fresh

### Step 3: Create Draft #8
- Upload same 3 files:
  - sales-person-performance (15).xlsx
  - sales-commission-summary (6).xlsx
  - lead-status (12).xlsx
- Period: 2026-02-01 to 2026-02-28

### Step 4: Monitor Logs
Expected log output:
```
[enrichDraft] Found 110 directives, 110 unique quotes
[calculateAdjustments] Processing 110 directives
[calculateAdjustments] Sample nicknames in map: ['john', 'sam', 'alex', ...]
[calculateAdjustments] Directive #1: quote=310869, type=percent_split, sales_person=..., target=..., subtotal=$1234.56
[calculateAdjustments]   -> originalId=617, targetId=620
[calculateAdjustments] Processed X, skipped Y, adjustments for Z employees
[calculateAdjustments] Skip reasons: { noSubtotal: A, noTransferAmount: B, ... }
[enrichDraft] Updating agent 617 (agent): commission_pct=15%, commission_earned=$2312.25
[enrichDraft] Updated 45 agent line items
```

### Step 5: Verify UI
Check that:
- [ ] Rate % column shows percentages (not "Gathering data...")
- [ ] Commission column shows dollar amounts (not "Gathering data..." or $0.00)
- [ ] Revenue add-ons/deductions show values if SmartMoving API succeeded
- [ ] Total due is calculated correctly
- [ ] Manager commissions are calculated

---

## Known Remaining Issue

**If directives are still being skipped after this deploy:**

The debug logs will now tell us exactly why. Most likely causes:
1. **SmartMoving API failures** - branch null check already deployed, but there might be other issues
2. **Nickname mismatch** - target_name_key from directives doesn't match any employee nickname
3. **Subtotal = 0** - Quote exists but has no subtotal value

**Next steps will depend on what the logs reveal.**

---

## Git Commits

1. `883fe73` - Fix status filter to use LIKE '%closed%'
2. `99d2cd5` - Fix undefined rate + debug logging + remove old system

**Branch:** main
**Deployed to:** Render (hr-api-wbzs.onrender.com)

---

## Files Changed Summary

### Modified:
- `api/src/utils/commissionDraftEngine.js` (3 bugs fixed, debug logging added)

### Created:
- `api/src/utils/commissionRateCalculator.js` (pure math functions)

### Deprecated:
- `api/src/utils/salesCommissionCalculator.js.OLD-DEPRECATED` (832 lines of dead code)

---

## Success Criteria

✅ **PASS** if after creating Draft #8:
- commission_pct shows numeric values
- Commission earned calculated
- UI shows actual rates and amounts

⚠️ **INVESTIGATE** if directives still skipped:
- Check debug logs for skip reasons
- Address root cause based on logs

---

## Contact

If issues persist after deploy, provide:
1. Full Render logs from Draft #8 creation
2. Screenshots of UI showing the issue
3. Any error messages from browser console
