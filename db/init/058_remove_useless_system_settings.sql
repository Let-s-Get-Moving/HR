-- Remove non-functional system settings that clutter the UI
-- These settings save to database but don't actually affect the application

DELETE FROM application_settings 
WHERE key IN (
    'company_name',      -- Not used anywhere in the app
    'fiscal_year_start', -- Fiscal year calculations not implemented
    'date_format',       -- Date formatting doesn't use this
    'currency',          -- Currency display not implemented
    'timezone',          -- Timezone handling not implemented (use user preferences instead)
    'working_days',      -- Not used in any calculations
    'working_hours'      -- Not used in any calculations
);

-- Also remove some redundant/non-functional preferences and settings
DELETE FROM application_settings 
WHERE key IN (
    'items_per_page',      -- Pagination doesn't use this
    'dashboard_refresh',   -- Auto-refresh not implemented
    'notification_frequency', -- Email service not implemented
    'alert_types',         -- Alert system not implemented
    'ip_whitelist',        -- IP whitelisting not implemented
    'audit_log_enabled',   -- Audit logging always on (security middleware)
    'backup_enabled',      -- Backup system not implemented
    'backup_frequency_days', -- Backup system not implemented
    'cleanup_enabled',     -- Auto-cleanup not implemented
    'retention_days'       -- Data retention not implemented
);

COMMENT ON TABLE application_settings IS 'Persistent storage for functional application settings only (cleaned up to remove display-only settings)';

