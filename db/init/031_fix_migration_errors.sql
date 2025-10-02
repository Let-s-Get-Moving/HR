-- Comprehensive Migration Error Fix
-- Fixes all foreign key violations and missing columns

-- ============================================
-- PART 1: Add Missing Columns
-- ============================================

-- Fix job_postings missing columns
DO $$ BEGIN
    ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS requirements TEXT;
    ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS created_by INTEGER;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Fix performance_goals missing columns
DO $$ BEGIN
    ALTER TABLE performance_goals ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC(5,2) DEFAULT 0;
    ALTER TABLE performance_goals ADD COLUMN IF NOT EXISTS notes TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- PART 2: Create Missing Tables (idempotent)
-- ============================================

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

-- ============================================
-- PART 3: Make Foreign Keys More Resilient
-- ============================================

-- job_postings.created_by can be NULL
DO $$ BEGIN
    ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_created_by_fkey;
    ALTER TABLE job_postings ADD CONSTRAINT job_postings_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- job_postings.location_id can be NULL
DO $$ BEGIN
    ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_location_id_fkey;
    ALTER TABLE job_postings ADD CONSTRAINT job_postings_location_id_fkey 
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PART 4: Clean Up Orphaned Data
-- ============================================

-- Delete orphaned employee_events (invalid employee_id)
DELETE FROM employee_events 
WHERE employee_id IS NOT NULL 
  AND employee_id NOT IN (SELECT id FROM employees);

-- Delete orphaned payroll_calculations
DELETE FROM payroll_calculations 
WHERE employee_id IS NOT NULL 
  AND employee_id NOT IN (SELECT id FROM employees);

-- Delete orphaned bonuses
DO $$ BEGIN
    DELETE FROM bonuses 
    WHERE employee_id IS NOT NULL 
      AND employee_id NOT IN (SELECT id FROM employees);
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Fix orphaned job_postings (set NULL instead of delete)
UPDATE job_postings SET created_by = NULL 
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (SELECT id FROM users);

UPDATE job_postings SET location_id = NULL 
WHERE location_id IS NOT NULL 
  AND location_id NOT IN (SELECT id FROM locations);

-- Delete orphaned interviews
DO $$ BEGIN
    DELETE FROM interviews 
    WHERE candidate_id IS NOT NULL 
      AND candidate_id NOT IN (SELECT id FROM applications);
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
END $$;

-- ============================================
-- PART 5: Add Missing Columns to Other Tables
-- ============================================

-- Ensure all necessary columns exist in various tables
DO $$ BEGIN
    -- Add any other missing columns here
    ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS notes TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;

-- ============================================
-- PART 6: Prevent Future Errors
-- ============================================

-- Make sure all mock data inserts won't fail
-- by ensuring required reference data exists

-- User creation handled by ensureAdminUser() on server startup
-- No user insertion in init scripts

-- Ensure at least one location exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM locations LIMIT 1) THEN
        INSERT INTO locations (name, region, is_active)
        VALUES ('Default Location', 'N/A', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE employee_events IS 'Employee lifecycle events and milestones';
COMMENT ON TABLE payroll_calculations IS 'Historical payroll calculation records';
COMMENT ON COLUMN job_postings.description IS 'Job description and details';
COMMENT ON COLUMN job_postings.requirements IS 'Job requirements and qualifications';
COMMENT ON COLUMN performance_goals.progress_percentage IS 'Goal completion percentage (0-100)';
COMMENT ON COLUMN performance_goals.notes IS 'Additional notes about the goal';

-- Final success message
DO $$ BEGIN
    RAISE NOTICE '✅ Migration error fixes applied successfully';
END $$;
