-- Database optimization and performance improvements

-- Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_location ON employees(location_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);
CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON employees(termination_date);

-- Time entries optimization
CREATE INDEX IF NOT EXISTS idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_out ON time_entries(clock_out);

-- Leave management optimization
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaves_type ON leaves(leave_type);

-- Training optimization
CREATE INDEX IF NOT EXISTS idx_training_records_employee ON training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_records_training ON training_records(training_id);
CREATE INDEX IF NOT EXISTS idx_training_records_expires ON training_records(expires_on);

-- Documents optimization
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded ON documents(uploaded_on);

-- Job postings optimization
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON job_postings(location_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_opened ON job_postings(opened_on);

-- Applications optimization
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied ON applications(applied_on);

-- Payroll optimization
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_run ON payroll_lines(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_employee ON payroll_lines(employee_id);

-- Alerts optimization
CREATE INDEX IF NOT EXISTS idx_alerts_employee ON alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_alerts_due_date ON alerts(due_date);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);

-- Users optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Users don't have a 'role' column anymore, they have 'role_id'
-- CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add constraints for data integrity
ALTER TABLE employees ADD CONSTRAINT chk_hire_termination 
  CHECK (termination_date IS NULL OR termination_date >= hire_date);

ALTER TABLE employees ADD CONSTRAINT chk_probation_end 
  CHECK (probation_end IS NULL OR probation_end >= hire_date);

ALTER TABLE time_entries ADD CONSTRAINT chk_clock_times 
  CHECK (clock_out IS NULL OR clock_in IS NULL OR clock_out > clock_in);

ALTER TABLE leaves ADD CONSTRAINT chk_leave_dates 
  CHECK (end_date >= start_date);

ALTER TABLE training_records ADD CONSTRAINT chk_training_dates 
  CHECK (expires_on IS NULL OR expires_on >= completed_on);

-- Add partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(id) 
  WHERE status = 'Active';

-- Remove problematic partial indexes with functions
-- CREATE INDEX IF NOT EXISTS idx_time_entries_recent ON time_entries(employee_id, work_date) 
--   WHERE work_date >= CURRENT_DATE - INTERVAL '1 year';

-- CREATE INDEX IF NOT EXISTS idx_leaves_current ON leaves(employee_id, start_date, end_date) 
--   WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_employees_dept_status ON employees(department_id, status);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_recent ON time_entries(employee_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_employee_dates ON leaves(employee_id, start_date, end_date);

-- Update table statistics
ANALYZE employees;
ANALYZE time_entries;
ANALYZE leaves;
ANALYZE training_records;
ANALYZE documents;
ANALYZE job_postings;
ANALYZE applications;
ANALYZE payroll_runs;
ANALYZE payroll_lines;
ANALYZE alerts;
ANALYZE users;
