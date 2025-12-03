# Commission Import Implementation

## Overview

A robust Excel commission import system integrated into the existing Node.js/Express API. This system uses a unified table structure where all commission data (including US commissions and pay periods) is stored in a single `employee_commission_monthly` table.

## Database Changes

### Unified Table Structure

#### `employee_commission_monthly`
Unified commission data table containing all commission, bonus, and payout information.

**Key Fields:**
- `employee_id`, `period_month` (unique constraint)
- **Revenue fields:** `rev_sm_all_locations`, `rev_add_ons`, `rev_deduction`, `total_revenue_all`
- **Commission fields:** `booking_pct`, `commission_pct`, `commission_earned`, `spiff_bonus`, `revenue_bonus`
- **US Commission fields:** `total_us_revenue`, `commission_pct_us`, `commission_earned_us`, `commission_125x`, `bonus_us_jobs_125x`
- **Pay Period fields:** `pay_period_1`, `pay_period_1_cash_paid`, `pay_period_2`, `pay_period_2_cash_paid`, `pay_period_3`, `pay_period_3_cash_paid`
- **Booking bonuses:** `booking_bonus_plus`, `booking_bonus_minus`
- **Deduction fields:** `hourly_paid_out_minus`, `deduction_sales_manager_minus`, `deduction_missing_punch_minus`, `deduction_customer_support_minus`, `deduction_post_commission_collected_minus`, `deduction_dispatch_minus`, `deduction_other_minus`
- **Payment tracking:** `total_due`, `amount_paid`, `remaining_amount`
- **Notes:** `corporate_open_jobs_note`, `parking_pass_fee_note`

### Migrations
- **File:** `db/init/025_commission_import_schema.sql` - Creates the unified table structure
- **File:** `db/migrations/merge_commission_tables.sql` - Adds US commission and pay period fields
- **File:** `db/migrations/drop_old_commission_tables.sql` - Removes deprecated `agent_commission_us` and `hourly_payout` tables

## API Endpoints

### Import Endpoint
```
POST /api/commissions/import
```

**Request:**
- Content-Type: `multipart/form-data`
- File field: `excel_file` (Excel file)
- Optional body field: `sheet_name` (defaults to last sheet)

**Response:**
```json
{
  "message": "Commission import completed successfully",
  "summary": {
    "file": "july_2025_commissions.xlsx",
    "sheet": "July 2025", 
    "period_month": "2025-07-01",
    "main": {
      "inserted": 15,
      "updated": 3,
      "skipped": 2,
      "errors": [
        {"row": 12, "reason": "Missing employee name"}
      ]
    },
    "warnings": [
      "Processed unified commission block with 20 rows"
    ]
  }
}
```

**Note:** The import now processes a single unified commission block containing all data (main commissions, US commissions, and pay periods) in one table.

### Data Retrieval Endpoints

#### Get Monthly Commission Data (Unified)
```
GET /api/commissions/monthly?period_month=2025-07-01&employee_id=123
```

Returns all commission data including US commissions and pay periods in a unified format. Each record includes:
- Main commission fields (revenue, commission %, commission earned)
- US commission fields (total_us_revenue, commission_pct_us, commission_earned_us, commission_125x)
- Pay period fields (pay_period_1, pay_period_1_cash_paid, pay_period_2, pay_period_2_cash_paid, pay_period_3, pay_period_3_cash_paid)
- All deductions and payment tracking fields

#### Get Available Periods
```
GET /api/commissions/periods
```

Returns list of available commission periods with period dates and paydays.

#### Get Commission Summary
```
GET /api/commissions/summary?period_month=2025-07-01
```

Returns aggregated metrics like total commission earned, total revenue, total due, amount paid, and remaining amount for the specified period.

#### Update Commission Record (Manager/Admin Only)
```
PUT /api/commissions/monthly/:id
```

Allows managers and admins to update individual commission records with inline editing support.

## Excel Processing Features

