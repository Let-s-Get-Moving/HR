-- Fix missing columns in employees table
-- This addresses the 500 errors in payroll calculations

-- Add missing hourly_rate column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2) DEFAULT 0;

-- Add other missing columns that might be referenced in payroll calculations
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'Active' CHECK (employment_status IN ('Active', 'Inactive', 'On Leave', 'Terminated'));

-- Update existing employees with default hourly rates based on role
-- This is a temporary fix - in production, these should be set properly
UPDATE employees 
SET hourly_rate = CASE 
  WHEN role_title ILIKE '%manager%' OR role_title ILIKE '%director%' THEN 35.00
  WHEN role_title ILIKE '%senior%' THEN 28.00
  WHEN role_title ILIKE '%junior%' OR role_title ILIKE '%entry%' THEN 20.00
  ELSE 25.00
END
WHERE hourly_rate = 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_hourly_rate ON employees(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);

-- Add sample data for testing if no employees exist
INSERT INTO employees (first_name, last_name, email, phone, hire_date, employment_type, department_id, role_title, hourly_rate, status)
SELECT 'John', 'Doe', 'john.doe@company.com', '555-0101', '2024-01-15', 'Full-time', 1, 'Software Developer', 25.00, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM employees LIMIT 1);

INSERT INTO employees (first_name, last_name, email, phone, hire_date, employment_type, department_id, role_title, hourly_rate, status)
SELECT 'Jane', 'Smith', 'jane.smith@company.com', '555-0102', '2024-02-01', 'Full-time', 2, 'HR Manager', 35.00, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'jane.smith@company.com');

INSERT INTO employees (first_name, last_name, email, phone, hire_date, employment_type, department_id, role_title, hourly_rate, status)
SELECT 'Mike', 'Johnson', 'mike.johnson@company.com', '555-0103', '2024-01-20', 'Full-time', 3, 'Operations Coordinator', 22.00, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'mike.johnson@company.com');

-- Ensure we have departments
INSERT INTO departments (name) VALUES 
('Engineering'), 
('Human Resources'), 
('Operations')
ON CONFLICT (name) DO NOTHING;

-- Update employee department references if they don't exist
UPDATE employees SET department_id = 1 WHERE department_id IS NULL AND role_title ILIKE '%developer%';
UPDATE employees SET department_id = 2 WHERE department_id IS NULL AND role_title ILIKE '%hr%';
UPDATE employees SET department_id = 3 WHERE department_id IS NULL AND department_id IS NULL;
