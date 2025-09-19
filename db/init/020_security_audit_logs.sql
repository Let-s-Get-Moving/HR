-- Security and audit logging tables

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    username VARCHAR(255),
    action VARCHAR(500) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    request_body TEXT,
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    ip_address INET,
    user_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    user_agent TEXT,
    additional_data JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create api_keys table for API key management
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions TEXT[] DEFAULT '{}',
    user_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL
);

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    username VARCHAR(255),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    is_blocked BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempted_at ON failed_login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_blocked ON failed_login_attempts(is_blocked);

-- Create function to clean old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION clean_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    DELETE FROM failed_login_attempts 
    WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity(p_ip_address INET, p_time_window INTERVAL DEFAULT '1 hour')
RETURNS BOOLEAN AS $$
DECLARE
    failed_attempts INTEGER;
    recent_audit_count INTEGER;
BEGIN
    -- Check failed login attempts
    SELECT COUNT(*) INTO failed_attempts
    FROM failed_login_attempts 
    WHERE ip_address = p_ip_address 
    AND attempted_at > NOW() - p_time_window;
    
    -- Check audit log frequency
    SELECT COUNT(*) INTO recent_audit_count
    FROM audit_logs 
    WHERE ip_address = p_ip_address 
    AND timestamp > NOW() - p_time_window;
    
    -- Consider suspicious if more than 10 failed attempts or 100 audit entries in time window
    RETURN (failed_attempts > 10 OR recent_audit_count > 100);
END;
$$ LANGUAGE plpgsql;

-- Insert some sample security events
INSERT INTO security_events (event_type, severity, description, ip_address) VALUES
('system_startup', 'low', 'Security system initialized', '127.0.0.1'),
('audit_logging_enabled', 'low', 'Audit logging has been enabled', '127.0.0.1'),
('rate_limiting_configured', 'low', 'Rate limiting has been configured', '127.0.0.1')
ON CONFLICT DO NOTHING;

COMMIT;
