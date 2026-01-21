-- Add 'international_closer' to sales_role constraint
-- International Sales Closer functions identically to Sales Agent with a different label

-- Drop existing constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS chk_sales_role;

-- Add updated constraint with new role
ALTER TABLE employees ADD CONSTRAINT chk_sales_role 
CHECK (sales_role IS NULL OR sales_role IN ('agent', 'manager', 'international_closer'));

-- Update comment
COMMENT ON COLUMN employees.sales_role IS 'Sales department role: agent, manager, or international_closer. Only applies to Sales dept.';
