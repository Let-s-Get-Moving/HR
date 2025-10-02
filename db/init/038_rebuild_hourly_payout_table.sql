-- COMPLETE REBUILD: Drop and recreate hourly_payout with correct schema
-- The original schema (025) was incompatible with the importer

-- Drop the broken table and recreate from scratch
DROP TABLE IF EXISTS hourly_payout CASCADE;

-- Create hourly_payout with the CORRECT schema that matches the importer
CREATE TABLE hourly_payout (
    id SERIAL PRIMARY KEY,
    
    -- Employee reference (nullable for non-matched employees)
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Period identification
    period_month DATE NOT NULL,
    
    -- Employee name from spreadsheet (always present)
    name_raw TEXT NOT NULL,
    
    -- Date periods as JSON array: [{"label": "May 19-June 1", "amount": 1600, "cash_paid": true}, ...]
    date_periods JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Total for the month (if present in spreadsheet)
    total_for_month NUMERIC(14,2),
    
    -- Metadata
    source_file TEXT,
    sheet_name TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint: one row per employee per month
CREATE UNIQUE INDEX idx_hourly_payout_unique ON hourly_payout (LOWER(TRIM(name_raw)), period_month);

-- Create performance indexes
CREATE INDEX idx_hourly_payout_employee_id ON hourly_payout(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_hourly_payout_period_month ON hourly_payout(period_month);
CREATE INDEX idx_hourly_payout_name_raw ON hourly_payout(LOWER(TRIM(name_raw)));

-- Add helpful comments
COMMENT ON TABLE hourly_payout IS 'Stores hourly payout data from commission spreadsheets';
COMMENT ON COLUMN hourly_payout.name_raw IS 'Employee name from spreadsheet - may not match any employee record';
COMMENT ON COLUMN hourly_payout.date_periods IS 'JSON array of pay periods: [{"label": "May 19-June 1", "amount": 1600, "cash_paid": true}]';
COMMENT ON COLUMN hourly_payout.employee_id IS 'Optional - NULL if employee not found in employees table';

