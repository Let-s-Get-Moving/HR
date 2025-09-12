-- Secure user management schema
-- This replaces the simple in-memory user store with a proper database implementation

-- Create users table with security features
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'hr', 'user')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user sessions table for better session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON security_audit_log(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR (last_activity < CURRENT_TIMESTAMP - INTERVAL '7 days');
END;
$$ language 'plpgsql';

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login(p_username VARCHAR)
RETURNS void AS $$
DECLARE
    user_record users%ROWTYPE;
BEGIN
    SELECT * INTO user_record FROM users WHERE username = p_username;
    
    IF FOUND THEN
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
                ELSE locked_until
            END
        WHERE username = p_username;
    END IF;
END;
$$ language 'plpgsql';

-- Create function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_logins(p_user_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
END;
$$ language 'plpgsql';

-- Insert default admin user with hashed password
-- Password: 'password123' (hashed with bcrypt, salt rounds: 12)
-- First delete if exists, then insert
DELETE FROM users WHERE username = 'Avneet';
INSERT INTO users (username, email, full_name, password_hash, role, is_active) 
VALUES (
    'Avneet', 
    'admin@hrsystem.com',
    'Avneet Admin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/4Qz8K2K', -- password123
    'Admin', 
    true
);

-- Create view for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.id as session_id,
    s.user_id,
    u.username,
    s.created_at,
    s.expires_at,
    s.last_activity,
    s.ip_address,
    s.user_agent
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true 
AND s.expires_at > CURRENT_TIMESTAMP;

-- Create view for user security status
CREATE OR REPLACE VIEW user_security_status AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    u.is_active,
    u.last_login,
    u.failed_login_attempts,
    u.locked_until,
    CASE 
        WHEN u.locked_until > CURRENT_TIMESTAMP THEN 'locked'
        WHEN u.failed_login_attempts >= 3 THEN 'suspicious'
        WHEN u.last_login < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'inactive'
        ELSE 'normal'
    END as security_status
FROM users u;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO PUBLIC;
GRANT SELECT, INSERT ON security_audit_log TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE security_audit_log_id_seq TO PUBLIC;
