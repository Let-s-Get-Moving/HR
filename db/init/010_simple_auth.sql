-- Simple Authentication System
-- Single admin user for the entire HR system

-- The users table is already created in 001_schema.sql with:
-- id, email, full_name, role, password_hash

-- Do NOT create users here - ensureAdminUser() handles it on server startup
-- DELETE FROM users;

-- Create a simple sessions table for maintaining logged-in state
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- Clean up expired sessions periodically
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO PUBLIC;

