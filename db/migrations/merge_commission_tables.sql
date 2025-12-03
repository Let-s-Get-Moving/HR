-- Merge all commission/bonus data into single employee_commission_monthly table
-- Adds US commission fields and Pay Period fields

-- Add US commission fields (separate from main commission fields)
ALTER TABLE employee_commission_monthly
    ADD COLUMN IF NOT EXISTS total_us_revenue NUMERIC(18,2),           -- total US revenue
    ADD COLUMN IF NOT EXISTS commission_pct_us NUMERIC(10,3),          -- commission % (US)
    ADD COLUMN IF NOT EXISTS commission_earned_us NUMERIC(18,2),       -- Commission earned US
    ADD COLUMN IF NOT EXISTS commission_125x NUMERIC(18,2);            -- 1.25X

-- Add Pay Period fields (Option A: separate columns, NUMERIC for amounts)
ALTER TABLE employee_commission_monthly
    ADD COLUMN IF NOT EXISTS pay_period_1 NUMERIC(18,2),                -- Pay Period 1 (amount)
    ADD COLUMN IF NOT EXISTS pay_period_1_cash_paid NUMERIC(18,2),    -- cash paid (Pay Period 1)
    ADD COLUMN IF NOT EXISTS pay_period_2 NUMERIC(18,2),               -- Pay Period 2 (amount)
    ADD COLUMN IF NOT EXISTS pay_period_2_cash_paid NUMERIC(18,2),    -- cash paid (Pay Period 2)
    ADD COLUMN IF NOT EXISTS pay_period_3 NUMERIC(18,2),               -- Pay Period 3 (amount)
    ADD COLUMN IF NOT EXISTS pay_period_3_cash_paid NUMERIC(18,2);    -- cash paid (Pay Period 3)

-- Add comments for documentation
COMMENT ON COLUMN employee_commission_monthly.total_us_revenue IS 'Total US revenue (separate from total_revenue_all)';
COMMENT ON COLUMN employee_commission_monthly.commission_pct_us IS 'Commission percentage for US revenue (separate from commission_pct)';
COMMENT ON COLUMN employee_commission_monthly.commission_earned_us IS 'Commission earned from US revenue';
COMMENT ON COLUMN employee_commission_monthly.commission_125x IS '1.25X commission multiplier amount';
COMMENT ON COLUMN employee_commission_monthly.pay_period_1 IS 'Pay Period 1 amount';
COMMENT ON COLUMN employee_commission_monthly.pay_period_1_cash_paid IS 'Cash paid for Pay Period 1';
COMMENT ON COLUMN employee_commission_monthly.pay_period_2 IS 'Pay Period 2 amount';
COMMENT ON COLUMN employee_commission_monthly.pay_period_2_cash_paid IS 'Cash paid for Pay Period 2';
COMMENT ON COLUMN employee_commission_monthly.pay_period_3 IS 'Pay Period 3 amount';
COMMENT ON COLUMN employee_commission_monthly.pay_period_3_cash_paid IS 'Cash paid for Pay Period 3';

