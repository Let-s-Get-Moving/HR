-- SAFE MIGRATION: Create hourly_payout table only if it doesn't exist
-- This migration will NOT drop existing data on redeployment
-- Fixed: 2025-10-03 to prevent data loss during Render deployments

-- Create hourly_payout with the CORRECT schema that matches the importer
-- ONLY if it doesn't already exist (preserves existing data)
CREATE TABLE IF NOT EXISTS hourly_payout (
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

-- Create unique constraint: one row per employee per month (IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hourly_payout_unique') THEN
        CREATE UNIQUE INDEX idx_hourly_payout_unique ON hourly_payout (LOWER(TRIM(name_raw)), period_month);
    END IF;
END $$;

-- Create performance indexes (IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hourly_payout_employee_id') THEN
        CREATE INDEX idx_hourly_payout_employee_id ON hourly_payout(employee_id) WHERE employee_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hourly_payout_period_month') THEN
        CREATE INDEX idx_hourly_payout_period_month ON hourly_payout(period_month);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hourly_payout_name_raw') THEN
        CREATE INDEX idx_hourly_payout_name_raw ON hourly_payout(LOWER(TRIM(name_raw)));
    END IF;
END $$;

-- Add helpful comments (safe to run multiple times)
COMMENT ON TABLE hourly_payout IS 'Stores hourly payout data from commission spreadsheets';
COMMENT ON COLUMN hourly_payout.name_raw IS 'Employee name from spreadsheet - may not match any employee record';
COMMENT ON COLUMN hourly_payout.date_periods IS 'JSON array of pay periods: [{"label": "May 19-June 1", "amount": 1600, "cash_paid": true}]';
COMMENT ON COLUMN hourly_payout.employee_id IS 'Optional - NULL if employee not found in employees table';
