# Commission Draft Engine - Implementation Summary

## Overview

The Commission Draft Engine is a complete rewrite of the commission calculation workflow. Instead of immediately finalizing commissions on import, the system now:

1. Ingests 3 required files
2. Fetches subtotals from SmartMoving API (cached)
3. Creates a **draft** with all calculated fields
4. Allows manual entry of deductions/bonuses (auto-saved)
5. Finalizes the draft when complete (locks it)

---

## Files Created

### Database Migration
- **`db/migrations/create-commission-drafts.sql`**
  - `smartmoving_quote_cache` — caches API subtotals per quote
  - `commission_drafts` — one row per period (draft/finalized status)
  - `commission_line_items` — one row per agent/manager with 21 columns
  - `sales_commission_summary_staging` — new report staging table
  - Includes trigger to auto-calculate `total_due`

### Backend Services
- **`api/src/services/smartmovingClient.js`**
  - Fetches subtotals from SmartMoving API
  - Caches results in `smartmoving_quote_cache`
  - Auto-converts USD to CAD at 1.25 rate
  - Batch fetching with rate limiting (5 concurrent)

### Backend Importers
- **`api/src/utils/salesCommissionSummaryImporter.js`**
  - Imports new "Sales Commission Summary" report
  - Expected columns: Sales Person, Total Estimated, Invoiced (before taxes and tip), etc.
  - Upserts to `sales_commission_summary_staging`

### Backend Engine
- **`api/src/utils/commissionDraftEngine.js`**
  - `createCommissionDraft()` — main orchestrator
  - Pulls booking % from `sales_performance_staging`
  - Pulls invoiced from `sales_commission_summary_staging`
  - Fetches subtotals from SmartMoving API (cached)
  - Applies split/transfer directives using subtotals
  - Calculates agent commission using existing `computeAgentRate()`
  - Calculates manager commission using bucket-sum or fixed rate
  - Writes draft + line items with all fields populated

### Backend API Routes
- **`api/src/routes/commission-drafts.js`**
  - `POST /api/commission-drafts/ingest` — upload 3 files + create draft
  - `GET /api/commission-drafts` — list all drafts
  - `GET /api/commission-drafts/:id` — get draft + line items
  - `PATCH /api/commission-drafts/:draftId/line-items/:lineItemId` — update manual fields
  - `POST /api/commission-drafts/:id/finalize` — lock the draft
  - Mounted in `api/src/server.js`

### Frontend
- **`web/src/pages/BonusesCommissions.jsx`** (modified)
  - Added new "Commission Drafts" tab (default)
  - Upload section: 3 file inputs + period selector
  - Draft selector dropdown
  - Agent table: 21 columns (10 calculated, 11 manual)
  - Manager table: simplified version
  - Inline editing with debounced auto-save (600ms)
  - "Finish Commission" button (finalizes draft)
  - Old "Sales Commissions" tab retained for reference

---

## Data Flow

```
1. User uploads 3 files (Performance, Commission Summary, Lead Status)
   ↓
2. Files imported to staging tables
   ↓
3. Draft engine pulls:
   - Booking % from sales_performance_staging
   - Invoiced from sales_commission_summary_staging
   - Closed quotes from sales_lead_status_quotes
   ↓
4. For each quote: fetch subtotal from SmartMoving API (cached)
   ↓
5. Apply split/transfer directives using subtotals (not invoiced amounts)
   ↓
6. Calculate agent commission rate (3.5% - 6.0%) based on booking % + revenue
   ↓
7. Calculate manager commission (bucket-sum or fixed rate)
   ↓
8. Write draft + line items (all calculated fields populated, manual fields = 0)
   ↓
9. User manually enters deductions/bonuses (auto-saved)
   ↓
10. User clicks "Finish" → status = finalized (locked)
```

---

## Commission Line Item Fields (21 total)

### Calculated (Read-Only) - 9 fields
1. `hourly_rate` — from employees table
2. `invoiced` — from commission summary report
3. `revenue_add_ons` — from split directives (using subtotals)
4. `revenue_deductions` — from split directives (using subtotals)
5. `total_revenue` — invoiced + add-ons - deductions
6. `booking_pct` — from performance report
7. `commission_pct` — rate % (3.5-6.0) based on thresholds
8. `commission_earned` — total_revenue × commission_pct / 100
9. (managers: `invoiced` = pooled revenue)

### Manual (Editable) - 11 fields
10. `spiff_bonus`
11. `revenue_bonus`
12. `booking_bonus_5_10_plus`
13. `booking_bonus_5_10_minus`
14. `hourly_paid_out`
15. `deduction_sales_manager`
16. `deduction_missing_punch`
17. `deduction_customer_support`
18. `deduction_post_commission`
19. `deduction_dispatch`
20. `deduction_other`

