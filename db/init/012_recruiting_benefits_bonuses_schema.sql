-- Recruiting and Benefits Management Schema
-- This file creates all the missing tables for recruiting, benefits, and bonuses/commissions

-- =============================================
-- RECRUITING TABLES
-- =============================================

-- Job postings table
CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    location_id INTEGER REFERENCES locations(id),
    employment_type VARCHAR(50) NOT NULL, -- Full-time, Part-time, Contract
    salary_range VARCHAR(100),
    description TEXT NOT NULL,
    requirements TEXT,
    status VARCHAR(50) DEFAULT 'Open', -- Open, Closed, On Hold
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    resume_url TEXT,
    linkedin_url TEXT,
    status VARCHAR(50) DEFAULT 'Applied', -- Applied, Screening, Interview, Hired, Rejected
    source VARCHAR(100), -- LinkedIn, Indeed, Referral, etc.
    experience_years INTEGER,
    current_position VARCHAR(255),
    current_company VARCHAR(255),
    expected_salary INTEGER,
    availability_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job applications table (links candidates to job postings)
CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    job_posting_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Applied', -- Applied, Under Review, Shortlisted, Rejected
    cover_letter TEXT,
    application_notes TEXT,
    UNIQUE(candidate_id, job_posting_id)
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    job_posting_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
    interviewer_id INTEGER REFERENCES users(id),
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    interview_type VARCHAR(50) NOT NULL, -- Video, Phone, In-person
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, Rescheduled
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BENEFITS TABLES
-- =============================================

-- Insurance plans table
CREATE TABLE IF NOT EXISTS insurance_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- Health, Dental, Vision, Life, Disability
    provider VARCHAR(255) NOT NULL,
    coverage_level VARCHAR(100), -- Individual, Family, Employee+1
    monthly_premium DECIMAL(10,2) NOT NULL,
    employer_contribution DECIMAL(10,2) DEFAULT 0,
    employee_contribution DECIMAL(10,2) NOT NULL,
    deductible DECIMAL(10,2),
    co_pay DECIMAL(10,2),
    coverage_details TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retirement plans table
CREATE TABLE IF NOT EXISTS retirement_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 401k, 403b, IRA, Pension
    provider VARCHAR(255) NOT NULL,
    employer_match_percentage DECIMAL(5,2) DEFAULT 0,
    employer_match_limit DECIMAL(10,2),
    vesting_schedule VARCHAR(255),
    contribution_limit DECIMAL(10,2),
    investment_options TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benefits enrollments table
CREATE TABLE IF NOT EXISTS benefits_enrollments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    insurance_plan_id INTEGER REFERENCES insurance_plans(id),
    retirement_plan_id INTEGER REFERENCES retirement_plans(id),
    enrollment_date DATE NOT NULL,
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Inactive, Pending
    beneficiary_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BONUSES AND COMMISSIONS TABLES
-- =============================================

-- Bonus structures table
CREATE TABLE IF NOT EXISTS bonus_structures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL, -- Performance, Annual, Quarterly, Project-based
    calculation_method VARCHAR(100) NOT NULL, -- Fixed, Percentage, Tiered
    base_amount DECIMAL(10,2),
    percentage DECIMAL(5,2),
    criteria JSONB, -- Store criteria as JSON
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commission structures table
CREATE TABLE IF NOT EXISTS commission_structures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL, -- Sales, Revenue, Profit-based
    calculation_method VARCHAR(100) NOT NULL, -- Fixed, Percentage, Tiered
    base_amount DECIMAL(10,2),
    percentage DECIMAL(5,2),
    tiers JSONB, -- Store tier information as JSON
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bonuses table
CREATE TABLE IF NOT EXISTS bonuses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bonus_structure_id INTEGER REFERENCES bonus_structures(id),
    amount DECIMAL(10,2) NOT NULL,
    bonus_period VARCHAR(50) NOT NULL, -- Q1 2024, Annual 2024, etc.
    performance_rating DECIMAL(3,2),
    criteria_met JSONB,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Paid, Rejected
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    commission_structure_id INTEGER REFERENCES commission_structures(id),
    amount DECIMAL(10,2) NOT NULL,
    sales_amount DECIMAL(10,2),
    commission_percentage DECIMAL(5,2),
    commission_period VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Paid, Rejected
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Recruiting indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_job_applications_candidate ON job_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);

-- Benefits indexes
CREATE INDEX IF NOT EXISTS idx_insurance_plans_type ON insurance_plans(type);
CREATE INDEX IF NOT EXISTS idx_insurance_plans_active ON insurance_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_retirement_plans_type ON retirement_plans(type);
CREATE INDEX IF NOT EXISTS idx_retirement_plans_active ON retirement_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_benefits_enrollments_employee ON benefits_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_benefits_enrollments_status ON benefits_enrollments(status);

-- Bonuses and Commissions indexes
CREATE INDEX IF NOT EXISTS idx_bonus_structures_active ON bonus_structures(is_active);
CREATE INDEX IF NOT EXISTS idx_commission_structures_active ON commission_structures(is_active);
CREATE INDEX IF NOT EXISTS idx_bonuses_employee ON bonuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status);
CREATE INDEX IF NOT EXISTS idx_commissions_employee ON commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample job postings (assuming departments and locations exist)
INSERT INTO job_postings (title, department_id, location_id, employment_type, salary_range, description, requirements, created_by) VALUES
('Senior Software Engineer', 1, 1, 'Full-time', '$120,000 - $150,000', 'We are looking for a senior software engineer to join our team...', '5+ years experience, React, Node.js, PostgreSQL', 1),
('HR Manager', 2, 2, 'Full-time', '$80,000 - $100,000', 'Lead our HR team and manage employee relations...', 'Bachelor degree, 3+ years HR experience', 1),
('Sales Representative', 3, 3, 'Full-time', '$60,000 - $80,000 + Commission', 'Drive sales growth and build client relationships...', '2+ years sales experience, excellent communication', 1);

