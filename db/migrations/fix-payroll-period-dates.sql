-- Migration: Fix payroll period dates (Mon-Sun periods, pay_date = period_end + 5)
-- Date: 2026-01-14
-- Description: Updates pay period logic from Sat-Fri to Mon-Sun, with Friday pay dates
--              5 days after period end (instead of 7 or 1 day)

-- ============================================================================
-- PART 1: Update helper functions
-- ============================================================================

-- Update auto_create_payroll_from_timecards trigger function
-- Change pay_date from period_end + 1 to period_end + 5
CREATE OR REPLACE FUNCTION auto_create_payroll_from_timecards()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_id INTEGER;
    v_pay_period_start DATE;
    v_pay_period_end DATE;
    v_pay_date DATE;
    v_total_hours NUMERIC;
    v_overtime_hours NUMERIC;
    v_regular_hours NUMERIC;
    v_hourly_rate NUMERIC;
    v_overtime_multiplier NUMERIC;
    v_regular_pay NUMERIC;
    v_overtime_pay NUMERIC;
    v_gross_pay NUMERIC;
    v_vacation_hours NUMERIC;
    v_vacation_pay NUMERIC;
    v_net_pay NUMERIC;
    v_all_approved BOOLEAN;
BEGIN
    -- Only proceed if the timecard was just approved
    IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
        
        v_employee_id := NEW.employee_id;
        v_pay_period_start := NEW.pay_period_start;
        v_pay_period_end := NEW.pay_period_end;
        
        -- Check if ALL timecards for this employee and pay period are approved
        SELECT 
            COUNT(*) FILTER (WHERE status != 'Approved') = 0
        INTO v_all_approved
        FROM timecards
        WHERE employee_id = v_employee_id
          AND pay_period_start = v_pay_period_start
          AND pay_period_end = v_pay_period_end;
        
        -- If all timecards are approved, calculate and create/update payroll
        IF v_all_approved THEN
            
            -- Calculate pay date (Friday, 5 days after Sunday period end)
            v_pay_date := v_pay_period_end + INTERVAL '5 days';
            
            -- Get total hours and overtime
            SELECT 
                COALESCE(SUM(total_hours), 0),
                COALESCE(SUM(overtime_hours), 0)
            INTO v_total_hours, v_overtime_hours
            FROM timecards
            WHERE employee_id = v_employee_id
              AND pay_period_start = v_pay_period_start
              AND pay_period_end = v_pay_period_end
              AND status = 'Approved';
            
            -- Calculate regular hours (total - overtime)
            v_regular_hours := v_total_hours - v_overtime_hours;
            
            -- Get employee's hourly rate and overtime policy multiplier
            SELECT 
                COALESCE(e.hourly_rate, 0),
                COALESCE(op.multiplier, 1.0)
            INTO STRICT v_hourly_rate, v_overtime_multiplier
            FROM employees e
            LEFT JOIN overtime_policies op ON e.overtime_policy_id = op.id
            WHERE e.id = v_employee_id;
            
            -- Calculate pay using overtime policy multiplier (defaults to 1.0 if no policy)
            v_regular_pay := v_regular_hours * v_hourly_rate;
            v_overtime_pay := v_overtime_hours * v_hourly_rate * v_overtime_multiplier;
            v_gross_pay := v_regular_pay + v_overtime_pay;
            
            -- Calculate vacation (4%)
            v_vacation_hours := v_total_hours * 0.04;
            v_vacation_pay := v_gross_pay * 0.04;
            
            -- Calculate net pay (no deductions for now)
            v_net_pay := v_gross_pay;
            
            -- Insert or update payroll record
            INSERT INTO payrolls (
                employee_id,
                pay_period_start,
                pay_period_end,
                pay_date,
                regular_hours,
                overtime_hours,
                hourly_rate,
                regular_pay,
                overtime_pay,
                gross_pay,
                vacation_hours_accrued,
                vacation_pay_accrued,
                deductions,
                net_pay,
                calculated_at
            )
            VALUES (
                v_employee_id,
                v_pay_period_start,
                v_pay_period_end,
                v_pay_date,
                v_regular_hours,
                v_overtime_hours,
                v_hourly_rate,
                v_regular_pay,
                v_overtime_pay,
                v_gross_pay,
                v_vacation_hours,
                v_vacation_pay,
                0, -- deductions
                v_net_pay,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (employee_id, pay_period_start, pay_period_end)
            DO UPDATE SET
                regular_hours = EXCLUDED.regular_hours,
                overtime_hours = EXCLUDED.overtime_hours,
                hourly_rate = EXCLUDED.hourly_rate,
                regular_pay = EXCLUDED.regular_pay,
                overtime_pay = EXCLUDED.overtime_pay,
                gross_pay = EXCLUDED.gross_pay,
                vacation_hours_accrued = EXCLUDED.vacation_hours_accrued,
                vacation_pay_accrued = EXCLUDED.vacation_pay_accrued,
                net_pay = EXCLUDED.net_pay,
                calculated_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update get_next_pay_period function
-- Mon-Sun periods, pay_date = period_end + 5
CREATE OR REPLACE FUNCTION get_next_pay_period()
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    pay_date DATE
) AS $$
DECLARE
    base_date DATE := '2025-09-26'::DATE;  -- Reference payday (Friday)
    days_since INTEGER;
    weeks_since INTEGER;
    next_pay_date DATE;
