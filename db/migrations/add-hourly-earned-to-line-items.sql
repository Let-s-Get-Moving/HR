-- Add hourly_earned column to commission_line_items
-- This stores the calculated hours_worked * hourly_rate for the commission period

ALTER TABLE commission_line_items
  ADD COLUMN IF NOT EXISTS hourly_earned NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN commission_line_items.hourly_earned IS 'Calculated from timecard_entries hours × hourly_rate for the commission period. Read-only display column, not included in total calculations.';