### Computed (Auto-Calculated) - 1 field
21. `total_due` = commission_earned + bonuses - deductions
    (recalculated by trigger on every update)

---

## SmartMoving API Integration

- **Endpoint:** `GET /v1/api/opportunities/quote/{quoteNumber}`
- **Auth:** `X-Api-Key` + `X-ClientId` headers
- **API Key:** `29f2beddae514bff84a60a1578f8df83`
- **Client ID:** `b0db4e2b-74af-44e2-8ecd-6f4921ec836f`
- **Data Extracted:** `estimatedTotal.subtotal`
- **Currency Conversion:** USD → CAD at 1.25 if branch is US-based
- **Caching:** Results stored in `smartmoving_quote_cache` to avoid repeated calls

---

## Key Differences from Old System

| Old System | New System |
|---|---|
| Revenue from `sales_booked_opportunities_quotes.invoiced_amount` | Revenue add-ons/deductions use **subtotals from SmartMoving API** |
| Immediately finalized on calculation | Draft created first, manual entry, then finalized |
| Limited manual fields | 11 manual deduction/bonus fields |
| No caching | SmartMoving API calls cached per quote |
| Single "Sales Commissions" tab | "Commission Drafts" tab (primary), old tab kept for reference |
| Separate upload for Performance, Lead Status, BO | Unified 3-file upload + draft creation |

---

## How to Use

### As Admin/Manager:
1. Navigate to "Bonuses" → "Commission Drafts" tab
2. Upload 3 files:
   - Sales Person Performance (.xlsx)
   - Sales Commission Summary (.xlsx/.csv)
   - Lead Status by Service Date (.xlsx/.csv)
3. Select period (start/end dates)
4. Click "Process & Create Draft"
5. Wait for SmartMoving API calls to complete (progress shown)
6. Review calculated fields in the agent/manager tables
7. Manually enter deductions/bonuses (fields auto-save after 600ms)
8. Review total_due for all line items
9. Click "Finish Commission" to finalize (locks all fields)

### As Agent/Manager (Own Commissions):
1. Navigate to "Bonuses" → "Commission Drafts" tab
2. Select a period from the dropdown
3. View your own line items (read-only if finalized, editable if draft and you're an admin/manager)

---

## Migration Steps

1. Run the migration: `psql -U your_user -d your_db -f db/migrations/create-commission-drafts.sql`
2. Restart the API server (will load new routes)
3. Frontend will automatically show the new "Commission Drafts" tab
4. Old system remains accessible via "Sales Commissions (Old)" tab

---

## Testing Checklist

- [ ] Upload 3 files with valid data
- [ ] Verify draft created with correct line item count
- [ ] Check SmartMoving API calls are cached (check `smartmoving_quote_cache` table)
- [ ] Edit a manual field → verify auto-save after 600ms
- [ ] Verify `total_due` recalculates on every edit
- [ ] Click "Finish Commission" → verify status changes to finalized
- [ ] Try to edit a finalized draft → verify fields are read-only
- [ ] Test with US branch quotes → verify USD→CAD conversion at 1.25
- [ ] Test split directives → verify revenue_add_ons/deductions use subtotals

---

## SmartMoving API Error Handling

- 404 (quote not found) → cached as $0.00, no error thrown
- Network error → cached as $0.00, logged to console
- Cached values persist indefinitely (clear cache via `DELETE FROM smartmoving_quote_cache`)

---

## Performance Notes

- SmartMoving API calls are rate-limited to 5 concurrent requests
- Large quote sets (500+) may take 2-3 minutes to process
- Cache hit rate should be 90%+ after first draft creation for a period
- Frontend debounce prevents API spam on manual entry

---

## Future Enhancements

- [ ] Add "Duplicate Draft" button to copy a finalized draft
- [ ] Export finalized drafts to Excel
- [ ] Add audit log for manual field changes
- [ ] Add bulk edit for common deductions
- [ ] Add "Preview Total Due" before finalization
- [ ] Add email notification when draft is finalized

---

## Troubleshooting

**Problem:** SmartMoving API calls are slow
- **Solution:** Check cache table (`SELECT COUNT(*) FROM smartmoving_quote_cache WHERE fetched_at > NOW() - INTERVAL '1 day'`). If low, first run may take longer.

**Problem:** `total_due` not updating after manual field edit
- **Solution:** Check trigger is installed (`SELECT * FROM pg_trigger WHERE tgname = 'trg_compute_commission_total_due'`). If missing, re-run migration.

**Problem:** Draft shows 0 agents
- **Solution:** Check `sales_commission_summary_staging` has data for the period. Ensure `sales_person_key` matches employee nicknames.

**Problem:** Revenue add-ons/deductions are $0 but directives exist
- **Solution:** Check `sales_lead_status_quotes.status_norm` = 'closed' and SmartMoving API returned valid subtotals.

---

**End of Implementation Summary**
