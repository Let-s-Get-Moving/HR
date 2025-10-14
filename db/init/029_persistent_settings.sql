-- Persistent Settings Storage
-- Store all application settings in database for proper persistence

-- Create settings table
CREATE TABLE IF NOT EXISTS application_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'number', 'boolean', 'select', 'textarea')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('system', 'preferences', 'notifications', 'security', 'maintenance')),
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Add default_value column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='application_settings' AND column_name='default_value') THEN
        ALTER TABLE application_settings ADD COLUMN default_value TEXT;
    END IF;
END $$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_update_timestamp
  BEFORE UPDATE ON application_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_timestamp();

-- Insert default settings (will not overwrite existing values)
INSERT INTO application_settings (key, value, type, category, description, default_value) VALUES
  -- System Settings
  ('company_name', 'HR Management System', 'text', 'system', 'Company name displayed throughout the application', 'HR Management System'),
  ('fiscal_year_start', '1', 'select', 'system', 'Fiscal year start month (1-12)', '1'),
  ('date_format', 'MM/DD/YYYY', 'select', 'system', 'Default date format', 'MM/DD/YYYY'),
  ('currency', 'USD', 'select', 'system', 'Default currency', 'USD'),
  ('timezone', 'America/New_York', 'select', 'system', 'Default timezone', 'America/New_York'),
  ('working_days', '5', 'number', 'system', 'Working days per week', '5'),
  ('working_hours', '8', 'number', 'system', 'Working hours per day', '8'),
  
  -- User Preferences
  ('theme', 'dark', 'select', 'preferences', 'UI theme (light/dark)', 'dark'),
  ('language', 'en', 'select', 'preferences', 'Interface language', 'en'),
  ('items_per_page', '50', 'number', 'preferences', 'Number of items per page in lists', '50'),
  ('dashboard_refresh', '30', 'number', 'preferences', 'Dashboard auto-refresh interval (seconds)', '30'),
  
  -- Notification Settings
  ('email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications', 'true'),
  ('push_notifications', 'false', 'boolean', 'notifications', 'Enable push notifications', 'false'),
  ('notification_frequency', 'immediate', 'select', 'notifications', 'Notification frequency (immediate/daily/weekly)', 'immediate'),
  ('alert_types', 'all', 'select', 'notifications', 'Types of alerts to receive', 'all'),
  
  -- Security Settings
  ('session_timeout_minutes', '30', 'number', 'security', 'Session timeout in minutes', '30'),
  ('password_expiry_days', '90', 'number', 'security', 'Password expiry in days', '90'),
  ('max_login_attempts', '5', 'number', 'security', 'Maximum login attempts before lockout', '5'),
  ('two_factor_auth', 'false', 'boolean', 'security', 'Enable two-factor authentication', 'false'),
  ('ip_whitelist', '', 'textarea', 'security', 'Allowed IP addresses (comma-separated)', ''),
  ('audit_log_enabled', 'true', 'boolean', 'security', 'Enable audit logging', 'true'),
  
  -- Maintenance Settings
  ('backup_enabled', 'true', 'boolean', 'maintenance', 'Enable automatic backups', 'true'),
  ('backup_frequency_days', '7', 'number', 'maintenance', 'Backup frequency in days', '7'),
  ('cleanup_enabled', 'false', 'boolean', 'maintenance', 'Enable automatic data cleanup', 'false'),
  ('retention_days', '365', 'number', 'maintenance', 'Data retention period in days', '365'),
  ('maintenance_mode', 'false', 'boolean', 'maintenance', 'Enable maintenance mode', 'false')
ON CONFLICT (key) DO NOTHING; -- Don't overwrite existing settings

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_category ON application_settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_key ON application_settings(key);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON application_settings TO hr;
GRANT USAGE, SELECT ON SEQUENCE application_settings_id_seq TO hr;

COMMENT ON TABLE application_settings IS 'Persistent storage for all application settings';
COMMENT ON COLUMN application_settings.key IS 'Unique setting key/identifier';
COMMENT ON COLUMN application_settings.value IS 'Current value of the setting (stored as text, cast to appropriate type when used)';
COMMENT ON COLUMN application_settings.type IS 'Data type of the setting for proper rendering in UI';
COMMENT ON COLUMN application_settings.category IS 'Setting category for organization';
COMMENT ON COLUMN application_settings.default_value IS 'Default value for the setting (used for reset)';

