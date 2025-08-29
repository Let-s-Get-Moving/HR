-- Termination and Offboarding Schema
-- Comprehensive termination tracking and offboarding process

-- Termination details table
CREATE TABLE IF NOT EXISTS termination_details (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  termination_date DATE NOT NULL,
  termination_type TEXT NOT NULL CHECK (termination_type IN ('Voluntary', 'Involuntary', 'Retirement', 'End of Contract')),
  termination_reason TEXT NOT NULL,
  reason_category TEXT CHECK (reason_category IN ('Performance', 'Conduct', 'Redundancy', 'Resignation', 'Health', 'Other')),
  initiated_by TEXT NOT NULL, -- 'Employee' or 'Employer'
  notice_period_days INT DEFAULT 0,
  last_working_day DATE,
  exit_interview_date DATE,
  exit_interview_conducted_by TEXT,
  exit_interview_notes TEXT,
  final_pay_date DATE,
  severance_paid BOOLEAN DEFAULT FALSE,
  severance_amount DECIMAL(10,2) DEFAULT 0,
  vacation_payout DECIMAL(10,2) DEFAULT 0,
  benefits_end_date DATE,
  equipment_returned BOOLEAN DEFAULT FALSE,
  equipment_return_date DATE,
  equipment_return_notes TEXT,
  access_revoked BOOLEAN DEFAULT FALSE,
  access_revoked_date DATE,
  final_documentation_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Termination checklist items
CREATE TABLE IF NOT EXISTS termination_checklist (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  termination_detail_id INT REFERENCES termination_details(id) ON DELETE CASCADE,
  checklist_item TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('HR', 'IT', 'Finance', 'Operations', 'Legal')),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_by TEXT,
  completed_date TIMESTAMP,
  notes TEXT,
  due_date DATE,
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium'
);

-- Termination documents
CREATE TABLE IF NOT EXISTS termination_documents (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  termination_detail_id INT REFERENCES termination_details(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('Termination Letter', 'Release Agreement', 'ROE', 'Final Pay Statement', 'Benefits Termination', 'Equipment Return', 'Exit Interview Form')),
  file_name TEXT NOT NULL,
  uploaded_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by TEXT,
  is_signed BOOLEAN DEFAULT FALSE,
  signed_date DATE,
  notes TEXT
);

-- Update employees table to add termination-related fields
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_type TEXT CHECK (termination_type IN ('Voluntary', 'Involuntary', 'Retirement', 'End of Contract'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS severance_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS severance_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vacation_payout DECIMAL(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS final_pay_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS benefits_end_date DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_termination_details_employee ON termination_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_termination_details_date ON termination_details(termination_date);
CREATE INDEX IF NOT EXISTS idx_termination_checklist_employee ON termination_checklist(employee_id);
CREATE INDEX IF NOT EXISTS idx_termination_documents_employee ON termination_documents(employee_id);

-- Insert default termination checklist template
INSERT INTO termination_checklist (employee_id, termination_detail_id, checklist_item, category, priority) VALUES
(NULL, NULL, 'Schedule exit interview', 'HR', 'High'),
(NULL, NULL, 'Prepare termination letter', 'HR', 'High'),
(NULL, NULL, 'Calculate final pay and benefits', 'Finance', 'High'),
(NULL, NULL, 'Process ROE (Record of Employment)', 'HR', 'High'),
(NULL, NULL, 'Revoke system access', 'IT', 'High'),
(NULL, NULL, 'Collect company equipment', 'Operations', 'High'),
(NULL, NULL, 'Update employee status in HR system', 'HR', 'High'),
(NULL, NULL, 'Notify payroll of termination', 'Finance', 'High'),
(NULL, NULL, 'Cancel benefits and insurance', 'Finance', 'Medium'),
(NULL, NULL, 'Update emergency contacts', 'HR', 'Medium'),
(NULL, NULL, 'Archive employee files', 'HR', 'Medium'),
(NULL, NULL, 'Notify department manager', 'HR', 'Medium'),
(NULL, NULL, 'Update company directory', 'HR', 'Low'),
(NULL, NULL, 'Remove from email distribution lists', 'IT', 'Low'),
(NULL, NULL, 'Update security access cards', 'Operations', 'Low'),
(NULL, NULL, 'Process final expense reports', 'Finance', 'Medium'),
(NULL, NULL, 'Return company credit cards', 'Finance', 'High'),
(NULL, NULL, 'Update project assignments', 'Operations', 'Medium'),
(NULL, NULL, 'Transfer knowledge and responsibilities', 'Operations', 'High'),
(NULL, NULL, 'Complete exit interview form', 'HR', 'High');

-- Create view for termination summary
CREATE OR REPLACE VIEW v_termination_summary AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.email,
  e.hire_date,
  e.termination_date,
  e.termination_type,
  e.termination_reason,
  e.status,
  td.termination_reason as detailed_reason,
  td.reason_category,
  td.initiated_by,
  td.severance_paid,
  td.severance_amount,
  td.vacation_payout,
  td.final_pay_date,
  td.benefits_end_date,
  td.exit_interview_date,
  td.exit_interview_conducted_by,
  td.equipment_returned,
  td.access_revoked,
  td.final_documentation_complete,
  EXTRACT(YEAR FROM AGE(e.termination_date, e.hire_date)) as years_of_service,
  d.name as department,
  l.name as location
FROM employees e
LEFT JOIN termination_details td ON e.id = td.employee_id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN locations l ON e.location_id = l.id
WHERE e.termination_date IS NOT NULL
ORDER BY e.termination_date DESC;

-- Create view for pending termination tasks
CREATE OR REPLACE VIEW v_pending_termination_tasks AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.termination_date,
  tc.checklist_item,
  tc.category,
  tc.priority,
  tc.due_date,
  tc.is_completed,
  CASE 
    WHEN tc.due_date < CURRENT_DATE AND tc.is_completed = FALSE THEN 'Overdue'
    WHEN tc.due_date = CURRENT_DATE AND tc.is_completed = FALSE THEN 'Due Today'
    WHEN tc.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND tc.is_completed = FALSE THEN 'Due This Week'
    ELSE 'Upcoming'
  END as status
FROM employees e
JOIN termination_details td ON e.id = td.employee_id
JOIN termination_checklist tc ON td.id = tc.termination_detail_id
WHERE e.status = 'Terminated' 
  AND tc.is_completed = FALSE
ORDER BY tc.priority DESC, tc.due_date ASC;
