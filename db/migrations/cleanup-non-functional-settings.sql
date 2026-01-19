-- Cleanup Non-Functional Settings
-- Remove settings that were UI-only placeholders with no backend enforcement
-- Date: 2026-01-19

-- Remove non-functional notification settings
DELETE FROM application_settings 
WHERE category = 'notifications' 
  AND key IN ('push_notifications', 'sms_notifications');

-- Remove non-functional security settings (hardcoded in backend)
DELETE FROM application_settings 
WHERE category = 'security' 
  AND key IN (
    'session_timeout_minutes',      -- Hardcoded to 8 hours in auth.js
    'password_min_length',           -- Hardcoded to 8 chars in auth-mfa.js
    'login_attempts_limit',          -- Hardcoded to 5 in account-lockout.js
    'lockout_duration_minutes',      -- Hardcoded to 30 min in account-lockout.js
    'max_login_attempts',            -- Duplicate of above
    'audit_log_enabled',             -- No audit log filtering implementation
    'ip_whitelist'                   -- No IP whitelist enforcement
  );

-- Remove entire maintenance category (no functionality implemented)
DELETE FROM application_settings 
WHERE category = 'maintenance';

-- Keep only functional settings:
-- preferences: theme, language, timezone, items_per_page, dashboard_refresh
-- notifications: email_notifications
-- security: two_factor_auth, password_expiry_days

COMMENT ON TABLE application_settings IS 'Persistent storage for functional application settings only. Non-functional UI placeholders have been removed.';
