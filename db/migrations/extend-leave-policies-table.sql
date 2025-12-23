-- Extend leave_policies table with comprehensive configuration fields
-- Migration: extend-leave-policies-table.sql

-- Add new columns to leave_policies table
ALTER TABLE leave_policies
ADD COLUMN IF NOT EXISTS leave_type_id INTEGER REFERENCES leave_types(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS accrual_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS accrual_frequency TEXT DEFAULT 'monthly' CHECK (accrual_frequency IN ('monthly', 'biweekly', 'quarterly', 'annually')),
ADD COLUMN IF NOT EXISTS carry_over_max_days NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS carry_over_expiry_months INTEGER,
ADD COLUMN IF NOT EXISTS minimum_notice_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_consecutive_days INTEGER,
ADD COLUMN IF NOT EXISTS approval_workflow TEXT DEFAULT 'manager' CHECK (approval_workflow IN ('auto', 'manager', 'hr', 'custom')),
ADD COLUMN IF NOT EXISTS applies_to_type TEXT DEFAULT 'All' CHECK (applies_to_type IN ('All', 'Department', 'JobTitle', 'Employee')),
ADD COLUMN IF NOT EXISTS applies_to_id INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_policies_leave_type ON leave_policies(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_policies_applies_to ON leave_policies(applies_to_type, applies_to_id);

-- Add comment to table
COMMENT ON TABLE leave_policies IS 'Comprehensive leave policy configuration including accrual rates, carry-over rules, and approval workflows';
COMMENT ON COLUMN leave_policies.leave_type_id IS 'Foreign key to leave_types. NULL means policy applies to all leave types';
COMMENT ON COLUMN leave_policies.accrual_rate IS 'Days accrued per accrual period';
COMMENT ON COLUMN leave_policies.accrual_frequency IS 'Frequency of accrual: monthly, biweekly, quarterly, or annually';
COMMENT ON COLUMN leave_policies.carry_over_max_days IS 'Maximum days that can be carried over. NULL means unlimited';
COMMENT ON COLUMN leave_policies.carry_over_expiry_months IS 'Months until carried-over days expire. NULL means no expiry';
COMMENT ON COLUMN leave_policies.approval_workflow IS 'Approval workflow type: auto, manager, hr, or custom';
COMMENT ON COLUMN leave_policies.applies_to_type IS 'Scope of policy: All, Department, JobTitle, or Employee';
COMMENT ON COLUMN leave_policies.applies_to_id IS 'ID of the entity (department/job_title/employee) if applies_to_type is not All';

