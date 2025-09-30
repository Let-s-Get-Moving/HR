-- Create payroll_submissions table
CREATE TABLE IF NOT EXISTS payroll_submissions (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(255) NOT NULL,
    notes TEXT,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Processed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add submission_id to payroll_calculations table
ALTER TABLE payroll_calculations 
ADD COLUMN IF NOT EXISTS submission_id INTEGER REFERENCES payroll_submissions(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_submissions_date ON payroll_submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_submission ON payroll_calculations(submission_id);

-- Sample payroll submissions removed - create via Payroll Import
-- INSERT INTO payroll_submissions (period_name, notes, submission_date, status) VALUES
-- ('August 2025', 'Monthly payroll for August 2025', '2025-08-31 10:00:00', 'Processed'),
-- ('September 2025', 'Monthly payroll for September 2025', '2025-09-30 10:00:00', 'Processed'),
-- ('October 2025', 'Monthly payroll for October 2025', '2025-10-31 10:00:00', 'Processed')
-- ON CONFLICT DO NOTHING;
