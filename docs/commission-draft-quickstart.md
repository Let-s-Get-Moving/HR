# Commission Draft Engine - Quick Start Guide

## Implementation Complete

All 6 tasks have been completed:

1. ✅ Database migration created
2. ✅ SmartMoving API client implemented
3. ✅ Sales Commission Summary importer created
4. ✅ Commission draft engine implemented
5. ✅ API routes created and mounted
6. ✅ Frontend UI implemented

---

## Next Steps to Deploy

### 1. Run the Database Migration

```bash
cd /Users/admin/Documents/GitHub/HR
psql -U your_username -d your_database_name -f db/migrations/create-commission-drafts.sql
```

This will create:
- `smartmoving_quote_cache` table
- `commission_drafts` table
- `commission_line_items` table (with auto-calculate trigger)
- `sales_commission_summary_staging` table

### 2. Add Environment Variables (Optional)

The SmartMoving credentials are hardcoded as fallbacks, but you can optionally add them to your `.env`:

```bash
SMARTMOVING_API_KEY=29f2beddae514bff84a60a1578f8df83
SMARTMOVING_CLIENT_ID=b0db4e2b-74af-44e2-8ecd-6f4921ec836f
```

### 3. Restart the API Server

```bash
cd api
npm restart
# or
pm2 restart your-api-process
```

The new routes will be automatically loaded:
- `POST /api/commission-drafts/ingest`
- `GET /api/commission-drafts`
- `GET /api/commission-drafts/:id`
- `PATCH /api/commission-drafts/:draftId/line-items/:lineItemId`
- `POST /api/commission-drafts/:id/finalize`

### 4. Restart the Frontend (if needed)

```bash
cd web
npm run dev
# or
npm run build && npm start
```

---

## Testing the Implementation

### Test 1: Upload Files & Create Draft

1. Navigate to the app in your browser
2. Go to "Bonuses" section
3. You should see a new tab called "Commission Drafts"
4. Upload 3 files:
   - **Sales Person Performance** (.xlsx)
   - **Sales Commission Summary** (.xlsx/.csv) with these columns:
     - Sales Person
     - Total Estimated
     - Invoiced (before taxes and tip)
     - Total Invoiced (including taxes and tip)
     - Commission Base
     - Calculated Commissions
     - Lump Sums
     - Deductions
     - Net Commissions
   - **Lead Status by Service Date** (.xlsx/.csv)
5. Select a date range
6. Click "Process & Create Draft"
7. Wait for the API to fetch SmartMoving subtotals (progress shown)
8. Draft should be created with all line items populated

### Test 2: Manual Entry & Auto-Save

1. In the Agent Commissions table, find any editable field (highlighted in blue/red)
2. Change a value (e.g., set "Spiff Bonus" to 100)
3. Wait 600ms — you should see a 💾 icon appear next to the agent name
4. The "Total Due" column should automatically update
5. Refresh the page — your changes should persist

### Test 3: Finalize Draft

1. Review all line items
2. Click the "Finish Commission" button (top right)
3. Confirm the prompt
4. The draft status should change to "Finalized"
5. All editable fields should become read-only (grey background)

### Test 4: SmartMoving API Caching

Run this query to check the cache:

```sql
SELECT 
    COUNT(*) as total_cached_quotes,
    MIN(fetched_at) as oldest_cache,
    MAX(fetched_at) as newest_cache,
    AVG(subtotal_cad) as avg_subtotal
FROM smartmoving_quote_cache;
```

On first run, this should show 0 cached quotes.  
After creating a draft, it should show N cached quotes (where N = number of closed quotes in the period).  
On subsequent draft creation for the same period, API calls should be instant (cache hits).

---

## Troubleshooting

### Problem: Migration fails with "relation already exists"

**Solution:** Tables already exist. Either:
- Drop them first: `DROP TABLE IF EXISTS commission_line_items, commission_drafts, smartmoving_quote_cache, sales_commission_summary_staging CASCADE;`
- Or skip the migration if you're re-running

### Problem: "Failed to create draft" error

**Check:**
1. Are all 3 staging tables populated?
   ```sql
   SELECT COUNT(*) FROM sales_performance_staging WHERE period_start = '2024-01-01';
   SELECT COUNT(*) FROM sales_commission_summary_staging WHERE period_start = '2024-01-01';
   SELECT COUNT(*) FROM sales_lead_status_quotes;
   ```
2. Do employee nicknames match the sales person names in the reports?
   ```sql
   SELECT nickname, nickname_2, nickname_3 FROM employees WHERE sales_commission_enabled = true;
   ```

### Problem: Revenue add-ons are $0 but directives exist

**Check:**
1. Are quotes marked as "closed" in lead status?
   ```sql
   SELECT status_norm, COUNT(*) FROM sales_lead_status_quotes GROUP BY status_norm;
   ```
2. Are SmartMoving API calls succeeding?
   ```sql
   SELECT quote_number, subtotal_cad, fetched_at FROM smartmoving_quote_cache ORDER BY fetched_at DESC LIMIT 10;
   ```
3. Check API logs for errors

### Problem: Auto-save not working

**Check:**
1. Open browser DevTools → Network tab
2. Edit a field
3. After 600ms, you should see a PATCH request to `/api/commission-drafts/.../line-items/...`
4. If request fails, check:
   - CSRF token is valid
   - User has admin/manager role
   - Draft status is "draft" (not "finalized")

---

## Files Created/Modified

### New Files (6)
1. `db/migrations/create-commission-drafts.sql`
2. `api/src/services/smartmovingClient.js`
3. `api/src/utils/salesCommissionSummaryImporter.js`
4. `api/src/utils/commissionDraftEngine.js`
5. `api/src/routes/commission-drafts.js`
6. `docs/commission-draft-implementation-summary.md` (this file)

### Modified Files (2)
1. `api/src/server.js` — added route import + mount
2. `web/src/pages/BonusesCommissions.jsx` — added Commission Drafts tab + state + functions + rendering

### Unchanged (Logic Reused)
- `api/src/utils/salesCommissionCalculator.js` — `computeAgentRate()` reused
- `api/src/utils/leadStatusImporter.js` — still used for lead status import
- `api/src/utils/salesPerformanceImporter.js` — still used for performance import

---

## Support

For questions or issues:
1. Check `docs/commission-structure-calculations.md` for calculation logic
2. Check `docs/commission-draft-implementation-summary.md` for architecture
3. Check API logs for SmartMoving API errors
4. Check browser console for frontend errors

---

**Implementation completed on:** March 18, 2026
**All todos:** ✅ COMPLETED