-- Insert sample candidates
INSERT INTO candidates (first_name, last_name, email, phone, status, source, experience_years, current_position, current_company) VALUES
('John', 'Doe', 'john.doe@email.com', '+1-555-0123', 'Applied', 'LinkedIn', 5, 'Software Engineer', 'Tech Corp'),
('Jane', 'Smith', 'jane.smith@email.com', '+1-555-0124', 'Screening', 'Indeed', 3, 'HR Specialist', 'HR Solutions Inc'),
('Mike', 'Johnson', 'mike.johnson@email.com', '+1-555-0125', 'Interview', 'Referral', 2, 'Sales Associate', 'Sales Pro LLC');

-- Insert sample job applications
INSERT INTO job_applications (candidate_id, job_posting_id, status, cover_letter) VALUES
(1, 1, 'Under Review', 'I am excited to apply for the Senior Software Engineer position...'),
(2, 2, 'Shortlisted', 'With my 3 years of HR experience, I believe I would be a great fit...'),
(3, 3, 'Applied', 'I am passionate about sales and building relationships...');

-- Insert sample insurance plans
INSERT INTO insurance_plans (name, type, provider, coverage_level, monthly_premium, employer_contribution, employee_contribution, deductible, co_pay, effective_date) VALUES
('Premium Health Plan', 'Health', 'Blue Cross Blue Shield', 'Family', 800.00, 600.00, 200.00, 1000.00, 25.00, '2024-01-01'),
('Basic Health Plan', 'Health', 'Aetna', 'Individual', 300.00, 200.00, 100.00, 2000.00, 50.00, '2024-01-01'),
('Dental Plan', 'Dental', 'Delta Dental', 'Family', 50.00, 30.00, 20.00, 100.00, 15.00, '2024-01-01');

-- Insert sample retirement plans
INSERT INTO retirement_plans (name, type, provider, employer_match_percentage, employer_match_limit, vesting_schedule, contribution_limit, effective_date) VALUES
('401k Plan', '401k', 'Fidelity', 4.00, 6000.00, '4 year graded vesting', 23000.00, '2024-01-01'),
('Roth 401k', '401k', 'Fidelity', 0.00, 0.00, 'Immediate vesting', 23000.00, '2024-01-01'),
('Pension Plan', 'Pension', 'Vanguard', 0.00, 0.00, '5 year cliff vesting', 0.00, '2024-01-01');

-- Insert sample bonus structures
INSERT INTO bonus_structures (name, description, type, calculation_method, base_amount, percentage, criteria, effective_date) VALUES
('Annual Performance Bonus', 'Year-end performance based bonus', 'Annual', 'Percentage', 0.00, 10.00, '{"min_rating": 3.0, "target_met": true}', '2024-01-01'),
('Quarterly Sales Bonus', 'Quarterly sales achievement bonus', 'Quarterly', 'Fixed', 2500.00, 0.00, '{"sales_target": 100000}', '2024-01-01'),
('Project Completion Bonus', 'Bonus for completing major projects', 'Project-based', 'Fixed', 1000.00, 0.00, '{"project_delivered": true, "on_time": true}', '2024-01-01');

-- Insert sample commission structures
INSERT INTO commission_structures (name, description, type, calculation_method, percentage, tiers, effective_date) VALUES
('Sales Commission', 'Standard sales commission structure', 'Sales', 'Percentage', 5.00, '{"tiers": [{"min": 0, "max": 50000, "rate": 3.0}, {"min": 50000, "max": 100000, "rate": 5.0}, {"min": 100000, "max": null, "rate": 7.0}]}', '2024-01-01'),
('Revenue Commission', 'Revenue-based commission', 'Revenue', 'Percentage', 2.00, '{"tiers": [{"min": 0, "max": 100000, "rate": 1.5}, {"min": 100000, "max": 500000, "rate": 2.0}, {"min": 500000, "max": null, "rate": 2.5}]}', '2024-01-01');

-- Insert sample bonuses
INSERT INTO bonuses (employee_id, bonus_structure_id, amount, bonus_period, performance_rating, status, notes) VALUES
(1, 1, 5000.00, 'Annual 2024', 4.2, 'Approved', 'Excellent performance throughout the year'),
(2, 1, 3000.00, 'Annual 2024', 3.8, 'Pending', 'Good performance, awaiting final review'),
(3, 2, 2500.00, 'Q4 2024', 0.00, 'Approved', 'Exceeded quarterly sales target');

-- Insert sample commissions
INSERT INTO commissions (employee_id, commission_structure_id, amount, sales_amount, commission_percentage, commission_period, status, notes) VALUES
(3, 1, 2500.00, 50000.00, 5.00, 'December 2024', 'Approved', 'Monthly sales commission'),
(3, 1, 3500.00, 70000.00, 5.00, 'January 2025', 'Pending', 'Outstanding sales performance');
