-- Integrate Settings Features with Employees Table
-- Adds foreign key columns to link employees with job titles, benefits packages, work schedules, and policies

-- Add foreign key columns to employees table
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS job_title_id INT REFERENCES job_titles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS benefits_package_id INT REFERENCES benefits_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_schedule_id INT REFERENCES work_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS overtime_policy_id INT REFERENCES overtime_policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendance_policy_id INT REFERENCES attendance_policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remote_work_policy_id INT REFERENCES remote_work_policies(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_job_title ON employees(job_title_id);
CREATE INDEX IF NOT EXISTS idx_employees_benefits_package ON employees(benefits_package_id);
CREATE INDEX IF NOT EXISTS idx_employees_work_schedule ON employees(work_schedule_id);
CREATE INDEX IF NOT EXISTS idx_employees_overtime_policy ON employees(overtime_policy_id);
CREATE INDEX IF NOT EXISTS idx_employees_attendance_policy ON employees(attendance_policy_id);
CREATE INDEX IF NOT EXISTS idx_employees_remote_work_policy ON employees(remote_work_policy_id);

-- Create default overtime policy with 1.0x multiplier (same as regular time)
INSERT INTO overtime_policies (name, description, weekly_threshold_hours, daily_threshold_hours, multiplier, requires_approval, applies_to_type)
VALUES ('Default - Same as Regular Time', 'Default policy: overtime paid same as regular time (1.0x multiplier)', 40.0, 8.0, 1.0, false, 'All')
ON CONFLICT (name) DO NOTHING;

