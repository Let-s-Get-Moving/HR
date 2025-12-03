-- Drop old commission tables (data now unified in employee_commission_monthly)
-- Migration: drop_old_commission_tables.sql
-- Date: 2025-01-XX
-- 
-- This migration removes the deprecated agent_commission_us and hourly_payout tables
-- as all commission data is now unified in the employee_commission_monthly table
-- with US commission fields (total_us_revenue, commission_pct_us, etc.) and
-- pay period fields (pay_period_1, pay_period_1_cash_paid, etc.) included.

-- Drop indexes on agent_commission_us first
DROP INDEX IF EXISTS idx_agent_commission_us_employee_id;
DROP INDEX IF EXISTS idx_agent_commission_us_period;
DROP INDEX IF EXISTS idx_agent_commission_us_period_start;
DROP INDEX IF EXISTS idx_agent_commission_us_period_end;

-- Drop indexes on hourly_payout first
DROP INDEX IF EXISTS idx_hourly_payout_employee_id;
DROP INDEX IF EXISTS idx_hourly_payout_period;
DROP INDEX IF EXISTS idx_hourly_payout_period_start;
DROP INDEX IF EXISTS idx_hourly_payout_period_end;
DROP INDEX IF EXISTS idx_hourly_payout_unique;
DROP INDEX IF EXISTS idx_hourly_payout_period_month;
DROP INDEX IF EXISTS idx_hourly_payout_name_raw;

-- Drop unique constraints/indexes
DROP INDEX IF EXISTS uq_agent_commission_us_period;
DROP INDEX IF EXISTS uq_hourly_payout_period;

-- Drop triggers
DROP TRIGGER IF EXISTS update_agent_commission_us_updated_at ON agent_commission_us;
DROP TRIGGER IF EXISTS update_hourly_payout_updated_at ON hourly_payout;

-- Drop tables (CASCADE will drop any remaining dependent objects)
DROP TABLE IF EXISTS agent_commission_us CASCADE;
DROP TABLE IF EXISTS hourly_payout CASCADE;

-- Add comments for documentation
COMMENT ON SCHEMA public IS 'Old commission tables (agent_commission_us, hourly_payout) have been removed. All commission data is now in employee_commission_monthly.';

