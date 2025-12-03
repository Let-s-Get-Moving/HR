-- Add nickname column to employees table
-- Migration: add_nickname_to_employees.sql
-- Date: 2025-01-XX
-- Purpose: Add nickname field for alternative name matching during file imports

-- Add nickname column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Create index for nickname matching (normalized, only for non-null values)
CREATE INDEX IF NOT EXISTS idx_employees_nickname ON employees(LOWER(TRIM(nickname))) WHERE nickname IS NOT NULL;

-- Add comment
COMMENT ON COLUMN employees.nickname IS 'Alternative name/nickname for employee matching in imports (e.g., "Dmytro Benz" for "Dmytro Brovko")';

