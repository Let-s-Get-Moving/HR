-- Auto-calculate overtime based on total daily hours
-- OT = TRUE when total hours for that employee on that day > 8

CREATE OR REPLACE FUNCTION update_overtime_for_day()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all entries for this employee on this work_date
  UPDATE timecard_entries te
  SET is_overtime = (
    -- Get total hours for the day
    SELECT COALESCE(SUM(hours_worked), 0) > 8
    FROM timecard_entries
    WHERE employee_id = NEW.employee_id
      AND work_date = NEW.work_date
      AND hours_worked IS NOT NULL
  )
  WHERE te.employee_id = NEW.employee_id
    AND te.work_date = NEW.work_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_update_overtime ON timecard_entries;

-- Create trigger that fires after insert or update
CREATE TRIGGER trigger_update_overtime
  AFTER INSERT OR UPDATE OF hours_worked, work_date
  ON timecard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_overtime_for_day();

-- Update existing entries to mark OT correctly
UPDATE timecard_entries te
SET is_overtime = (
  SELECT COALESCE(SUM(hours_worked), 0) > 8
  FROM timecard_entries
  WHERE employee_id = te.employee_id
    AND work_date = te.work_date
    AND hours_worked IS NOT NULL
)
WHERE hours_worked IS NOT NULL;

