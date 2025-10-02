-- Timecard Uploads Schema
-- Stores uploaded timecard files and their display data

-- Create timecard uploads table (one record per file upload)
CREATE TABLE IF NOT EXISTS timecard_uploads (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    employee_count INTEGER DEFAULT 0,
    total_hours NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'processed' CHECK (status IN ('processing', 'processed', 'error')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modify timecards table to link to uploads
DO $$ BEGIN
    ALTER TABLE timecards ADD COLUMN IF NOT EXISTS upload_id INTEGER REFERENCES timecard_uploads(id) ON DELETE SET NULL;
    ALTER TABLE timecards ADD COLUMN IF NOT EXISTS row_order INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Modify timecard_entries to support Excel display format
DO $$ BEGIN
    -- Add day of week column
    ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS day_of_week TEXT;
    
    -- Add daily total (only populated on first row of each day)
    ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS daily_total NUMERIC(5,2);
    
    -- Add row order for display (to show multiple punches per day in order)
    ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS row_order INTEGER DEFAULT 0;
    
    -- Add flag to indicate if this is the first row of the day
    ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS is_first_row BOOLEAN DEFAULT TRUE;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timecard_uploads_period ON timecard_uploads(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_timecard_uploads_date ON timecard_uploads(upload_date);
CREATE INDEX IF NOT EXISTS idx_timecards_upload ON timecards(upload_id);
CREATE INDEX IF NOT EXISTS idx_timecard_entries_order ON timecard_entries(timecard_id, work_date, row_order);

-- Function to update upload statistics
CREATE OR REPLACE FUNCTION update_upload_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE timecard_uploads
    SET 
        employee_count = (
            SELECT COUNT(DISTINCT employee_id)
            FROM timecards
            WHERE upload_id = NEW.upload_id
        ),
        total_hours = (
            SELECT COALESCE(SUM(total_hours), 0)
            FROM timecards
            WHERE upload_id = NEW.upload_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.upload_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update upload stats when timecards change
DROP TRIGGER IF EXISTS trigger_update_upload_stats ON timecards;
CREATE TRIGGER trigger_update_upload_stats
AFTER INSERT OR UPDATE ON timecards
FOR EACH ROW
WHEN (NEW.upload_id IS NOT NULL)
EXECUTE FUNCTION update_upload_stats();

-- Comments
COMMENT ON TABLE timecard_uploads IS 'Tracks uploaded timecard files and their metadata';
COMMENT ON COLUMN timecard_entries.day_of_week IS 'Day of week (MON, TUE, etc.) for display';
COMMENT ON COLUMN timecard_entries.daily_total IS 'Total hours for the day (only on first row)';
COMMENT ON COLUMN timecard_entries.row_order IS 'Order of multiple clock-in/out entries for same day';
COMMENT ON COLUMN timecard_entries.is_first_row IS 'TRUE if first row of the day (shows day/date)';