### Block Detection
The system automatically detects the unified commission data block in Excel files:

1. **Unified Commission Table** - Detected by keywords like "Name", "Commission Earned", "Total Revenue", "total US revenue", "Pay Period 1", etc.
   - Contains all commission data in a single table structure
   - Includes US commission fields (total US revenue, commission % (US), Commission earned US, 1.25X)
   - Includes pay period fields (Pay Period 1-3 with cash paid columns)
   - All data is imported into the unified `employee_commission_monthly` table

### Data Normalization
- **Money parsing:** Handles `$1,234.56`, `(500.00)` (negative), removes formatting
- **Percentage parsing:** Handles `3.5%` or `3.5`, stores display value (3.5 not 0.035)  
- **Name matching:** Normalizes names for employee lookup/creation
- **Period extraction:** Parses "July 2025", "Jul 2025", "2025-07" from sheet names

### Employee Handling
- Automatically finds existing employees by normalized name
- Creates new employee records if not found (with placeholder email)
- Links all commission data to employee IDs
- **Fixed (2025-09-29):** 
  - Removed non-existent `created_at` column from employee INSERT statements
  - Fixed `queryFn` wrapper in all three processing functions to properly handle client connections
  - Fixed `findOrCreateEmployee` to accept `queryFn` directly instead of trying to wrap it again
  - Added comprehensive error logging for first 10 skipped rows to diagnose import issues

### Error Handling & Reliability
- **Transaction safety:** Entire import wrapped in database transaction
- **Savepoint recovery:** Each row uses savepoints to prevent single-row failures from aborting entire transaction
- **Idempotent:** Re-importing same file updates existing records
- **Detailed logging:** Every skip/error recorded with reason (first 10 errors plus sampling)
- **Validation:** Required fields checked, malformed data skipped gracefully
- **Field overflow protection:** Database fields increased from NUMERIC(14,2) to NUMERIC(18,2) for values up to $999 trillion

## File Structure

```
api/
├── src/
│   ├── routes/
│   │   └── commissions.js        # Updated with new endpoints
│   └── utils/
│       ├── excelParser.js        # Excel parsing & detection logic
│       └── commissionImporter.js # Main import orchestration
├── package.json                  # Added multer + xlsx dependencies  
└── ...

db/init/
└── 025_commission_import_schema.sql  # Database migration

tests/
└── test-commission-import.js     # Test utilities and validation
```

## Dependencies Added
- `multer ^2.0.0` - File upload handling
- `xlsx ^0.18.5` - Excel file parsing

## Usage Example

```bash
# Deploy database changes
npm run db:init

# Start API server  
npm start

# Import commission data via API
curl -X POST http://localhost:3000/api/commissions/import \
  -F "excel_file=@july_2025_commissions.xlsx" \
  -F "sheet_name=July 2025"

# Retrieve imported data
curl "http://localhost:3000/api/commissions/monthly?period_month=2025-07-01"
```

## Production Deployment (Render)

The system is designed for your existing Render deployment:

1. **Database migration** runs automatically via `initDb.js` 
2. **Dependencies** are installed during build
3. **Environment variables** use existing `DATABASE_URL`
4. **File uploads** handled in memory (no disk storage needed)
5. **Error logging** integrated with existing patterns

## Key Features

✅ **Unified structure** - All commission data in single table for easier management  
✅ **Robust parsing** - Handles varying Excel layouts and formats  
✅ **Complete transaction safety** - All-or-nothing imports  
✅ **Detailed reporting** - Full import summaries with error details  
✅ **Production ready** - Built for Render deployment  
✅ **Idempotent operations** - Safe to re-run imports  
✅ **Employee matching** - Links commission data to existing employee records  
✅ **Inline editing** - Managers can edit commission records directly from the UI  
✅ **Comprehensive fields** - Includes US commissions, pay periods, deductions, and payment tracking  

The system is ready for production use and will handle the complex commission Excel files with full reliability and detailed reporting.
