-- Fix Bonus Approval Fields
-- Add missing columns for bonus approval and rejection functionality

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

-- Test the new columns with a sample update
UPDATE bonuses 
SET approved_by = 'System Admin', 
    approval_notes = 'Schema migration test',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Verify the schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bonuses' 
ORDER BY ordinal_position;
