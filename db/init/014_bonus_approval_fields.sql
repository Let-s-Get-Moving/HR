-- Add approval and rejection fields to bonuses table
-- This migration adds the missing columns for bonus approval/rejection functionality

-- Add approval fields
ALTER TABLE bonuses 
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Add rejection fields  
ALTER TABLE bonuses 
ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

-- Add updated_at column if it doesn't exist
ALTER TABLE bonuses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at);

-- Add comments for documentation
COMMENT ON COLUMN bonuses.approved_by IS 'Name of the person who approved the bonus';
COMMENT ON COLUMN bonuses.approval_notes IS 'Notes from the approver about the bonus approval';
COMMENT ON COLUMN bonuses.payment_date IS 'Date when the bonus was or will be paid';
COMMENT ON COLUMN bonuses.rejected_by IS 'Name of the person who rejected the bonus';
COMMENT ON COLUMN bonuses.rejection_reason IS 'Reason for bonus rejection';
COMMENT ON COLUMN bonuses.rejection_notes IS 'Detailed notes about the rejection';
COMMENT ON COLUMN bonuses.updated_at IS 'Timestamp when the bonus record was last updated';
