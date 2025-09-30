-- Fix Migration Errors
-- Makes problematic migrations more resilient by adding missing columns and fixing constraints

-- Fix job_postings missing description column (referenced in multiple migrations)
DO $$ BEGIN
    ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Fix performance_goals missing progress_percentage column
DO $$ BEGIN
    ALTER TABLE performance_goals ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC(5,2) DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add created_by column to job_postings if missing
DO $$ BEGIN
    ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS created_by INTEGER;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Make foreign keys more resilient by allowing NULL values where appropriate
-- This prevents foreign key violations in mock data

-- Drop and recreate foreign keys with ON DELETE SET NULL for optional relationships
DO $$ BEGIN
    -- job_postings.created_by can be NULL if creator no longer exists
    ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_created_by_fkey;
    ALTER TABLE job_postings ADD CONSTRAINT job_postings_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- job_postings.location_id can be NULL
    ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_location_id_fkey;
    ALTER TABLE job_postings ADD CONSTRAINT job_postings_location_id_fkey 
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- Add missing tables if they don't exist
CREATE TABLE IF NOT EXISTS employee_events (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_events_employee ON employee_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_events_date ON employee_events(event_date);

-- Add missing payroll_calculations table if it doesn't exist
CREATE TABLE IF NOT EXISTS payroll_calculations (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_pay NUMERIC(12,2),
    net_pay NUMERIC(12,2),
    deductions NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payroll_calculations_employee ON payroll_calculations(employee_id);

-- Clean up any orphaned data that causes foreign key violations
-- This removes mock data that references non-existent employees/users

-- Delete orphaned employee_events
DELETE FROM employee_events 
WHERE employee_id NOT IN (SELECT id FROM employees);

-- Delete orphaned payroll_calculations
DELETE FROM payroll_calculations 
WHERE employee_id NOT IN (SELECT id FROM employees);

-- Delete orphaned bonuses
DELETE FROM bonuses 
WHERE employee_id NOT IN (SELECT id FROM employees);

-- Delete orphaned job_postings with invalid created_by
UPDATE job_postings SET created_by = NULL 
WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users);

-- Delete orphaned job_postings with invalid location_id
UPDATE job_postings SET location_id = NULL 
WHERE location_id IS NOT NULL AND location_id NOT IN (SELECT id FROM locations);

-- Delete orphaned interviews
DO $$ BEGIN
    DELETE FROM interviews 
    WHERE candidate_id NOT IN (SELECT id FROM applications);
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
END $$;

COMMENT ON TABLE employee_events IS 'Employee lifecycle events and milestones';
COMMENT ON TABLE payroll_calculations IS 'Historical payroll calculation records';

