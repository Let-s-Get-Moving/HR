-- Remove problematic triggers from leave_requests table
-- Migration 054 creates a trigger that references updated_at column which doesn't exist in the base schema from 003
-- This migration ensures the trigger is always dropped

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests CASCADE;
DROP FUNCTION IF EXISTS update_leave_requests_updated_at() CASCADE;

-- Add leave_type column for new leave request system (string-based instead of FK)
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50);

-- Make leave_type_id nullable for backward compatibility
DO $$ 
BEGIN
    ALTER TABLE leave_requests ALTER COLUMN leave_type_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

