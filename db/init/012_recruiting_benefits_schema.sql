-- Recruiting and Benefits Management Schema
-- This file creates the necessary tables for recruiting and benefits functionality

-- Add missing columns to existing job_postings table
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_range VARCHAR(100);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS requirements TEXT;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    position_id INTEGER REFERENCES job_postings(id),
    experience_years INTEGER,
    source VARCHAR(100),
    resume_url TEXT,
    cover_letter TEXT,
    status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Interview Scheduled', 'Interviewed', 'Hired', 'Rejected', 'Withdrawn')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id),
    job_posting_id INTEGER REFERENCES job_postings(id),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Interview Scheduled', 'Interviewed', 'Hired', 'Rejected', 'Withdrawn')),
    notes TEXT
);

-- Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id),
    job_posting_id INTEGER REFERENCES job_postings(id),
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    interview_type VARCHAR(20) NOT NULL CHECK (interview_type IN ('Phone', 'Video', 'In-person')),
    interviewer_id INTEGER REFERENCES employees(id),
    location VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benefits Plans Table
CREATE TABLE IF NOT EXISTS benefits_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Health', 'Dental', 'Vision', 'Life', 'Disability', 'Other')),
    employee_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    employer_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    coverage_details TEXT,
    department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retirement Plans Table
CREATE TABLE IF NOT EXISTS retirement_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('401k', '403b', 'Pension', 'IRA', 'Other')),
    employer_match_percentage DECIMAL(5,2) DEFAULT 0,
    vesting_schedule TEXT,
    contribution_limit DECIMAL(10,2),
    investment_options TEXT,
    management_fees DECIMAL(5,2) DEFAULT 0,
    department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benefits Enrollments Table
CREATE TABLE IF NOT EXISTS benefits_enrollments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    plan_id INTEGER REFERENCES benefits_plans(id),
    enrollment_date DATE NOT NULL,
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Terminated')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retirement Enrollments Table
CREATE TABLE IF NOT EXISTS retirement_enrollments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    plan_id INTEGER REFERENCES retirement_plans(id),
    enrollment_date DATE NOT NULL,
    contribution_percentage DECIMAL(5,2) DEFAULT 0,
    employer_match_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Terminated')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing (DISABLED - no mock data)
-- All mock data removed - employees, users, locations, and candidates will be created through the app

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_candidate ON job_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);
CREATE INDEX IF NOT EXISTS idx_benefits_enrollments_employee ON benefits_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_benefits_enrollments_plan ON benefits_enrollments(plan_id);
CREATE INDEX IF NOT EXISTS idx_retirement_enrollments_employee ON retirement_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_retirement_enrollments_plan ON retirement_enrollments(plan_id);
