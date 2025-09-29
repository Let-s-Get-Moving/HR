# Commission Import Implementation

## Overview

A robust Excel commission import system integrated into the existing Node.js/Express API. This system replaces the old commissions table with three new specialized tables for handling complex commission data from Excel imports.

## Database Changes

### New Tables

#### 1. `employee_commission_monthly`
Main commission data with detailed revenue and deduction tracking.

**Key Fields:**
- `employee_id`, `period_month` (unique constraint)
- Revenue fields: `rev_sm_all_locations`, `rev_add_ons`, `total_revenue_all`
- Commission fields: `commission_pct`, `commission_earned`, `spiff_bonus`
- Deduction fields: `deduction_sales_manager_minus`, `deduction_customer_support_minus`, etc.
- Payment tracking: `total_due`, `amount_paid`, `remaining_amount`

#### 2. `agent_commission_us`
US-specific agent commission data.

**Key Fields:**
- `employee_id`, `period_month` (unique constraint)  
- `total_us_revenue`, `commission_pct`, `commission_earned`, `commission_125x`, `bonus`

#### 3. `hourly_payout`
Hourly payout tracking with period labels.

**Key Fields:**
- `employee_id`, `period_month`, `period_label` (unique constraint)
- `amount`, `total_for_month`

### Migration
- **File:** `db/init/025_commission_import_schema.sql`
- **Action:** Drops old `commissions` table, creates new schema with proper indexes and triggers

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
    "agents_us": {
      "inserted": 8,
      "updated": 1,
      "skipped": 0,
      "errors": []
    },
    "hourly": {
      "inserted": 24,
      "updated": 0,
      "skipped": 1,
      "errors": []
    },
    "warnings": [
      "Processed main commission block with 20 rows",
      "Agents US commission block not detected"
    ]
  }
}
```

### Data Retrieval Endpoints

#### Get Monthly Commission Data
```
GET /api/commissions/monthly?period_month=2025-07-01&employee_id=123
```

#### Get Agent US Commission Data  
```
GET /api/commissions/agents-us?period_month=2025-07-01
```

#### Get Hourly Payout Data
```
GET /api/commissions/hourly-payouts?period_month=2025-07-01
```

#### Get Commission Summary
```
GET /api/commissions/summary?period_month=2025-07-01
```

Returns aggregated metrics like total commission earned, total revenue, etc.

## Excel Processing Features

### Block Detection
The system automatically detects three types of data blocks in Excel files:

1. **Main Commission Table** - Detected by keywords like "Name", "Commission Earned", "Total Revenue"
2. **Agent US Table** - Detected by "Agents", "total US revenue", "1.25X" 
3. **Hourly Payout Table** - Detected by "hourly paid out", date range columns

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
- **Idempotent:** Re-importing same file updates existing records
- **Detailed logging:** Every skip/error recorded with reason
- **Validation:** Required fields checked, malformed data skipped gracefully

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

✅ **Drop-in replacement** - Works with existing API structure  
✅ **Robust parsing** - Handles varying Excel layouts and formats  
✅ **Complete transaction safety** - All-or-nothing imports  
✅ **Detailed reporting** - Full import summaries with error details  
✅ **Production ready** - Built for Render deployment  
✅ **Idempotent operations** - Safe to re-run imports  
✅ **Employee auto-creation** - Seamlessly handles new employees  
✅ **Multiple data types** - Supports main, agent US, and hourly payout data  

The system is ready for production use and will handle the complex commission Excel files with full reliability and detailed reporting.