BEGIN
    -- Calculate how many days have passed
    days_since := CURRENT_DATE - base_date;
    
    -- Calculate how many 2-week periods have passed
    weeks_since := FLOOR(days_since / 14.0);
    
    -- Calculate next pay date (Friday, every 2 weeks)
    next_pay_date := base_date + ((weeks_since + 1) * 14);
    
    -- Period ends 5 days before pay date (Sunday)
    period_end := next_pay_date - 5;
    
    -- Period starts 13 days before period end (Monday)
    period_start := period_end - 13;
    
    pay_date := next_pay_date;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Update get_current_pay_period function
-- Mon-Sun periods, pay_date = period_end + 5
CREATE OR REPLACE FUNCTION get_current_pay_period()
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    pay_date DATE
) AS $$
DECLARE
    base_date DATE := '2025-09-26'::DATE;  -- Reference payday (Friday)
    days_since INTEGER;
    weeks_since INTEGER;
    current_pay_date DATE;
BEGIN
    -- Calculate how many days have passed
    days_since := CURRENT_DATE - base_date;
    
    -- Calculate how many complete 2-week periods have passed
    weeks_since := FLOOR(days_since / 14.0);
    
    -- Current period pay date (Friday, every 2 weeks)
    current_pay_date := base_date + (weeks_since * 14);
    
    -- Period ends 5 days before pay date (Sunday)
    period_end := current_pay_date - 5;
    
    -- Period starts 13 days before period end (Monday)
    period_start := period_end - 13;
    
    pay_date := current_pay_date;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: Retroactive data fix for payrolls table
-- ============================================================================

-- Disable vacation balance trigger to prevent double-counting during update
ALTER TABLE payrolls DISABLE TRIGGER trigger_update_vacation_balance;
ALTER TABLE payrolls DISABLE TRIGGER trigger_payrolls_updated_at;

-- Update all payroll records: pay_date should be period_end + 5
UPDATE payrolls 
SET pay_date = pay_period_end + 5 
WHERE pay_date IS DISTINCT FROM (pay_period_end + 5);

-- Re-enable triggers
ALTER TABLE payrolls ENABLE TRIGGER trigger_update_vacation_balance;
ALTER TABLE payrolls ENABLE TRIGGER trigger_payrolls_updated_at;

-- ============================================================================
-- PART 3: Rebuild vacation balances from scratch (clean state)
-- ============================================================================

-- Truncate and rebuild vacation balances to ensure consistency
TRUNCATE employee_vacation_balance;

-- Rebuild from payroll history + payouts
INSERT INTO employee_vacation_balance (
    employee_id,
    vacation_hours_earned,
    vacation_pay_earned,
    vacation_hours_paid,
    vacation_pay_paid,
    vacation_hours_balance,
    vacation_pay_balance,
    last_updated
)
SELECT 
    e.id as employee_id,
    COALESCE(p.total_hours_earned, 0) as vacation_hours_earned,
    COALESCE(p.total_pay_earned, 0) as vacation_pay_earned,
    COALESCE(vp.total_hours_paid, 0) as vacation_hours_paid,
    COALESCE(vp.total_pay_paid, 0) as vacation_pay_paid,
    COALESCE(p.total_hours_earned, 0) - COALESCE(vp.total_hours_paid, 0) as vacation_hours_balance,
    COALESCE(p.total_pay_earned, 0) - COALESCE(vp.total_pay_paid, 0) as vacation_pay_balance,
    CURRENT_TIMESTAMP as last_updated
FROM employees e
LEFT JOIN (
    -- Sum all vacation accrued from payrolls
    SELECT 
        employee_id,
        SUM(vacation_hours_accrued) as total_hours_earned,
        SUM(vacation_pay_accrued) as total_pay_earned
    FROM payrolls
    GROUP BY employee_id
) p ON e.id = p.employee_id
LEFT JOIN (
    -- Sum all vacation payouts
    SELECT 
        employee_id,
        SUM(vacation_hours_paid) as total_hours_paid,
        SUM(vacation_pay_amount) as total_pay_paid
    FROM vacation_payouts
    GROUP BY employee_id
) vp ON e.id = vp.employee_id
WHERE p.employee_id IS NOT NULL OR vp.employee_id IS NOT NULL;

-- ============================================================================
-- Verification queries (run these to confirm the migration worked)
-- ============================================================================

-- Check payroll pay_dates are now period_end + 5
-- SELECT pay_period_start, pay_period_end, pay_date, 
--        (pay_period_end + 5) as expected_pay_date,
--        pay_date = (pay_period_end + 5) as is_correct
-- FROM payrolls
-- ORDER BY pay_period_end DESC
-- LIMIT 10;

-- Check vacation balances match history
-- SELECT 
--     evb.employee_id,
--     evb.vacation_hours_earned,
--     evb.vacation_hours_paid,
--     evb.vacation_hours_balance,
--     (evb.vacation_hours_earned - evb.vacation_hours_paid) as calculated_balance,
--     evb.vacation_hours_balance = (evb.vacation_hours_earned - evb.vacation_hours_paid) as balance_correct
-- FROM employee_vacation_balance evb
-- LIMIT 10;

COMMIT;
