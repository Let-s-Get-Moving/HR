-- Remove unused fields from job_titles table
-- Date: 2026-01-19
-- These fields were never used in the application

-- Drop unused columns
ALTER TABLE job_titles 
  DROP COLUMN IF EXISTS level_grade,
  DROP COLUMN IF EXISTS reports_to_id,
  DROP COLUMN IF EXISTS min_salary,
  DROP COLUMN IF EXISTS max_salary;

-- Drop the index that's no longer needed
DROP INDEX IF EXISTS idx_job_titles_reports_to;

COMMENT ON TABLE job_titles IS 'Job titles/positions. Simplified to only essential fields: name, description, department.';
