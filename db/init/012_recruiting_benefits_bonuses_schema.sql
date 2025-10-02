-- Recruiting and Benefits Management Schema
-- This file creates all the missing tables for recruiting, benefits, and bonuses/commissions

-- =============================================
-- RECRUITING TABLES
-- =============================================

-- Add missing columns to existing job_postings table
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_range VARCHAR(100);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS requirements TEXT;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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
-- SAMPLE DATA (DISABLED - no mock data)
-- =============================================

-- All mock data removed - employees, users, locations, and candidates will be created through the app
