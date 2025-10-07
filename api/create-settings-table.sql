-- Create application_settings table for settings functionality
CREATE TABLE IF NOT EXISTS application_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings
INSERT INTO application_settings (key, value, type, description, category) VALUES
-- System settings
('company_name', 'C&C Logistics', 'string', 'Company name displayed in the system', 'system'),
('timezone', 'UTC', 'string', 'Default timezone for the system', 'system'),
('date_format', 'MM/DD/YYYY', 'string', 'Default date format', 'system'),
('currency', 'USD', 'string', 'Default currency', 'system'),

-- Security settings
('session_timeout_minutes', '30', 'number', 'Session timeout in minutes', 'security'),
('password_min_length', '8', 'number', 'Minimum password length', 'security'),
('two_factor_auth', 'false', 'boolean', 'Enable two-factor authentication', 'security'),
('login_attempts_limit', '5', 'number', 'Maximum login attempts before lockout', 'security'),
('lockout_duration_minutes', '30', 'number', 'Account lockout duration in minutes', 'security'),

-- User preferences
('theme', 'dark', 'string', 'Default theme (dark/light)', 'preference'),
('language', 'en', 'string', 'Default language', 'preference'),
('notifications_enabled', 'true', 'boolean', 'Enable notifications', 'preference'),

-- Notification settings
('email_notifications', 'true', 'boolean', 'Enable email notifications', 'notification'),
('new_employee_notification', 'true', 'boolean', 'Notify when new employee is added', 'notification'),
('payroll_notification', 'true', 'boolean', 'Notify when payroll is processed', 'notification'),
('leave_request_notification', 'true', 'boolean', 'Notify when leave is requested', 'notification'),

-- Maintenance settings
('backup_frequency_days', '7', 'number', 'Backup frequency in days', 'maintenance'),
('log_retention_days', '90', 'number', 'Log retention period in days', 'maintenance'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'maintenance')
ON CONFLICT (key) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_application_settings_category ON application_settings(category);
CREATE INDEX IF NOT EXISTS idx_application_settings_key ON application_settings(key);

-- Add comments
COMMENT ON TABLE application_settings IS 'Application configuration settings';
COMMENT ON COLUMN application_settings.key IS 'Setting key identifier';
COMMENT ON COLUMN application_settings.value IS 'Setting value';
COMMENT ON COLUMN application_settings.type IS 'Data type (string, number, boolean)';
COMMENT ON COLUMN application_settings.description IS 'Human-readable description';
COMMENT ON COLUMN application_settings.category IS 'Setting category (system, security, preference, etc.)';
