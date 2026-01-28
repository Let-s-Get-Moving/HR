-- Security Audit Log table for high-risk action logging
-- Separate from generic audit_logs to capture sensitive operation details

CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),  -- e.g., 'user', 'employee', 'payroll', 'document'
    target_id VARCHAR(100),   -- ID of affected resource (string to support various ID types)
    ip_address INET,
    user_agent TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',  -- low, medium, high, critical
    success BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp ON security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_target ON security_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity ON security_audit_log(severity);

-- Partial index for high/critical events (faster queries for urgent review)
CREATE INDEX IF NOT EXISTS idx_security_audit_log_high_severity 
    ON security_audit_log(timestamp) 
    WHERE severity IN ('high', 'critical');

-- Function to clean old security audit logs (keep last 365 days for compliance)
CREATE OR REPLACE FUNCTION clean_old_security_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM security_audit_log 
    WHERE timestamp < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;

COMMIT;
