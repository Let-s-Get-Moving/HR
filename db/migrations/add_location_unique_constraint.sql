-- Add UNIQUE constraint to locations.name and clean up duplicates
-- This migration fixes the bug where dropdown shows multiple "Downtown" entries

-- Step 1: Find and handle duplicate locations
-- For each duplicate name, keep the one with the lowest ID and reassign employees

DO $$
DECLARE
  dup_record RECORD;
  keep_id INTEGER;
  dup_id INTEGER;
  employee_count INTEGER;
BEGIN
  -- Find all duplicate location names
  FOR dup_record IN 
    SELECT name, array_agg(id ORDER BY id) as ids, COUNT(*) as cnt
    FROM locations
    GROUP BY name
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first (lowest ID) location
    keep_id := dup_record.ids[1];
    
    -- Reassign employees from duplicate locations to the kept one
    FOR i IN 2..array_length(dup_record.ids, 1) LOOP
      dup_id := dup_record.ids[i];
      
      -- Count employees assigned to this duplicate
      SELECT COUNT(*) INTO employee_count
      FROM employees
      WHERE location_id = dup_id;
      
      -- Reassign employees to the kept location
      IF employee_count > 0 THEN
        UPDATE employees
        SET location_id = keep_id
        WHERE location_id = dup_id;
        
        RAISE NOTICE 'Reassigned % employees from location % to location %', 
          employee_count, dup_id, keep_id;
      END IF;
      
      -- Delete the duplicate location
      DELETE FROM locations WHERE id = dup_id;
      RAISE NOTICE 'Deleted duplicate location % (name: %)', dup_id, dup_record.name;
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Add UNIQUE constraint to prevent future duplicates
-- First, drop the constraint if it exists (for idempotency)
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_name_unique;

-- Add the UNIQUE constraint
ALTER TABLE locations ADD CONSTRAINT locations_name_unique UNIQUE (name);

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active) WHERE is_active = true;

