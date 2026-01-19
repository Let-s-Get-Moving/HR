-- Add Sales commission configuration fields to employees table
-- Only meaningful for Sales department employees; enforced by app logic

-- sales_role: 'agent' or 'manager' (only for Sales dept)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS sales_role TEXT;

-- sales_commission_enabled: whether this employee participates in commission calculations
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS sales_commission_enabled BOOLEAN DEFAULT false;

-- sales_manager_fixed_pct: override for managers like Sam Lopka (0.7% = 0.700)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS sales_manager_fixed_pct NUMERIC(6,3);

-- Constraint: sales_role must be 'agent' or 'manager' if set
ALTER TABLE employees 
DROP CONSTRAINT IF EXISTS chk_sales_role;

ALTER TABLE employees 
ADD CONSTRAINT chk_sales_role 
CHECK (sales_role IS NULL OR sales_role IN ('agent', 'manager'));

-- Comments for documentation
COMMENT ON COLUMN employees.sales_role IS 'Sales department role: agent or manager. Only applies to Sales dept.';
COMMENT ON COLUMN employees.sales_commission_enabled IS 'Whether employee participates in sales commission calculations.';
COMMENT ON COLUMN employees.sales_manager_fixed_pct IS 'Fixed commission percentage override for managers (e.g., 0.700 for Sam Lopka 0.7%).';

-- Index for efficient lookups during commission calculation
CREATE INDEX IF NOT EXISTS idx_employees_sales_commission 
ON employees(sales_commission_enabled, sales_role) 
WHERE sales_commission_enabled = true;
