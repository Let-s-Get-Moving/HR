#!/bin/bash
# Direct SQL query to check test user
psql "$DATABASE_URL" -c "
SELECT 
  e.id as emp_id,
  e.first_name || ' ' || e.last_name as emp_name,
  e.work_email,
  u.id as user_id,
  u.username,
  CASE WHEN u.password_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_password,
  LENGTH(u.password_hash) as pwd_length,
  r.role_name,
  u.is_active
FROM employees e
LEFT JOIN users u ON u.employee_id = e.id
LEFT JOIN hr_roles r ON u.role_id = r.id
WHERE LOWER(e.first_name) LIKE '%test%' OR LOWER(e.last_name) LIKE '%test%'
ORDER BY e.created_at DESC
LIMIT 5;
"
