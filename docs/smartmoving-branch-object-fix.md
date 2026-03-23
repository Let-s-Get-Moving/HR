# SmartMoving API Branch Object Fix

## Date: March 18, 2026

## Issue

All revenue add-ons/deductions showing as 0 because all 110 directive quotes had `subtotal_cad = 0` in cache.

## Root Cause

SmartMoving API returns `branch` as an **OBJECT** with properties, not a string:

```json
{
  "branch": {
    "name": "DOWNTOWN TORONTO 🇨🇦 - Corporate - Let's Get Moving",
    "phoneNumber": "(647) 255-9942"
  }
}
```

But the code on line 61 of `smartmovingClient.js` was trying to access:
```javascript
const branch = data?.branchName || data?.branch || null;
```

This set `branch` to an OBJECT, not a string. Then:
1. Currency detection failed (couldn't call `.toUpperCase()` on object)
2. Branch name was stored as `null` in cache
3. All subsequent API calls returned wrong data

## Fix

Changed line 61-62 in `api/src/services/smartmovingClient.js`:

```javascript
// BEFORE (wrong)
const branch = data?.branchName || data?.branch || null;

// AFTER (correct)
const branch = data?.branch?.name || data?.branchName || null;
```

Now correctly extracts the branch name string from the object.

## Testing

Tested quote 317119:
- API returns: `estimatedTotal.subtotal: 764.98`
- Branch: `"DOWNTOWN TORONTO 🇨🇦 - Corporate - Let's Get Moving"`
- Should be treated as CAD (not US branch)

## Actions Taken

1. Fixed `smartmovingClient.js` to extract `branch.name`
2. Cleared all 110 cached entries with 0 subtotal using `scripts/clear-zero-cache.js`
3. Next ingestion will re-fetch from API with correct branch handling

## Files Changed (NOT COMMITTED)

- `api/src/services/smartmovingClient.js` (line 61-62)

## Expected Result After Deployment

- Revenue add-ons/deductions will be calculated correctly
- All 110 directive quotes will have proper subtotals
- Currency detection will work (USD vs CAD)
- Draft commissions will include revenue adjustments

## Note

User will need to:
1. Commit these fixes
2. Deploy to Render
3. Delete Draft #9
4. Create Draft #10 with fresh API calls
