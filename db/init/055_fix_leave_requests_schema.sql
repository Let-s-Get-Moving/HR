-- Fix leave_requests table to support both old and new schema
-- This migration ensures the table has all necessary columns

-- Add leave_type column for string-based leave types
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50);

-- Make leave_type_id nullable (for backward compatibility)
ALTER TABLE leave_requests ALTER COLUMN leave_type_id DROP NOT NULL;

-- Add reviewed_by column (FK to users table)
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id);

-- Add review_notes column
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add reviewed_at column
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

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

-- Create index on reviewed_by for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by ON leave_requests(reviewed_by);

