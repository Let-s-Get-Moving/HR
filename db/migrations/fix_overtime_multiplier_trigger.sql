-- Fix overtime multiplier in payroll trigger function
-- Updates auto_create_payroll_from_timecards() to use overtime policy multiplier from settings
-- instead of hardcoded 1.5 multiplier

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
            
            -- Calculate pay date (day after period end)
            v_pay_date := v_pay_period_end + INTERVAL '1 day';
            
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

