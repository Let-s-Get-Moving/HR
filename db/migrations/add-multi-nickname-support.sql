-- Multi-nickname Support Migration
-- Adds nickname_2 and nickname_3 columns to employees table
-- Enforces global uniqueness of normalized nicknames across all 3 columns
-- Date: 2026-01-20

-- ============================================================================
-- 1. Add new nickname columns
-- ============================================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname_2 TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname_3 TEXT;

COMMENT ON COLUMN employees.nickname_2 IS 'Second alternative name/nickname for employee matching (e.g., short name "Sam")';
COMMENT ON COLUMN employees.nickname_3 IS 'Third alternative name/nickname for employee matching';

-- ============================================================================
-- 2. Create normalization function (matches JS normalizeNameKey exactly)
-- ============================================================================
-- Normalization rules:
--   1. Trim leading/trailing whitespace
--   2. Convert to lowercase
--   3. Remove characters that are not a-z, 0-9, space, or hyphen
--   4. Collapse multiple spaces to single space
--   5. Final trim

CREATE OR REPLACE FUNCTION normalize_nickname(input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input IS NULL OR input = '' THEN
        RETURN NULL;
    END IF;
    
    RETURN TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
            LOWER(TRIM(input)),
            '[^a-z0-9\s-]', '', 'g'
        ),
        '\s+', ' ', 'g'
    ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_nickname(TEXT) IS 'Normalizes nickname for matching: lowercase, remove special chars, collapse whitespace';

-- ============================================================================
-- 3. Create indexes for efficient lookups on all nickname columns
-- ============================================================================
-- Drop old index if it exists and recreate using the function for consistency
DROP INDEX IF EXISTS idx_employees_nickname;
DROP INDEX IF EXISTS idx_employees_nickname_2_norm;
DROP INDEX IF EXISTS idx_employees_nickname_3_norm;

-- Create functional indexes using normalize_nickname function
CREATE INDEX idx_employees_nickname_norm 
ON employees (normalize_nickname(nickname)) 
WHERE nickname IS NOT NULL AND nickname != '';

CREATE INDEX idx_employees_nickname_2_norm 
ON employees (normalize_nickname(nickname_2)) 
WHERE nickname_2 IS NOT NULL AND nickname_2 != '';

CREATE INDEX idx_employees_nickname_3_norm 
ON employees (normalize_nickname(nickname_3)) 
WHERE nickname_3 IS NOT NULL AND nickname_3 != '';

-- ============================================================================
-- 4. Create trigger function for uniqueness enforcement
-- ============================================================================
CREATE OR REPLACE FUNCTION check_nickname_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
    norm1 TEXT;
    norm2 TEXT;
    norm3 TEXT;
    conflict_emp RECORD;
    all_norms TEXT[];
    norm TEXT;
BEGIN
    -- Normalize all nicknames for the new/updated row
    norm1 := normalize_nickname(NEW.nickname);
    norm2 := normalize_nickname(NEW.nickname_2);
    norm3 := normalize_nickname(NEW.nickname_3);
    
    -- Build array of non-null normalized nicknames (removing duplicates within this employee)
    all_norms := ARRAY[]::TEXT[];
    
    IF norm1 IS NOT NULL AND norm1 != '' THEN
        all_norms := array_append(all_norms, norm1);
    END IF;
    
    IF norm2 IS NOT NULL AND norm2 != '' AND NOT (norm2 = ANY(all_norms)) THEN
        all_norms := array_append(all_norms, norm2);
    END IF;
    
    IF norm3 IS NOT NULL AND norm3 != '' AND NOT (norm3 = ANY(all_norms)) THEN
        all_norms := array_append(all_norms, norm3);
    END IF;
    
    -- Check for self-duplicates (same nickname in multiple columns)
    IF array_length(all_norms, 1) IS NOT NULL THEN
        IF (norm1 IS NOT NULL AND norm2 IS NOT NULL AND norm1 = norm2) OR
           (norm1 IS NOT NULL AND norm3 IS NOT NULL AND norm1 = norm3) OR
           (norm2 IS NOT NULL AND norm3 IS NOT NULL AND norm2 = norm3) THEN
            RAISE EXCEPTION 'NICKNAME_DUPLICATE_SELF: Cannot use the same nickname in multiple columns'
                USING ERRCODE = 'unique_violation';
        END IF;
    END IF;
    
    -- Check each normalized nickname against other employees
    FOREACH norm IN ARRAY all_norms
    LOOP
        SELECT id, first_name, last_name, nickname, nickname_2, nickname_3
        INTO conflict_emp
        FROM employees
        WHERE id != COALESCE(NEW.id, -1)  -- Exclude self (NEW.id is null for inserts but we use -1 as fallback)
          AND (
              normalize_nickname(nickname) = norm OR
              normalize_nickname(nickname_2) = norm OR
              normalize_nickname(nickname_3) = norm
          )
        LIMIT 1;
        
        IF conflict_emp IS NOT NULL THEN
            RAISE EXCEPTION 'NICKNAME_CONFLICT: Nickname "%" (normalized: "%") is already used by employee % (% %)',
                CASE 
                    WHEN norm = norm1 THEN NEW.nickname
                    WHEN norm = norm2 THEN NEW.nickname_2
                    ELSE NEW.nickname_3
                END,
                norm,
                conflict_emp.id,
                conflict_emp.first_name,
                conflict_emp.last_name
                USING ERRCODE = 'unique_violation';
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_nickname_uniqueness() IS 'Trigger function to enforce global uniqueness of normalized nicknames across all 3 nickname columns';

-- ============================================================================
-- 5. Create trigger on employees table
-- ============================================================================
DROP TRIGGER IF EXISTS trg_check_nickname_uniqueness ON employees;

CREATE TRIGGER trg_check_nickname_uniqueness
    BEFORE INSERT OR UPDATE ON employees
    FOR EACH ROW
    WHEN (NEW.nickname IS NOT NULL OR NEW.nickname_2 IS NOT NULL OR NEW.nickname_3 IS NOT NULL)
    EXECUTE FUNCTION check_nickname_uniqueness();

-- ============================================================================
-- 6. Verification queries (optional - for manual testing)
-- ============================================================================
-- Test the normalization function:
-- SELECT normalize_nickname('  Sam L  ');  -- Should return 'sam l'
-- SELECT normalize_nickname('SAM');         -- Should return 'sam'
-- SELECT normalize_nickname('Colin C');     -- Should return 'colin c'

-- Check existing nicknames:
-- SELECT id, first_name, last_name, nickname, normalize_nickname(nickname) as norm
-- FROM employees WHERE nickname IS NOT NULL;
