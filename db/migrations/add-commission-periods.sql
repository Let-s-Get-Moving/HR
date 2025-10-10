-- Add 4-week period tracking fields to commission tables
-- Commission periods are 4 weeks (2 consecutive 2-week pay periods)
-- Each 4-week block has 2 paydays (5 days after each 2-week period ends)

-- Add fields to employee_commission_monthly table
ALTER TABLE employee_commission_monthly
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS payday_1 DATE,
ADD COLUMN IF NOT EXISTS payday_2 DATE;

-- Add fields to agent_commission_us table
ALTER TABLE agent_commission_us
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS payday_1 DATE,
ADD COLUMN IF NOT EXISTS payday_2 DATE;

-- Add fields to hourly_payout table
ALTER TABLE hourly_payout
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS payday_1 DATE,
ADD COLUMN IF NOT EXISTS payday_2 DATE;

-- Create indexes for efficient querying by period
CREATE INDEX IF NOT EXISTS idx_employee_commission_monthly_period_start 
ON employee_commission_monthly(period_start);

CREATE INDEX IF NOT EXISTS idx_employee_commission_monthly_period_end 
ON employee_commission_monthly(period_end);

CREATE INDEX IF NOT EXISTS idx_agent_commission_us_period_start 
ON agent_commission_us(period_start);

CREATE INDEX IF NOT EXISTS idx_agent_commission_us_period_end 
ON agent_commission_us(period_end);

CREATE INDEX IF NOT EXISTS idx_hourly_payout_period_start 
ON hourly_payout(period_start);

CREATE INDEX IF NOT EXISTS idx_hourly_payout_period_end 
ON hourly_payout(period_end);

-- Add comments to document the structure
COMMENT ON COLUMN employee_commission_monthly.period_start IS 'Start date of 4-week commission period (Monday of Week 1)';
COMMENT ON COLUMN employee_commission_monthly.period_end IS 'End date of 4-week commission period (Sunday of Week 4)';
COMMENT ON COLUMN employee_commission_monthly.payday_1 IS 'First payday (Friday, 5 days after Week 2 ends)';
COMMENT ON COLUMN employee_commission_monthly.payday_2 IS 'Second payday (Friday, 5 days after Week 4 ends)';

COMMENT ON COLUMN agent_commission_us.period_start IS 'Start date of 4-week commission period (Monday of Week 1)';
COMMENT ON COLUMN agent_commission_us.period_end IS 'End date of 4-week commission period (Sunday of Week 4)';
COMMENT ON COLUMN agent_commission_us.payday_1 IS 'First payday (Friday, 5 days after Week 2 ends)';
COMMENT ON COLUMN agent_commission_us.payday_2 IS 'Second payday (Friday, 5 days after Week 4 ends)';

COMMENT ON COLUMN hourly_payout.period_start IS 'Start date of 4-week commission period (Monday of Week 1)';
COMMENT ON COLUMN hourly_payout.period_end IS 'End date of 4-week commission period (Sunday of Week 4)';
COMMENT ON COLUMN hourly_payout.payday_1 IS 'First payday (Friday, 5 days after Week 2 ends)';
COMMENT ON COLUMN hourly_payout.payday_2 IS 'Second payday (Friday, 5 days after Week 4 ends)';

