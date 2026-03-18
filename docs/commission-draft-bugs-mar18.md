# Commission Draft Issues - Mar 18, 2026

## Critical Bugs Found & Fixed:

### 1. SmartMoving API Crash - ALL API Calls Failing ❌
**Error:** `TypeError: branch.toUpperCase is not a function`

**Cause:** The API response returns `null` for branch on some quotes. The code had `branch &&` check but still called `.toUpperCase()` inside the boolean expression, which failed.

**Impact:** ALL 110 SmartMoving API calls failed → 0 revenue add-ons/deductions calculated → agents show $0.00 total due

**Fix:** Changed from inline boolean to proper if-check with type validation:
```javascript
let isUSBranch = false;
if (branch && typeof branch === 'string') {
    const branchUpper = branch.toUpperCase();
    isUSBranch = branchUpper.startsWith('US-') || ...
}
```

### 2. Manager Commissions - Only Sam Lopka Got Commission ⚠️
**Issue:** Sam Lopka shows $5403.19, others show $0.00

**Cause:** The system calculates manager commission using either:
- Fixed percentage (if `sales_manager_fixed_pct` is set in database)
- OR bucket-sum method (based on agent booking percentages)

**Sam Lopka's 0.7% fixed rate:** This needs to be set in the `employees` table `sales_manager_fixed_pct` field. If not set, the system uses bucket-sum, which might be calculating $0 for managers without agents under them.

**Action Required:** Check database - is Sam Lopka's `sales_manager_fixed_pct = 0.7` in the employees table?

### 3. "Gathering data..." Still Showing After Complete 🐛
**Issue:** UI shows "Gathering data..." even though enrichment completed

**Root Cause Chain:**
1. All SmartMoving API calls failed (branch error)
2. No subtotals retrieved
3. calculateAdjustments processed 0, skipped 110
4. Enrichment still completed and updated fields with 0 values
5. BUT - the fields might still be NULL because the UPDATE query only runs if there are agents/managers

**Need to investigate:** Which exact fields the UI is checking for NULL to show "Gathering data..."

### 4. Total Due = $0.00 for All Agents ❌
**Cause:** The `total_due` field is calculated by a database trigger that sums:
- `commission_earned` 
- + manual bonuses 
- - manual deductions

Since `commission_earned` is 0 (because revenue add-ons/deductions are 0 due to API failures), total due = 0.

**Will be fixed by:** Fixing the SmartMoving API branch error above.

## Summary:

The main issue is the **SmartMoving API crash** which cascaded into all other problems. Once that's fixed and you create a new draft, everything should work.

## Next Steps:

1. Deploy the branch null-check fix
2. Delete Draft #4
3. Create Draft #5
4. Should see:
   - All 110 SmartMoving API calls succeed
   - Revenue add-ons/deductions calculated
   - Commission earned populated
   - Total due calculated correctly
   - No more "Gathering data..." after completion

5. Verify Sam Lopka's fixed 0.7% rate is in database
