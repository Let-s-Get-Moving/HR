-- Fix employee emails to use letsgetmovinggroup.com format
-- Update emails that still use old @company.com format

UPDATE employees
SET email = LOWER(first_name) || '@letsgetmovinggroup.com'
WHERE email LIKE '%@company.com'
  AND email NOT LIKE '%admin%'
  AND email NOT LIKE '%hr%';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Updated employee emails to firstname@letsgetmovinggroup.com format';
END $$;

