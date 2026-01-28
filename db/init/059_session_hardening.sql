-- Session Hardening - Add metadata for session binding and rotation
-- Part of security upgrade for cookie-only auth + CSRF

-- Add columns for session binding (detect session hijacking)
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS user_agent_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),  -- Supports IPv6
ADD COLUMN IF NOT EXISTS ip_prefix VARCHAR(39),   -- First 3 octets of IPv4 or /48 for IPv6
ADD COLUMN IF NOT EXISTS rotated_from VARCHAR(64),  -- For audit: previous session ID
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add idle timeout column (tracks when session should expire from inactivity)
-- Different from expires_at which is absolute lifetime
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS idle_timeout_at TIMESTAMP;

-- Index for metadata queries (for audit/security events)
CREATE INDEX IF NOT EXISTS idx_sessions_metadata ON user_sessions USING GIN (metadata);

-- Index for IP prefix (for detecting suspicious patterns)
CREATE INDEX IF NOT EXISTS idx_sessions_ip_prefix ON user_sessions(ip_prefix);

-- Function to extract IP prefix (first 3 octets for IPv4, /48 for IPv6)
CREATE OR REPLACE FUNCTION get_ip_prefix(ip VARCHAR(45))
RETURNS VARCHAR(39) AS $$
BEGIN
    IF ip IS NULL OR ip = '' THEN
        RETURN NULL;
    END IF;
    
    -- IPv4 handling
    IF ip ~ '^(\d{1,3}\.){3}\d{1,3}$' THEN
        -- Return first 3 octets
        RETURN regexp_replace(ip, '\.\d{1,3}$', '');
    END IF;
    
    -- IPv6 handling - return first 3 groups (48 bits)
    IF ip ~ ':' THEN
        RETURN split_part(ip, ':', 1) || ':' || 
               split_part(ip, ':', 2) || ':' || 
               split_part(ip, ':', 3);
    END IF;
    
    RETURN ip;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update cleanup function to also clean up sessions with idle timeout
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
       OR (idle_timeout_at IS NOT NULL AND idle_timeout_at < CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN user_sessions.user_agent_hash IS 'SHA256 hash of User-Agent for session binding';
COMMENT ON COLUMN user_sessions.ip_address IS 'Client IP address at session creation';
COMMENT ON COLUMN user_sessions.ip_prefix IS 'IP prefix for approximate location tracking';
COMMENT ON COLUMN user_sessions.rotated_from IS 'Previous session ID if this was created via rotation';
COMMENT ON COLUMN user_sessions.metadata IS 'Additional session metadata (JSON)';
COMMENT ON COLUMN user_sessions.idle_timeout_at IS 'When session expires from inactivity (separate from absolute expiry)';
