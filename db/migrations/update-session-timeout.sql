-- Migration: Update default session timeout to 60 minutes
-- Date: 2024-12-08
-- Reason: User request to increase session timeout from 30 to 60 minutes

UPDATE settings 
SET value = '60', default_value = '60'
WHERE key = 'session_timeout_minutes';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Session timeout updated to 60 minutes';
END $$;

