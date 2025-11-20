-- Add selective holiday assignment fields to leave_calendar table
-- Allows holidays to be assigned to All, Department, JobTitle, or Employee

ALTER TABLE leave_calendar 
  ADD COLUMN IF NOT EXISTS applies_to_type VARCHAR(50) CHECK (applies_to_type IN ('All', 'Department', 'JobTitle', 'Employee')) DEFAULT 'All',
  ADD COLUMN IF NOT EXISTS applies_to_id INT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leave_calendar_applies_to ON leave_calendar(applies_to_type, applies_to_id);

-- Update existing holidays to have applies_to_type = 'All' (backward compatibility)
UPDATE leave_calendar SET applies_to_type = 'All' WHERE applies_to_type IS NULL;

