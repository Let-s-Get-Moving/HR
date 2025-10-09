-- =====================================================
-- PAYROLL SYSTEM REWORK - Automated Calculation Based on Timecards
-- =====================================================
-- This migration replaces the old payroll_submissions system
-- with an automated payroll calculation system based on:
-- - Timecard hours
-- - Employee hourly rates
-- - 4% vacation accrual (accumulated, not paid out immediately)
-- - Bi-weekly pay periods (last payout: Sept 26, next: Oct 10)
-- =====================================================

-- ===== VACATION BALANCE TABLE =====
-- Tracks accumulated vacation pay for each employee
CREATE TABLE IF NOT EXISTS employee_vacation_balance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    vacation_hours_earned NUMERIC(10,2) DEFAULT 0,  -- 4% of hours worked
    vacation_hours_paid NUMERIC(10,2) DEFAULT 0,    -- Hours paid out
    vacation_hours_balance NUMERIC(10,2) DEFAULT 0, -- Current balance
    vacation_pay_earned NUMERIC(10,2) DEFAULT 0,    -- $ earned
    vacation_pay_paid NUMERIC(10,2) DEFAULT 0,      -- $ paid out
    vacation_pay_balance NUMERIC(10,2) DEFAULT 0,   -- Current $ balance
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);

-- ===== MAIN PAYROLL TABLE =====
-- Stores actual payroll records (one per employee per pay period)
CREATE TABLE IF NOT EXISTS payrolls (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Pay Period Info
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    
    -- Hours & Rate
    regular_hours NUMERIC(10,2) DEFAULT 0,
    overtime_hours NUMERIC(10,2) DEFAULT 0,
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    
    -- Pay Calculation
    regular_pay NUMERIC(10,2) DEFAULT 0,        -- regular_hours × hourly_rate
    overtime_pay NUMERIC(10,2) DEFAULT 0,       -- overtime_hours × (hourly_rate × 1.5)
    gross_pay NUMERIC(10,2) DEFAULT 0,          -- regular_pay + overtime_pay
    
    -- Vacation Accrual (4% of gross pay)
    vacation_hours_accrued NUMERIC(10,2) DEFAULT 0,  -- 4% of total hours
    vacation_pay_accrued NUMERIC(10,2) DEFAULT 0,    -- 4% of gross pay
    
    -- Deductions (for future use)
    deductions NUMERIC(10,2) DEFAULT 0,
    
    -- Net Pay
    net_pay NUMERIC(10,2) DEFAULT 0,            -- gross_pay - deductions
    
    -- Status
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Paid')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Ensure one payroll per employee per period
    UNIQUE(employee_id, pay_period_start, pay_period_end)
);

