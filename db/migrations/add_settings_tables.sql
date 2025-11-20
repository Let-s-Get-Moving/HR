-- Add settings tables for advanced HR configuration
-- Creates tables for: job_titles, benefits_packages, work_schedules, overtime_policies, attendance_policies, remote_work_policies

-- Job Titles/Positions
CREATE TABLE IF NOT EXISTS job_titles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  level_grade VARCHAR(50),
  reports_to_id INT REFERENCES job_titles(id) ON DELETE SET NULL,
  min_salary DECIMAL(10, 2),
  max_salary DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, department_id)
);

CREATE INDEX IF NOT EXISTS idx_job_titles_department ON job_titles(department_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_reports_to ON job_titles(reports_to_id);

-- Benefits Packages
CREATE TABLE IF NOT EXISTS benefits_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  benefit_types JSONB DEFAULT '[]'::jsonb,
  coverage_level VARCHAR(50) CHECK (coverage_level IN ('Basic', 'Standard', 'Premium')) DEFAULT 'Standard',
  employee_cost DECIMAL(10, 2) DEFAULT 0,
  employer_cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Schedules/Shifts
CREATE TABLE IF NOT EXISTS work_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week JSONB DEFAULT '[]'::jsonb,
  break_duration_minutes INT DEFAULT 0,
  flexible_hours BOOLEAN DEFAULT FALSE,
  max_hours_per_week INT DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Overtime Policies
CREATE TABLE IF NOT EXISTS overtime_policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  weekly_threshold_hours DECIMAL(5, 2) DEFAULT 40.0,
  daily_threshold_hours DECIMAL(5, 2) DEFAULT 8.0,
  multiplier DECIMAL(3, 2) DEFAULT 1.5 CHECK (multiplier >= 1.0),
  requires_approval BOOLEAN DEFAULT TRUE,
  applies_to_type VARCHAR(50) CHECK (applies_to_type IN ('All', 'Department', 'JobTitle')) DEFAULT 'All',
  applies_to_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overtime_policies_applies_to ON overtime_policies(applies_to_type, applies_to_id);

-- Attendance Policies
CREATE TABLE IF NOT EXISTS attendance_policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  late_grace_period_minutes INT DEFAULT 15,
  absence_limit_per_month INT DEFAULT 3,
  tardiness_penalty_points INT DEFAULT 1,
  absence_penalty_points INT DEFAULT 3,
  point_threshold_termination INT DEFAULT 10,
  applies_to_type VARCHAR(50) CHECK (applies_to_type IN ('All', 'Department', 'JobTitle')) DEFAULT 'All',
  applies_to_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_policies_applies_to ON attendance_policies(applies_to_type, applies_to_id);

-- Remote Work Policies
CREATE TABLE IF NOT EXISTS remote_work_policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  eligibility_type VARCHAR(50) CHECK (eligibility_type IN ('All', 'Department', 'JobTitle')) DEFAULT 'All',
  eligibility_id INT,
  days_per_week_allowed INT DEFAULT 5 CHECK (days_per_week_allowed >= 0 AND days_per_week_allowed <= 5),
  requires_approval BOOLEAN DEFAULT TRUE,
  equipment_provided TEXT,
  equipment_policy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remote_work_policies_eligibility ON remote_work_policies(eligibility_type, eligibility_id);

-- Add updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_titles_updated_at BEFORE UPDATE ON job_titles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benefits_packages_updated_at BEFORE UPDATE ON benefits_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_schedules_updated_at BEFORE UPDATE ON work_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overtime_policies_updated_at BEFORE UPDATE ON overtime_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_policies_updated_at BEFORE UPDATE ON attendance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remote_work_policies_updated_at BEFORE UPDATE ON remote_work_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

