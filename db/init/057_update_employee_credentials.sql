-- Update all employees' login credentials to FirstnameLastname / password123
-- Except Avneet (keep her credentials unchanged)

-- First, ensure we have the user role
DO $$
DECLARE
  user_role_id INTEGER;
  emp RECORD;
  new_username TEXT;
  new_password_hash TEXT;
BEGIN
  -- Get user role_id
  SELECT id INTO user_role_id FROM hr_roles WHERE role_name = 'user';
  
  -- Password hash for "password123" (bcrypt hash)
  -- You'll need to generate this on deployment
  -- For now, this is a placeholder - will be updated via API endpoint
  
  -- Loop through all employees
  FOR emp IN 
    SELECT id, first_name, last_name, work_email, email 
    FROM employees 
    WHERE first_name IS NOT NULL 
      AND last_name IS NOT NULL
      AND first_name != 'Avneet'  -- Skip Avneet
  LOOP
    new_username := emp.first_name || emp.last_name;  -- FirstnameLastname format
    
    -- Check if user exists for this employee
    IF EXISTS (SELECT 1 FROM users WHERE employee_id = emp.id) THEN
      -- Update existing user (password will be updated via API)
      UPDATE users 
      SET username = new_username,
          full_name = emp.first_name || ' ' || emp.last_name,
          email = COALESCE(emp.work_email, emp.email),
          role_id = user_role_id
      WHERE employee_id = emp.id;
      
      RAISE NOTICE 'Updated user for employee: % % (ID: %)', emp.first_name, emp.last_name, emp.id;
    ELSE
      -- User account will be created via the API endpoint with proper password hashing
      RAISE NOTICE 'Employee % % (ID: %) needs user account - will be created via API', emp.first_name, emp.last_name, emp.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Username update complete. Passwords will be set to "password123" via API endpoint.';
END $$;

