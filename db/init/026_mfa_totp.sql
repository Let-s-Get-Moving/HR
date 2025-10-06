-- Multi-Factor Authentication (MFA) using TOTP (Time-based One-Time Password)
-- For Google Authenticator, Microsoft Authenticator, Authy, etc.

-- MFA user settings table
CREATE TABLE IF NOT EXISTS user_mfa (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255), -- Base32 encoded secret for TOTP
    backup_codes TEXT[], -- Array of hashed backup codes
    mfa_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MFA verification attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS mfa_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code_entered VARCHAR(10),
    success BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MFA backup code usage tracking
CREATE TABLE IF NOT EXISTS mfa_backup_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Trusted devices (optional - for "remember this device")
CREATE TABLE IF NOT EXISTS trusted_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    trusted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, device_fingerprint)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_enabled ON user_mfa(mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_id ON mfa_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_attempted_at ON mfa_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires_at ON trusted_devices(expires_at);

-- Function to check if MFA is enabled for user
CREATE OR REPLACE FUNCTION is_mfa_enabled(p_user_id INTEGER) RETURNS BOOLEAN AS $$
DECLARE
    mfa_status BOOLEAN;
BEGIN
    SELECT mfa_enabled INTO mfa_status
    FROM user_mfa
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(mfa_status, false);
END;
$$ LANGUAGE plpgsql;

-- Function to check if device is trusted
CREATE OR REPLACE FUNCTION is_device_trusted(
    p_user_id INTEGER,
    p_device_fingerprint VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    is_trusted BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM trusted_devices
        WHERE user_id = p_user_id
          AND device_fingerprint = p_device_fingerprint
          AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO is_trusted;
    
    RETURN is_trusted;
END;
$$ LANGUAGE plpgsql;

-- Function to generate backup codes (returns 10 codes)
CREATE OR REPLACE FUNCTION generate_backup_codes() RETURNS TEXT[] AS $$
DECLARE
    codes TEXT[] := '{}';
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        codes := array_append(codes, 
            upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
        );
    END LOOP;
    
    RETURN codes;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mfa_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_mfa_update_timestamp
    BEFORE UPDATE ON user_mfa
    FOR EACH ROW
    EXECUTE FUNCTION update_mfa_timestamp();

-- Clean up old MFA attempts (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_mfa_attempts() RETURNS void AS $$
BEGIN
    DELETE FROM mfa_attempts
    WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_mfa IS 'MFA settings and secrets for each user';
COMMENT ON TABLE mfa_attempts IS 'Log of MFA verification attempts for security monitoring';
COMMENT ON TABLE mfa_backup_usage IS 'Track which backup codes have been used';
COMMENT ON TABLE trusted_devices IS 'Remember trusted devices to skip MFA';

