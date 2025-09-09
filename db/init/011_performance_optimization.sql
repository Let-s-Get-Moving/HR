-- Performance optimization for slow queries
-- This addresses the 1+ second query times

-- Add indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON employees(employment_type);
CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON employees(termination_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_left_early ON time_entries(left_early);
CREATE INDEX IF NOT EXISTS idx_time_entries_was_late ON time_entries(was_late);

-- Optimize the slow compliance query
CREATE INDEX IF NOT EXISTS idx_employees_status_active ON employees(status) WHERE status = 'Active';

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_employees_status_employment ON employees(status, employment_type);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_early ON time_entries(employee_id, left_early);

-- Analyze tables to update statistics
ANALYZE employees;
ANALYZE time_entries;
ANALYZE payroll_calculations;
ANALYZE leave_requests;
