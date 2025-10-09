-- Remove UNIQUE constraint from work_email to allow duplicates
-- HR will manually fix duplicates using the edit functionality

-- Drop the unique index
DROP INDEX IF EXISTS idx_employees_work_email;

-- Recreate as non-unique index for performance
CREATE INDEX IF NOT EXISTS idx_employees_work_email_lookup ON employees(work_email);

