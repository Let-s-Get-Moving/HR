-- Make employee_id nullable in commission tables
-- This allows commission data to exist independently of employee records

-- Make employee_id nullable in employee_commission_monthly
ALTER TABLE employee_commission_monthly 
    ALTER COLUMN employee_id DROP NOT NULL;

-- Drop old unique constraint and create new one based on name_raw
ALTER TABLE employee_commission_monthly
    DROP CONSTRAINT IF EXISTS uq_employee_commission_period;

-- Create new unique constraint using name_raw (which is always present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_monthly_period 
    ON employee_commission_monthly (LOWER(TRIM(name_raw)), period_month);

-- Make employee_id nullable in agent_commission_us
ALTER TABLE agent_commission_us 
    ALTER COLUMN employee_id DROP NOT NULL;

-- Drop old unique constraint and create new one based on name_raw
ALTER TABLE agent_commission_us
    DROP CONSTRAINT IF EXISTS uq_agent_commission_us_period;

-- Add name_raw column if it doesn't exist
ALTER TABLE agent_commission_us
    ADD COLUMN IF NOT EXISTS name_raw TEXT;

-- Create new unique constraint using name_raw (which is always present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_commission_us_period 
    ON agent_commission_us (LOWER(TRIM(name_raw)), period_month);

-- Make employee_id nullable in hourly_payout
ALTER TABLE hourly_payout 
    ALTER COLUMN employee_id DROP NOT NULL;

-- Drop old unique constraint and create new one based on name_raw
ALTER TABLE hourly_payout
    DROP CONSTRAINT IF EXISTS uq_hourly_payout_period;

-- Add name_raw column if it doesn't exist
ALTER TABLE hourly_payout
    ADD COLUMN IF NOT EXISTS name_raw TEXT;

-- Create new unique constraint using name_raw (which is always present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_hourly_payout_period 
    ON hourly_payout (LOWER(TRIM(name_raw)), period_month, period_label);

-- Comment for documentation
COMMENT ON COLUMN employee_commission_monthly.employee_id IS 'Optional - can be NULL if employee does not exist in employees table';
COMMENT ON COLUMN agent_commission_us.employee_id IS 'Optional - can be NULL if employee does not exist in employees table';
COMMENT ON COLUMN hourly_payout.employee_id IS 'Optional - can be NULL if employee does not exist in employees table';

