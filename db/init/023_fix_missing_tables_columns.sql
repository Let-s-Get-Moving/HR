-- Fix missing tables and columns for payroll and interviews

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

-- Create payroll_calculations table if it doesn't exist
CREATE TABLE IF NOT EXISTS payroll_calculations (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    period_id INT,
    submission_id INT,
    work_date DATE,
    base_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    regular_rate DECIMAL(10,2) DEFAULT 0,
    overtime_rate DECIMAL(10,2) DEFAULT 0,
    gross_pay DECIMAL(10,2) DEFAULT 0,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    total_gross DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add status column to interviews table if it doesn't exist
DO $$ BEGIN
    ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Scheduled';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_calculations' AND column_name='submission_id') THEN
        ALTER TABLE payroll_calculations ADD CONSTRAINT fk_payroll_calculation_submission
        FOREIGN KEY (submission_id) REFERENCES payroll_submissions(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_submissions_date ON payroll_submissions(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_employee ON payroll_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_submission ON payroll_calculations(submission_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

COMMIT;
