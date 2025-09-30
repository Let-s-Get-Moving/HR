-- Timecards Schema
-- Comprehensive timecard management system for tracking employee work hours

-- Drop existing timecard tables if they exist
DROP TABLE IF EXISTS timecard_entries CASCADE;
DROP TABLE IF EXISTS timecards CASCADE;

-- Main timecards table (one per employee per pay period)
CREATE TABLE timecards (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    total_hours NUMERIC(10,2) DEFAULT 0,
    overtime_hours NUMERIC(10,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, pay_period_start, pay_period_end)
);

-- Timecard entries (individual clock-in/out records)
CREATE TABLE timecard_entries (
    id SERIAL PRIMARY KEY,
    timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    work_time INTERVAL,
    hours_worked NUMERIC(5,2),
    is_overtime BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_timecards_employee ON timecards(employee_id);
CREATE INDEX idx_timecards_period ON timecards(pay_period_start, pay_period_end);
CREATE INDEX idx_timecards_status ON timecards(status);
CREATE INDEX idx_timecard_entries_timecard ON timecard_entries(timecard_id);
CREATE INDEX idx_timecard_entries_employee_date ON timecard_entries(employee_id, work_date);
CREATE INDEX idx_timecard_entries_date ON timecard_entries(work_date);

-- Trigger to update timecard total hours when entries change
CREATE OR REPLACE FUNCTION update_timecard_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE timecards
    SET 
        total_hours = (
            SELECT COALESCE(SUM(hours_worked), 0)
            FROM timecard_entries
            WHERE timecard_id = COALESCE(NEW.timecard_id, OLD.timecard_id)
        ),
        overtime_hours = (
            SELECT COALESCE(SUM(CASE WHEN hours_worked > 8 THEN hours_worked - 8 ELSE 0 END), 0)
            FROM timecard_entries
            WHERE timecard_id = COALESCE(NEW.timecard_id, OLD.timecard_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.timecard_id, OLD.timecard_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timecard_totals
AFTER INSERT OR UPDATE OR DELETE ON timecard_entries
FOR EACH ROW
EXECUTE FUNCTION update_timecard_totals();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_timecards_updated_at
BEFORE UPDATE ON timecards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_timecard_entries_updated_at
BEFORE UPDATE ON timecard_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE timecards IS 'Main timecard records for each employee per pay period';
COMMENT ON TABLE timecard_entries IS 'Individual clock-in/out entries for each work day';
COMMENT ON COLUMN timecard_entries.work_time IS 'Calculated time duration between clock_in and clock_out';
COMMENT ON COLUMN timecard_entries.hours_worked IS 'Hours worked in decimal format (e.g., 8.25 for 8 hours 15 minutes)';

