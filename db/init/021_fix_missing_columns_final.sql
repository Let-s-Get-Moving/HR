-- Final fix for all missing columns and database issues

-- Fix departments table - add description column
DO $$ BEGIN
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Fix leave_requests table - add leave_type column
DO $$ BEGIN
    ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Fix job_postings table - add missing columns
DO $$ BEGIN
    ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS location_id INTEGER;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS department_id INTEGER;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add foreign key constraint for department_id in job_postings
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_postings' AND column_name='department_id') THEN
        ALTER TABLE job_postings ADD CONSTRAINT fk_job_posting_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create candidates table if it doesn't exist
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    resume_url TEXT,
    job_posting_id INT REFERENCES job_postings(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Applied',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create interviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_posting_id INT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    interview_type VARCHAR(50) NOT NULL,
    interviewer_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fix commission_structures table - add department_id
DO $$ BEGIN
    ALTER TABLE commission_structures ADD COLUMN IF NOT EXISTS department_id INT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add foreign key constraint for department_id in commission_structures
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commission_structures' AND column_name='department_id') THEN
        ALTER TABLE commission_structures ADD CONSTRAINT fk_commission_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix bonus_structures table - add department_id
DO $$ BEGIN
    ALTER TABLE bonus_structures ADD COLUMN IF NOT EXISTS department_id INT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add foreign key constraint for department_id in bonus_structures
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bonus_structures' AND column_name='department_id') THEN
        ALTER TABLE bonus_structures ADD CONSTRAINT fk_bonus_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix the problematic index from 009_database_optimization.sql
DROP INDEX IF EXISTS idx_time_entries_work_date_employee_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_work_date_employee_id ON time_entries (employee_id, work_date);

-- Add submission_id to time_entries table if not exists
DO $$ BEGIN
    ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS submission_id INT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add foreign key constraint if submission_id exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='time_entries' AND column_name='submission_id') THEN
        ALTER TABLE time_entries ADD CONSTRAINT fk_time_entry_submission
        FOREIGN KEY (submission_id) REFERENCES payroll_submissions(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_job_posting ON candidates(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_posting ON interviews(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);

-- Insert some sample data to test the tables
INSERT INTO departments (name, description) VALUES
('Human Resources', 'Handles employee relations and HR processes'),
('Engineering', 'Software development and technical operations'),
('Marketing', 'Brand management and customer acquisition'),
('Sales', 'Customer acquisition and revenue generation'),
('Finance', 'Financial planning and accounting')
ON CONFLICT (name) DO NOTHING;

-- Insert sample job postings
INSERT INTO job_postings (title, description, requirements, location_id, department_id, status) VALUES
('Senior Software Engineer', 'Develop and maintain web applications', '5+ years experience, Node.js, React', 5, 2, 'Open'),
('HR Manager', 'Manage HR operations and employee relations', '3+ years HR experience, degree preferred', 1, 1, 'Open'),
('Marketing Specialist', 'Create and execute marketing campaigns', '2+ years marketing experience', 2, 3, 'Open')
ON CONFLICT DO NOTHING;

COMMIT;
