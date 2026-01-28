-- CSRF Tokens table - stores hashed tokens in DB instead of memory
-- This allows multi-instance deployment and survives API restarts

CREATE TABLE IF NOT EXISTS csrf_tokens (
    session_id VARCHAR(255) PRIMARY KEY,
    token_hash VARCHAR(128) NOT NULL,  -- SHA-256 hash of the actual token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP WITH TIME ZONE
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);

-- Function to clean expired CSRF tokens
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM csrf_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup with session cleanup (runs when cleanup_expired_sessions is called)
-- Update the existing cleanup function to also clean CSRF tokens
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Clean expired user sessions
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() 
       OR (idle_timeout_at IS NOT NULL AND idle_timeout_at < NOW());
    
    -- Clean expired CSRF tokens
    DELETE FROM csrf_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT;
