-- Drop and recreate hourly_payout table with proper structure
-- One row per employee per month with dynamic date period columns

DROP TABLE IF EXISTS hourly_payout CASCADE;

CREATE TABLE hourly_payout (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period_month DATE NOT NULL,
    name_raw TEXT NOT NULL,
    
    -- Store date period data as JSON for flexibility
    -- Format: [
    --   {"label": "June 16-June 29", "amount": 1600, "cash_paid": false},
    --   {"label": "June 30-July 13", "amount": 1565, "cash_paid": true}
    -- ]
    date_periods JSONB,
    
    total_for_month NUMERIC(18,2),
    
    source_file TEXT,
    sheet_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, period_month)
);

CREATE INDEX idx_hourly_payout_employee ON hourly_payout(employee_id);
CREATE INDEX idx_hourly_payout_period ON hourly_payout(period_month);
CREATE INDEX idx_hourly_payout_date_periods ON hourly_payout USING GIN (date_periods);

COMMENT ON TABLE hourly_payout IS 'Hourly payout data with dynamic date period columns stored as JSON';
COMMENT ON COLUMN hourly_payout.date_periods IS 'Array of date period objects with label, amount, and cash_paid flag';
