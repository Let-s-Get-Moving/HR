-- Fix payroll submissions table for deployment
-- This ensures the table exists and has proper structure

-- Create payroll_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS payroll_submissions (
    id SERIAL PRIMARY KEY,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    period_name VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Processed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add submission_id column to payroll_calculations if it doesn't exist
DO $$ BEGIN
    ALTER TABLE payroll_calculations ADD COLUMN IF NOT EXISTS submission_id INTEGER;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_calculations' AND column_name='submission_id') THEN
        ALTER TABLE payroll_calculations ADD CONSTRAINT fk_payroll_calculation_submission
        FOREIGN KEY (submission_id) REFERENCES payroll_submissions(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_submissions_date ON payroll_submissions(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_submission ON payroll_calculations(submission_id);

-- Sample payroll submissions removed - create via Payroll Import
-- INSERT INTO payroll_submissions (period_name, notes, submission_date, status) VALUES
-- ('August 2025', 'Monthly payroll for August 2025', '2025-08-31 10:00:00', 'Processed'),
-- ('September 2025', 'Monthly payroll for September 2025', '2025-09-30 10:00:00', 'Processed'),
-- ('October 2025', 'Monthly payroll for October 2025', '2025-10-31 10:00:00', 'Processed')
-- ON CONFLICT DO NOTHING;

COMMIT;
