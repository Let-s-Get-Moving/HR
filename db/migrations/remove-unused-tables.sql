-- Migration: Remove unused API tables (recruiting, performance, benefits)
-- Date: 2024-12-08
-- Reason: APIs removed, features not in use, some had 500 errors

-- Drop recruiting tables
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS job_postings CASCADE;

-- Drop performance tables  
DROP TABLE IF EXISTS performance_feedback CASCADE;
DROP TABLE IF EXISTS performance_goals CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;

-- Drop benefits tables
DROP TABLE IF EXISTS benefit_enrollments CASCADE;
DROP TABLE IF EXISTS benefit_plans CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: removed recruiting, performance, and benefits tables';
END $$;

