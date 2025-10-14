-- Fix leave_requests table to support both old and new schema
-- This migration ensures the table has all necessary columns

-- Add leave_type column for string-based leave types
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50);

-- Make leave_type_id nullable (for backward compatibility)
ALTER TABLE leave_requests ALTER COLUMN leave_type_id DROP NOT NULL;

-- Add reviewed_by column (FK to users table) - using approved_by from old schema
-- ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id);

-- Add review_notes column - using notes from old schema
-- ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add reviewed_at column - using approved_at from old schema  
-- ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add updated_at and created_at for trigger compatibility
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Ensure total_days is INTEGER (not NUMERIC)
ALTER TABLE leave_requests ALTER COLUMN total_days TYPE INTEGER USING total_days::integer;

-- Add check constraint for leave_type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leave_requests_leave_type_check'
    ) THEN
        ALTER TABLE leave_requests 
        ADD CONSTRAINT leave_requests_leave_type_check 
        CHECK (leave_type IS NULL OR leave_type IN ('Vacation', 'Sick Leave', 'Personal Leave', 'Bereavement', 'Parental Leave', 'Jury Duty', 'Military Leave'));
    END IF;
END $$;

-- Drop any existing problematic triggers
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;

-- Create proper trigger for updated_at
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_requests_updated_at();

-- Create index on approved_by for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON leave_requests(approved_by);

