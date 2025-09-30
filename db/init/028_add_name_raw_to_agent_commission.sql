-- Add name_raw column to agent_commission_us table
ALTER TABLE agent_commission_us 
ADD COLUMN IF NOT EXISTS name_raw TEXT;

-- Update existing records with names from employees table
UPDATE agent_commission_us acu
SET name_raw = e.first_name || ' ' || e.last_name
FROM employees e
WHERE acu.employee_id = e.id AND acu.name_raw IS NULL;

COMMENT ON COLUMN agent_commission_us.name_raw IS 'Original employee name from Excel import';
