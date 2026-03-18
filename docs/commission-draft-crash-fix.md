# Commission Draft Enrichment Crash Fix

## Issue Summary

**Problem:** Draft #2 got stuck in "Gathering data..." state for 15+ minutes with 0 jobs to process. The background enrichment job crashed silently without logging any errors.

**Root Cause:** The `enrichDraftWithSmartMovingData()` function was crashing before reaching its try-catch error handler, causing the draft to remain stuck in 'calculating' status indefinitely.

## What Was Fixed

### 1. **Added Comprehensive Logging** (`commissionDraftEngine.js`)

Added detailed logging at every stage of the enrichment process:
- Start of enrichment with period info
- Number of directives and unique quotes found
- Progress after fetching quotes
- Number of employees with adjustments
- Agent and manager data counts
- Pooled revenue calculation
- Success/failure outcomes

This will help diagnose future issues immediately by showing exactly where the process fails.

### 2. **Enhanced Error Handling in `calculateAdjustments()`**

- Added try-catch around individual directive processing
- Continues processing even if one directive fails
- Logs detailed error info for each failure
- Tracks processed vs skipped counts
- Returns partial results rather than crashing entirely

### 3. **Added Error Stack Traces**

Modified the catch block in `enrichDraftWithSmartMovingData()` to log full stack traces:
```javascript
console.error(`[commissionDraftEngine] Error stack:`, error.stack);
```

### 4. **Created Manual Retry Endpoint**

Added `POST /api/commission-drafts/:id/retry-enrichment` to manually restart stuck enrichments:
- Resets draft to 'calculating' status
- Clears error messages
- Resets progress counter
- Fires enrichment in background again

### 5. **Frontend Recovery UI**

#### Error Banner Retry Button
- Shows "Retry" button when draft status is 'error'
- Allows user to manually trigger enrichment retry
- Provides immediate feedback

#### Stuck Detection in Progress Banner
- Detects when draft appears stuck (all quotes processed but still 'calculating')
- Shows "(appears stuck)" warning
- Displays "Force Retry" button
- User can manually restart the enrichment process

## How to Use

### If a Draft Gets Stuck:

1. **Wait for automatic detection** - The progress banner will show "appears stuck" if all quotes are processed but status is still 'calculating'

2. **Click "Force Retry"** - This will restart the enrichment process from the beginning

3. **Check Render logs** - With the new logging, you'll see exactly where it failed:
   ```
   [enrichDraft] Starting enrichment for draft X...
   [enrichDraft] Found Y directives, Z unique quotes
   [calculateAdjustments] Processing Y directives
   [enrichDraft] ✅ Draft X enrichment complete
   ```

### Manual Database Fix (if needed):

If the UI retry doesn't work, manually update the database:

```sql
UPDATE commission_drafts 
SET calculation_status = 'ready', 
    quotes_processed = quotes_total,
    calculation_error = NULL
WHERE id = [draft_id];
```

## Expected Behavior Now

### Normal Flow:
1. Files uploaded → Draft created with status 'calculating'
2. Background job fetches 0-N quotes (with progress updates)
3. Calculates adjustments for all employees
4. Updates agent and manager line items
5. Sets status to 'ready'
6. Frontend stops polling and shows editable form

### Error Flow:
1. Files uploaded → Draft created
2. Background job encounters error
3. Error logged with full stack trace
4. Status set to 'error' with message
5. Frontend shows error banner with "Retry" button
6. User clicks retry → process restarts

### Stuck Flow:
1. Progress shows "X of Y leads" for extended time
2. System detects all quotes processed but still calculating
3. Shows "(appears stuck)" warning
4. User clicks "Force Retry"
5. Process restarts from beginning

## Testing

To test the fix:
1. Create a new draft with the same files
2. Watch Render logs for detailed progress
3. If it gets stuck again, check logs for the exact error
4. Use "Force Retry" button to restart

## Files Modified

- `api/src/utils/commissionDraftEngine.js` - Added logging and error handling
- `api/src/routes/commission-drafts.js` - Added retry endpoint
- `web/src/pages/BonusesCommissions.jsx` - Added retry UI

## Next Steps

If drafts continue to get stuck:
1. Check the new detailed logs to identify the exact failure point
2. The error message will show which specific operation failed
3. Can add additional error handling at that specific point

The comprehensive logging will make it much easier to diagnose and fix any future issues.
