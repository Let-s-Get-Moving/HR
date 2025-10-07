-- Create application_settings table for settings functionality
-- Drop existing table if it exists to fix constraints
DROP TABLE IF EXISTS application_settings CASCADE;

CREATE TABLE application_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'boolean', 'select', 'textarea')),
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('system', 'preferences', 'notifications', 'security', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings with correct types and categories
INSERT INTO application_settings (key, value, type, description, category) VALUES
-- System settings
('company_name', 'C&C Logistics', 'text', 'Company name displayed in the system', 'system'),
('timezone', 'UTC', 'text', 'Default timezone for the system', 'system'),
('date_format', 'MM/DD/YYYY', 'text', 'Default date format', 'system'),
('currency', 'USD', 'text', 'Default currency', 'system'),

-- Security settings
('session_timeout_minutes', '30', 'number', 'Session timeout in minutes', 'security'),
('password_min_length', '8', 'number', 'Minimum password length', 'security'),
('two_factor_auth', 'false', 'boolean', 'Enable two-factor authentication', 'security'),
('login_attempts_limit', '5', 'number', 'Maximum login attempts before lockout', 'security'),
('lockout_duration_minutes', '30', 'number', 'Account lockout duration in minutes', 'security'),

-- User preferences
('theme', 'dark', 'text', 'Default theme (dark/light)', 'preferences'),
('language', 'en', 'text', 'Default language', 'preferences'),
('notifications_enabled', 'true', 'boolean', 'Enable notifications', 'preferences'),

-- Notification settings
('email_notifications', 'true', 'boolean', 'Enable email notifications', 'notifications'),

-- Maintenance settings
('backup_frequency_days', '7', 'number', 'Backup frequency in days', 'maintenance'),
('log_retention_days', '90', 'number', 'Log retention period in days', 'maintenance'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'maintenance');

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_application_settings_category ON application_settings(category);
CREATE INDEX IF NOT EXISTS idx_application_settings_key ON application_settings(key);

-- Add comments
COMMENT ON TABLE application_settings IS 'Application configuration settings';
COMMENT ON COLUMN application_settings.key IS 'Setting key identifier';
COMMENT ON COLUMN application_settings.value IS 'Setting value';
COMMENT ON COLUMN application_settings.type IS 'Data type (text, number, boolean, select, textarea)';
COMMENT ON COLUMN application_settings.description IS 'Human-readable description';
COMMENT ON COLUMN application_settings.category IS 'Setting category (system, preferences, notifications, security, maintenance)';
