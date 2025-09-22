-- Fix database errors from deployment

-- 1. Fix departments table - add missing description column
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Fix job_postings table - add missing columns
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);

-- 3. Fix leave_requests table - add missing leave_type column
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50) DEFAULT 'Annual';

-- 4. Create candidates table if it doesn't exist
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    resume_url TEXT,
    status VARCHAR(50) DEFAULT 'Applied',
    applied_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create job_postings table if it doesn't exist (with all required columns)
CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    location_id INTEGER REFERENCES locations(id),
    employment_type VARCHAR(50),
    description TEXT,
    requirements TEXT,
    salary_range VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Open',
    posted_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create interviews table (fix the foreign key references)
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

-- 7. Create payroll_submissions table
CREATE TABLE IF NOT EXISTS payroll_submissions (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(255) NOT NULL,
    notes TEXT,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Processed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Add submission_id to payroll_calculations table
ALTER TABLE payroll_calculations 
ADD COLUMN IF NOT EXISTS submission_id INTEGER REFERENCES payroll_submissions(id) ON DELETE CASCADE;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_submissions_date ON payroll_submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_payroll_calculations_submission ON payroll_calculations(submission_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);

-- 10. Fix the problematic index in 009_database_optimization.sql
-- Drop the problematic index if it exists
DROP INDEX IF EXISTS idx_employees_search;

-- Create a proper search index
CREATE INDEX IF NOT EXISTS idx_employees_search ON employees USING gin(
    to_tsvector('english', 
        COALESCE(first_name, '') || ' ' || 
        COALESCE(last_name, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(role_title, '')
    )
);

-- 11. Insert sample data for testing
INSERT INTO candidates (first_name, last_name, email, phone, status) VALUES
('John', 'Doe', 'john.doe@example.com', '+1-555-0123', 'Applied'),
('Jane', 'Smith', 'jane.smith@example.com', '+1-555-0124', 'Interviewed'),
('Bob', 'Johnson', 'bob.johnson@example.com', '+1-555-0125', 'Applied')
ON CONFLICT (email) DO NOTHING;

INSERT INTO job_postings (title, department_id, location_id, employment_type, description, requirements, salary_range, status) VALUES
('Software Engineer', 1, 1, 'Full-time', 'Full-stack developer position', '3+ years experience', '$80,000 - $120,000', 'Open'),
('HR Manager', 2, 2, 'Full-time', 'Manage HR operations', '5+ years HR experience', '$70,000 - $90,000', 'Open'),
('Marketing Specialist', 3, 3, 'Full-time', 'Digital marketing role', '2+ years marketing experience', '$50,000 - $70,000', 'Open')
ON CONFLICT DO NOTHING;

INSERT INTO payroll_submissions (period_name, notes, submission_date, status) VALUES
('August 2025', 'Monthly payroll for August 2025', '2025-08-31 10:00:00', 'Processed'),
('September 2025', 'Monthly payroll for September 2025', '2025-09-30 10:00:00', 'Processed'),
('October 2025', 'Monthly payroll for October 2025', '2025-10-31 10:00:00', 'Processed')
ON CONFLICT DO NOTHING;

-- 12. Update departments with descriptions
UPDATE departments SET description = 'Software development and engineering' WHERE name = 'Engineering';
UPDATE departments SET description = 'Human resources and employee management' WHERE name = 'HR';
UPDATE departments SET description = 'Marketing and communications' WHERE name = 'Marketing';
UPDATE departments SET description = 'Sales and business development' WHERE name = 'Sales';
UPDATE departments SET description = 'Finance and accounting' WHERE name = 'Finance';

-- 13. Update leave_requests with proper leave_type values
UPDATE leave_requests SET leave_type = 'Annual' WHERE leave_type IS NULL OR leave_type = '';

COMMIT;
