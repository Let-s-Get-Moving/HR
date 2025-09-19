-- Recruiting and Benefits Management Schema
-- This file creates the necessary tables for recruiting and benefits functionality

-- Job Postings Table
CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    location VARCHAR(255) NOT NULL,
    employment_type VARCHAR(50) NOT NULL CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship')),
    salary_range VARCHAR(100),
    description TEXT,
    requirements TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'On Hold')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Insert sample data for testing
INSERT INTO job_postings (title, department_id, location, employment_type, salary_range, description, requirements, status) VALUES
('Senior Software Engineer', 1, 'Toronto', 'Full-time', '$80,000 - $120,000', 'We are looking for a senior software engineer to join our team.', '5+ years experience, React, Node.js', 'Open'),
('HR Coordinator', 2, 'Vancouver', 'Full-time', '$50,000 - $70,000', 'Join our HR team as a coordinator.', '2+ years HR experience, communication skills', 'Open'),
('Logistics Manager', 3, 'Montreal', 'Full-time', '$70,000 - $90,000', 'Manage our logistics operations.', '3+ years logistics experience, leadership skills', 'Closed');

INSERT INTO candidates (name, email, phone, position_id, experience_years, source, status) VALUES
('Sarah Johnson', 'sarah.johnson@email.com', '+1 (416) 555-0123', 1, 5, 'LinkedIn', 'Interview Scheduled'),
('Michael Chen', 'michael.chen@email.com', '+1 (604) 555-0456', 2, 3, 'Indeed', 'New'),
('Lisa Rodriguez', 'lisa.rodriguez@email.com', '+1 (514) 555-0789', 3, 4, 'Company Website', 'Interviewed');

INSERT INTO job_applications (candidate_id, job_posting_id, status) VALUES
(1, 1, 'Interview Scheduled'),
(2, 2, 'Under Review'),
(3, 3, 'Interviewed');

INSERT INTO benefits_plans (plan_name, provider, type, employee_cost, employer_cost, coverage_details, department_id) VALUES
('Health Plus Plan', 'BlueCross', 'Health', 150.00, 300.00, 'Comprehensive health coverage', NULL),
('Dental Care', 'DentalCorp', 'Dental', 25.00, 75.00, 'Basic dental coverage', NULL),
('Vision Plan', 'VisionCare', 'Vision', 10.00, 20.00, 'Annual eye exams and glasses', NULL);

INSERT INTO retirement_plans (plan_name, provider, plan_type, employer_match_percentage, vesting_schedule, contribution_limit, department_id) VALUES
('401k Plan', 'Fidelity', '401k', 3.00, '3 year vesting', 19500.00, NULL),
('Pension Plan', 'PensionCorp', 'Pension', 0.00, '5 year vesting', 0.00, NULL);

INSERT INTO benefits_enrollments (employee_id, plan_id, enrollment_date, coverage_start_date, status) VALUES
(1, 1, '2025-01-01', '2025-01-01', 'Active'),
(1, 2, '2025-01-01', '2025-01-01', 'Active'),
(2, 1, '2025-01-01', '2025-01-01', 'Active');

INSERT INTO retirement_enrollments (employee_id, plan_id, enrollment_date, contribution_percentage, employer_match_amount, status) VALUES
(1, 1, '2025-01-01', 5.00, 150.00, 'Active'),
(2, 1, '2025-01-01', 3.00, 90.00, 'Active');

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
