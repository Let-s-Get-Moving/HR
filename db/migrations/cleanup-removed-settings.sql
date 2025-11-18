-- Clean up removed settings from database
-- This migration removes settings that have been removed from the UI:
-- - dashboard_layout (removed from preferences)
-- - sms_notifications (removed from notifications)
-- - maintenance_mode (removed from maintenance)

-- Remove unused settings
DELETE FROM application_settings 
WHERE key IN ('dashboard_layout', 'sms_notifications', 'maintenance_mode');

-- Verify removal
-- Uncomment to check what settings remain:
-- SELECT key, category, value FROM application_settings ORDER BY category, key;

