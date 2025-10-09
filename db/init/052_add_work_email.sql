-- Add work_email column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_email TEXT;

-- First, remove NOT NULL constraint from email if it exists
ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;

-- Temporarily drop the unique constraint on email
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_key;

-- Migrate existing @letsgetmovinggroup.com emails to work_email
UPDATE employees
SET work_email = email
WHERE email LIKE '%@letsgetmovinggroup.com';

-- For employees who only had work email, set personal email to NULL
UPDATE employees
SET email = NULL
WHERE email LIKE '%@letsgetmovinggroup.com';

-- Auto-generate work_email for employees who don't have one yet
-- Handle duplicates by adding ID suffix
UPDATE employees e
SET work_email = LOWER(REPLACE(e.first_name, ' ', '')) || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM employees e2 
      WHERE e2.id != e.id 
      AND LOWER(REPLACE(e2.first_name, ' ', '')) = LOWER(REPLACE(e.first_name, ' ', ''))
    ) THEN e.id::text
    ELSE ''
  END || '@letsgetmovinggroup.com'
WHERE e.work_email IS NULL OR e.work_email = '';

-- Make work_email NOT NULL since all employees must have a work email
ALTER TABLE employees ALTER COLUMN work_email SET NOT NULL;

-- Make work_email unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_work_email ON employees(work_email);

-- Re-add unique constraint to email, but allow NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_unique ON employees(email) WHERE email IS NOT NULL;





