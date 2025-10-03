-- Normalize dashes/quotes/space, trim, lowercase
-- This ensures consistent matching across different text encodings and user input variations
CREATE OR REPLACE FUNCTION app_norm(text) RETURNS text AS $$
  SELECT LOWER(
    TRIM(
      TRANSLATE(
        COALESCE($1, ''),
        '–—-'"" ',   -- en dash (U+2013), em dash (U+2014), hyphen, curly quotes, NBSP
        '---''" '    -- normalize to ASCII forms
      )
    )
  );
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Example usage:
-- WHERE app_norm(group_name) = app_norm($1)
-- This handles cases like:
--   "HR - West" vs "HR – West" (different dashes)
--   "HR-West" vs "hr-west" (different case)
--   "HR -West" vs "HR- West" (different spacing)

-- Optional: Add generated columns for frequently-filtered fields
-- Uncomment and adjust table/column names as needed:

-- ALTER TABLE timecards 
--   ADD COLUMN IF NOT EXISTS group_norm text 
--   GENERATED ALWAYS AS (app_norm(group_name)) STORED;

-- ALTER TABLE commissions 
--   ADD COLUMN IF NOT EXISTS group_norm text 
--   GENERATED ALWAYS AS (app_norm(group_name)) STORED;

-- ALTER TABLE employees
--   ADD COLUMN IF NOT EXISTS name_norm text
--   GENERATED ALWAYS AS (app_norm(first_name || ' ' || last_name)) STORED;

COMMENT ON FUNCTION app_norm(text) IS 
  'Normalizes text for consistent comparison: lowercases, trims, and converts Unicode dashes/quotes to ASCII';

