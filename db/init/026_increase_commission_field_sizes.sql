-- Increase numeric field sizes for commission tables to handle very large values
-- This prevents "numeric field overflow" errors

-- Increase revenue and commission fields in employee_commission_monthly
ALTER TABLE employee_commission_monthly
    ALTER COLUMN rev_sm_all_locations TYPE NUMERIC(18,2),
    ALTER COLUMN rev_add_ons TYPE NUMERIC(18,2),
    ALTER COLUMN rev_deduction TYPE NUMERIC(18,2),
    ALTER COLUMN total_revenue_all TYPE NUMERIC(18,2),
    ALTER COLUMN commission_earned TYPE NUMERIC(18,2),
    ALTER COLUMN spiff_bonus TYPE NUMERIC(18,2),
    ALTER COLUMN revenue_bonus TYPE NUMERIC(18,2),
    ALTER COLUMN bonus_us_jobs_125x TYPE NUMERIC(18,2),
    ALTER COLUMN booking_bonus_plus TYPE NUMERIC(18,2),
    ALTER COLUMN booking_bonus_minus TYPE NUMERIC(18,2),
    ALTER COLUMN hourly_paid_out_minus TYPE NUMERIC(18,2),
    ALTER COLUMN deduction_sales_manager_minus TYPE NUMERIC(18,2),
    ALTER COLUMN deduction_missing_punch_minus TYPE NUMERIC(18,2),
    ALTER COLUMN deduction_customer_support_minus TYPE NUMERIC(18,2),
    ALTER COLUMN deduction_post_commission_collected_minus TYPE NUMERIC(18,2),
    ALTER COLUMN deduction_dispatch_minus TYPE NUMERIC(18,2),
    ALTER COLUMN deduction_other_minus TYPE NUMERIC(18,2),
    ALTER COLUMN total_due TYPE NUMERIC(18,2),
    ALTER COLUMN amount_paid TYPE NUMERIC(18,2),
    ALTER COLUMN remaining_amount TYPE NUMERIC(18,2);

-- Increase percentage fields to handle edge cases
ALTER TABLE employee_commission_monthly
    ALTER COLUMN booking_pct TYPE NUMERIC(10,3),
    ALTER COLUMN commission_pct TYPE NUMERIC(10,3);

-- Increase fields in agent_commission_us
ALTER TABLE agent_commission_us
    ALTER COLUMN total_us_revenue TYPE NUMERIC(18,2),
    ALTER COLUMN commission_pct TYPE NUMERIC(10,3),
    ALTER COLUMN commission_earned TYPE NUMERIC(18,2),
    ALTER COLUMN commission_125x TYPE NUMERIC(18,2),
    ALTER COLUMN bonus TYPE NUMERIC(18,2);

-- Increase fields in hourly_payout (only if columns exist)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hourly_payout' AND column_name='amount') THEN
        ALTER TABLE hourly_payout ALTER COLUMN amount TYPE NUMERIC(18,2);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hourly_payout' AND column_name='total_for_month') THEN
        ALTER TABLE hourly_payout ALTER COLUMN total_for_month TYPE NUMERIC(18,2);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Add comment for documentation
COMMENT ON TABLE employee_commission_monthly IS 'Commission data with NUMERIC(18,2) fields to handle values up to 999 trillion';