-- ===== VACATION PAYOUT RECORDS =====
-- Tracks when vacation pay is paid out to employees
CREATE TABLE IF NOT EXISTS vacation_payouts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payout_date DATE NOT NULL,
    vacation_hours_paid NUMERIC(10,2) NOT NULL,
    vacation_pay_amount NUMERIC(10,2) NOT NULL,
    hourly_rate_at_payout NUMERIC(10,2) NOT NULL,
    notes TEXT,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_period ON payrolls(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls(status);
CREATE INDEX IF NOT EXISTS idx_payrolls_pay_date ON payrolls(pay_date);
CREATE INDEX IF NOT EXISTS idx_vacation_balance_employee ON employee_vacation_balance(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_payouts_employee ON vacation_payouts(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_payouts_date ON vacation_payouts(payout_date);

-- ===== TRIGGER: Update vacation balance after payroll =====
CREATE OR REPLACE FUNCTION update_vacation_balance_from_payroll()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update vacation balance
    INSERT INTO employee_vacation_balance (
        employee_id,
        vacation_hours_earned,
        vacation_pay_earned,
        vacation_hours_balance,
        vacation_pay_balance,
        last_updated
    )
    VALUES (
        NEW.employee_id,
        NEW.vacation_hours_accrued,
        NEW.vacation_pay_accrued,
        NEW.vacation_hours_accrued,
        NEW.vacation_pay_accrued,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (employee_id) DO UPDATE SET
        vacation_hours_earned = employee_vacation_balance.vacation_hours_earned + NEW.vacation_hours_accrued,
        vacation_pay_earned = employee_vacation_balance.vacation_pay_earned + NEW.vacation_pay_accrued,
        vacation_hours_balance = employee_vacation_balance.vacation_hours_balance + NEW.vacation_hours_accrued,
        vacation_pay_balance = employee_vacation_balance.vacation_pay_balance + NEW.vacation_pay_accrued,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to payrolls table (only when status becomes 'Approved')
DROP TRIGGER IF EXISTS trigger_update_vacation_balance ON payrolls;
CREATE TRIGGER trigger_update_vacation_balance
    AFTER INSERT OR UPDATE OF status ON payrolls
    FOR EACH ROW
    WHEN (NEW.status = 'Approved')
    EXECUTE FUNCTION update_vacation_balance_from_payroll();

-- ===== TRIGGER: Update vacation balance after payout =====
CREATE OR REPLACE FUNCTION update_vacation_balance_from_payout()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct from vacation balance
    UPDATE employee_vacation_balance
    SET 
        vacation_hours_paid = vacation_hours_paid + NEW.vacation_hours_paid,
        vacation_pay_paid = vacation_pay_paid + NEW.vacation_pay_amount,
        vacation_hours_balance = vacation_hours_balance - NEW.vacation_hours_paid,
        vacation_pay_balance = vacation_pay_balance - NEW.vacation_pay_amount,
        last_updated = CURRENT_TIMESTAMP
    WHERE employee_id = NEW.employee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to vacation_payouts table
DROP TRIGGER IF EXISTS trigger_update_vacation_balance_payout ON vacation_payouts;
CREATE TRIGGER trigger_update_vacation_balance_payout
    AFTER INSERT ON vacation_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_vacation_balance_from_payout();

-- ===== TRIGGER: Auto-update timestamps =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payrolls_updated_at ON payrolls;
CREATE TRIGGER trigger_payrolls_updated_at
    BEFORE UPDATE ON payrolls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_vacation_payouts_updated_at ON vacation_payouts;
CREATE TRIGGER trigger_vacation_payouts_updated_at
    BEFORE UPDATE ON vacation_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== HELPER FUNCTION: Calculate next pay period dates =====
-- Based on bi-weekly schedule (last payout: Sept 26, 2025)
CREATE OR REPLACE FUNCTION get_next_pay_period()
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    pay_date DATE
) AS $$
DECLARE
    base_date DATE := '2025-09-26'::DATE;  -- Last payout date
    weeks_since INTEGER;
    next_pay_date DATE;
BEGIN
    -- Calculate how many 2-week periods have passed
    weeks_since := FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - base_date)) / (14 * 24 * 60 * 60));
    
    -- Calculate next pay date
    next_pay_date := base_date + ((weeks_since + 1) * 14);
    
    -- Period ends the day before pay date
    period_end := next_pay_date - 1;
    
    -- Period starts 14 days before period end
    period_start := period_end - 13;
    
    pay_date := next_pay_date;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ===== HELPER FUNCTION: Get current pay period =====
CREATE OR REPLACE FUNCTION get_current_pay_period()
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    pay_date DATE
) AS $$
DECLARE
    base_date DATE := '2025-09-26'::DATE;
    weeks_since INTEGER;
    current_pay_date DATE;
BEGIN
    -- Calculate how many complete 2-week periods have passed
    weeks_since := FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - base_date)) / (14 * 24 * 60 * 60));
    
    -- Current period pay date
    current_pay_date := base_date + (weeks_since * 14);
    
    -- Period ends the day before pay date
    period_end := current_pay_date - 1;
    
    -- Period starts 14 days before period end
    period_start := period_end - 13;
    
    pay_date := current_pay_date;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ===== HELPER VIEW: Payroll Summary =====
CREATE OR REPLACE VIEW payroll_summary AS
SELECT 
    p.id,
    p.employee_id,
    e.first_name,
    e.last_name,
    e.email,
    d.name as department,
    p.pay_period_start,
    p.pay_period_end,
    p.pay_date,
    p.regular_hours,
    p.overtime_hours,
    (p.regular_hours + p.overtime_hours) as total_hours,
    p.hourly_rate,
    p.regular_pay,
    p.overtime_pay,
    p.gross_pay,
    p.vacation_hours_accrued,
    p.vacation_pay_accrued,
    p.deductions,
    p.net_pay,
    p.status,
    p.created_at,
    p.approved_by,
    p.approved_at
FROM payrolls p
JOIN employees e ON p.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

-- ===== HELPER VIEW: Employee Vacation Summary =====
CREATE OR REPLACE VIEW employee_vacation_summary AS
SELECT 
    vb.employee_id,
    e.first_name,
    e.last_name,
    e.email,
    e.hourly_rate,
    vb.vacation_hours_earned,
    vb.vacation_hours_paid,
    vb.vacation_hours_balance,
    vb.vacation_pay_earned,
    vb.vacation_pay_paid,
    vb.vacation_pay_balance,
    vb.last_updated
FROM employee_vacation_balance vb
JOIN employees e ON vb.employee_id = e.id;

COMMIT;

