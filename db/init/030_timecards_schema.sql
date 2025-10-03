-- SAFE MIGRATION: Timecards Schema
-- Comprehensive timecard management system for tracking employee work hours
-- This migration will NOT drop existing data on redeployment
-- Fixed: 2025-10-03 to prevent data loss during Render deployments

-- Main timecards table (one per employee per pay period)
-- ONLY created if it doesn't already exist (preserves existing data)
CREATE TABLE IF NOT EXISTS timecards (
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
    upload_id INTEGER,
    group_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'timecards_employee_id_pay_period_start_pay_period_end_key'
    ) THEN
        ALTER TABLE timecards ADD CONSTRAINT timecards_employee_id_pay_period_start_pay_period_end_key 
            UNIQUE(employee_id, pay_period_start, pay_period_end);
    END IF;
END $$;

-- Timecard entries (individual clock-in/out records)
-- ONLY created if it doesn't already exist (preserves existing data)
CREATE TABLE IF NOT EXISTS timecard_entries (
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

-- Indexes for better performance (IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timecards_employee') THEN
        CREATE INDEX idx_timecards_employee ON timecards(employee_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timecards_period') THEN
        CREATE INDEX idx_timecards_period ON timecards(pay_period_start, pay_period_end);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timecards_status') THEN
        CREATE INDEX idx_timecards_status ON timecards(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timecard_entries_timecard') THEN
        CREATE INDEX idx_timecard_entries_timecard ON timecard_entries(timecard_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timecard_entries_employee_date') THEN
        CREATE INDEX idx_timecard_entries_employee_date ON timecard_entries(employee_id, work_date);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timecard_entries_date') THEN
        CREATE INDEX idx_timecard_entries_date ON timecard_entries(work_date);
    END IF;
END $$;

-- Trigger to update timecard totals when entries change
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

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_timecard_totals ON timecard_entries;
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

-- Drop triggers if exist, then create
DROP TRIGGER IF EXISTS trigger_timecards_updated_at ON timecards;
CREATE TRIGGER trigger_timecards_updated_at
BEFORE UPDATE ON timecards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_timecard_entries_updated_at ON timecard_entries;
CREATE TRIGGER trigger_timecard_entries_updated_at
BEFORE UPDATE ON timecard_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments (safe to run multiple times)
COMMENT ON TABLE timecards IS 'Main timecard records for each employee per pay period';
COMMENT ON TABLE timecard_entries IS 'Individual clock-in/out entries for each work day';
COMMENT ON COLUMN timecard_entries.work_time IS 'Calculated time duration between clock_in and clock_out';
COMMENT ON COLUMN timecard_entries.hours_worked IS 'Hours worked in decimal format (e.g., 8.25 for 8 hours 15 minutes)';
