-- Commission Import Schema
-- Replace existing commissions table with new import-focused schema

-- Drop existing commissions table
DROP TABLE IF EXISTS commissions CASCADE;

-- Employee table (extend existing or create if needed)
-- Note: This assumes employees table already exists, just adding index for name matching
CREATE INDEX IF NOT EXISTS idx_employees_name_key ON employees(LOWER(TRIM(first_name || ' ' || last_name)));

-- Main commission data table
CREATE TABLE IF NOT EXISTS employee_commission_monthly (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period_month DATE NOT NULL, -- First day of month (e.g., 2025-07-01)
    
    -- Raw and processed data
    name_raw TEXT,
    hourly_rate NUMERIC(10,2),
    
    -- Revenue fields
    rev_sm_all_locations NUMERIC(14,2), -- Revenue on Smart Moving (All locations combined)
    rev_add_ons NUMERIC(14,2),          -- Revenue Add Ons+
    rev_deduction NUMERIC(14,2),        -- Revenue Deduction
    total_revenue_all NUMERIC(14,2),    -- Total Revenue(all locations combined)
    
    -- Commission and bonus fields
    booking_pct NUMERIC(6,3),           -- Booking % (stored as 3.5 not 0.035)
    commission_pct NUMERIC(6,3),        -- Commission %
    commission_earned NUMERIC(14,2),    -- Commission Earned
    spiff_bonus NUMERIC(14,2),          -- Spiff Bonus
    revenue_bonus NUMERIC(14,2),        -- Revenue Bonus
    bonus_us_jobs_125x NUMERIC(14,2),   -- Bonuses for booking US jobs 1.25X
    
    -- Booking bonuses and deductions
    booking_bonus_plus NUMERIC(14,2),   -- $5/$10 Bonus for Booking Bonus
    booking_bonus_minus NUMERIC(14,2),  -- $5/$10 Deduction for Booking Bonus
    hourly_paid_out_minus NUMERIC(14,2), -- - Hourly Paid Out
    
    -- Various deductions
    deduction_sales_manager_minus NUMERIC(14,2),          -- -Deduction by Sales Manager
    deduction_missing_punch_minus NUMERIC(14,2),          -- Deductions for missing punch in/out
    deduction_customer_support_minus NUMERIC(14,2),       -- Deductions from Customer Support
    deduction_post_commission_collected_minus NUMERIC(14,2), -- Deduction Post Commission collected
    deduction_dispatch_minus NUMERIC(14,2),               -- Deductions from dispatch
    deduction_other_minus NUMERIC(14,2),                  -- deduction
    
    -- Totals and payment info
    total_due NUMERIC(14,2),
    amount_paid NUMERIC(14,2),          -- Amount paid (date included in comment)
    remaining_amount NUMERIC(14,2),
    
    -- Note fields
    corporate_open_jobs_note TEXT,      -- CORPORATE LOCATIONS JOBS STILL OPEN
    parking_pass_fee_note TEXT,         -- Paid parking pass fee to be deducted from
    
    -- Metadata
    source_file TEXT,
    sheet_name TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT uq_employee_commission_period UNIQUE (employee_id, period_month)
);

-- Agent commission data for US operations
CREATE TABLE IF NOT EXISTS agent_commission_us (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period_month DATE NOT NULL,
    
    total_us_revenue NUMERIC(14,2),
    commission_pct NUMERIC(6,3),
    commission_earned NUMERIC(14,2),
    commission_125x NUMERIC(14,2),
    bonus NUMERIC(14,2),
    
    -- Metadata
    source_file TEXT,
    sheet_name TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT uq_agent_commission_us_period UNIQUE (employee_id, period_month)
);

-- Hourly payout data for employees
CREATE TABLE IF NOT EXISTS hourly_payout (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period_month DATE NOT NULL,
    period_label TEXT NOT NULL,         -- e.g., "June 16–June 29"
    amount NUMERIC(14,2),
    total_for_month NUMERIC(14,2),      -- if present in sheet
    
    -- Metadata  
    source_file TEXT,
    sheet_name TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT uq_hourly_payout_period UNIQUE (employee_id, period_month, period_label)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_employee_commission_monthly_employee_id ON employee_commission_monthly(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_commission_monthly_period ON employee_commission_monthly(period_month);
CREATE INDEX IF NOT EXISTS idx_employee_commission_monthly_source_file ON employee_commission_monthly(source_file);

CREATE INDEX IF NOT EXISTS idx_agent_commission_us_employee_id ON agent_commission_us(employee_id);
CREATE INDEX IF NOT EXISTS idx_agent_commission_us_period ON agent_commission_us(period_month);

CREATE INDEX IF NOT EXISTS idx_hourly_payout_employee_id ON hourly_payout(employee_id);
CREATE INDEX IF NOT EXISTS idx_hourly_payout_period ON hourly_payout(period_month);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_employee_commission_monthly_updated_at ON employee_commission_monthly;
CREATE TRIGGER update_employee_commission_monthly_updated_at
    BEFORE UPDATE ON employee_commission_monthly
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_commission_us_updated_at ON agent_commission_us;
CREATE TRIGGER update_agent_commission_us_updated_at
    BEFORE UPDATE ON agent_commission_us
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hourly_payout_updated_at ON hourly_payout;
CREATE TRIGGER update_hourly_payout_updated_at
    BEFORE UPDATE ON hourly_payout
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
